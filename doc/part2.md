# Part 2
本パートでは以下の内容を取り扱います。
- Aurora クラスターのサーバーレス化

## 1. Aurora ServerlessV2 への移行
`lib/construct/datastore.ts` を編集していきます。

```
const cluster = new rds.DatabaseCluster(this, "AuroraCluster", {

  --------- Aurora PostgreSQL のバージョンを修正 ---------
  // for Aurora PostgreSQL
  engine: rds.DatabaseClusterEngine.auroraPostgres({
    version: rds.AuroraPostgresEngineVersion.VER_11_9,
  }),
  -----------------------------------------------------

  // for Aurora MySQL
  // engine: rds.DatabaseClusterEngine.auroraMysql({
  //   version: rds.AuroraMysqlEngineVersion.VER_2_09_1
  // }),
  credentials: rds.Credentials.fromGeneratedSecret("dbadmin"),

  --------- instanceProps は現在非推奨 ---------
  instanceProps: {
    instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MEDIUM),
    vpcSubnets: {
      subnetType: SubnetType.PRIVATE_ISOLATED,
    },
    vpc: props.vpc,
    enablePerformanceInsights: true,
    performanceInsightEncryptionKey: props.cmk,
    performanceInsightRetention: rds.PerformanceInsightRetention.DEFAULT, // 7 days
  },
  --------------------------------------------

  removalPolicy: RemovalPolicy.SNAPSHOT,
  defaultDatabaseName: "mydb",
  storageEncrypted: true,
  storageEncryptionKey: props.cmk,
  //      cloudwatchLogsExports: ['error', 'general', 'slowquery', 'audit'],  // For Aurora MySQL
  cloudwatchLogsExports: ["postgresql"], // For Aurora PostgreSQL
  cloudwatchLogsRetention: logs.RetentionDays.THREE_MONTHS,
  instanceIdentifierBase: id,
});
```

### 1.1 PostgreSQL のバージョン修正
Aurora PostgreSQL ServerlessV2 が対応している最新の PostgreSQL バージョンを利用します。
[公式ドキュメント](https://docs.aws.amazon.com/ja_jp/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.requirements.html#aurora-serverless-v2-Availability)を参照して、CLI コマンドを実行します。
```
aws rds describe-orderable-db-instance-options \
  --engine aurora-postgresql \
  --db-instance-class db.serverless \
  --region ap-northeast-1 --query 'OrderableDBInstanceOptions[].[EngineVersion]' \
  --output text
```

実行結果
```
$ aws rds describe-orderable-db-instance-options \
>   --engine aurora-postgresql \
>   --db-instance-class db.serverless \
>   --region ap-northeast-1 --query 'OrderableDBInstanceOptions[].[EngineVersion]' \
>   --output text
13.7
13.8
13.9
...
15.3
15.4
15.4
```

もしくは、[CDK API Reference](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_rds.PostgresEngineVersion.html) を参考に対応バージョンを確認します。

利用可能な最新バージョンの 15.4 を使用したいのですが、インストールされている CDK パッケージのバージョンでは対応していないようなので、15.3 を利用します。
```
engine: rds.DatabaseClusterEngine.auroraPostgres({
  version: rds.AuroraPostgresEngineVersion.VER_15_3,
}),
```

### 1.2 ServerlessV2 への修正
[CDK API Reference](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_rds.DatabaseCluster.html) を参照しながら、プロビジョンされたインスタンスからサーバーレスへ修正します。

※ `instanceProps` の非推奨について（[参照](https://dev.classmethod.jp/articles/aws-cdk-aurora-serverless-v2/)）

修正箇所
```
instanceProps: {
  instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MEDIUM),
  vpcSubnets: {
    subnetType: SubnetType.PRIVATE_ISOLATED,
  },
  vpc: props.vpc,
  enablePerformanceInsights: true,
  performanceInsightEncryptionKey: props.cmk,
  performanceInsightRetention: rds.PerformanceInsightRetention.DEFAULT, // 7 days
},
```

VPC 関連の設定を `instanceProps` の外に書き出します。
```
vpc: props.vpc,
vpcSubnets: {
  subnetType: SubnetType.PRIVATE_ISOLATED,
},
```

書き込み用インスタンスの設定を行います（引数の[参照](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_rds.ServerlessV2ClusterInstanceProps.html)）。
```
writer: rds.ClusterInstance.serverlessV2("writer", {
  enablePerformanceInsights: true,
  performanceInsightEncryptionKey: props.cmk,
  performanceInsightRetention: rds.PerformanceInsightRetention.DEFAULT,
}),
```

同様にリードレプリカインスタンスの設定を行います。
```
readers: [
  rds.ClusterInstance.serverlessV2("reader1", {
    enablePerformanceInsights: true,
    performanceInsightEncryptionKey: props.cmk,
    performanceInsightRetention: rds.PerformanceInsightRetention.DEFAULT,
  }),
],
```

修正後の DB クラスターの定義は以下の通りです。
```
const cluster = new rds.DatabaseCluster(this, "AuroraCluster", {
  // for Aurora PostgreSQL
  engine: rds.DatabaseClusterEngine.auroraPostgres({
    version: rds.AuroraPostgresEngineVersion.VER_15_3,
  }),
  // for Aurora MySQL
  // engine: rds.DatabaseClusterEngine.auroraMysql({
  //   version: rds.AuroraMysqlEngineVersion.VER_2_09_1
  // }),
  credentials: rds.Credentials.fromGeneratedSecret("dbadmin"),
  vpc: props.vpc,
  vpcSubnets: {
    subnetType: SubnetType.PRIVATE_ISOLATED,
  },
  writer: rds.ClusterInstance.serverlessV2("writer", {
    enablePerformanceInsights: true,
    performanceInsightEncryptionKey: props.cmk,
    performanceInsightRetention: rds.PerformanceInsightRetention.DEFAULT,
  }),
  readers: [
    rds.ClusterInstance.serverlessV2("reader1", {
      enablePerformanceInsights: true,
      performanceInsightEncryptionKey: props.cmk,
      performanceInsightRetention: rds.PerformanceInsightRetention.DEFAULT,
    }),
  ],
  removalPolicy: RemovalPolicy.SNAPSHOT,
  defaultDatabaseName: "mydb",
  storageEncrypted: true,
  storageEncryptionKey: props.cmk,
  //      cloudwatchLogsExports: ['error', 'general', 'slowquery', 'audit'],  // For Aurora MySQL
  cloudwatchLogsExports: ["postgresql"], // For Aurora PostgreSQL
  cloudwatchLogsRetention: logs.RetentionDays.THREE_MONTHS,
  instanceIdentifierBase: id,
});
```

変更を確認の上、デプロイします。
```
npx cdk diff
npx cdk deploy Dev-BLEAEcsApp
```

Aurora クラスターを無事にサーバーレス化することができました。
