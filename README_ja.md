# Web アプリケーションサンプルアーキテクチャ図

## Web アプリケーションサンプル (ECS+SSL)

![ECS-and-SSL](./doc/images/BLEA-GuestSampleWebECS.png)

- bin/blea-guest-ecs-app-sample.ts
  - ECS/Fargate+AuroraPostgreSQL を使ったサンプルシステム
  - 独自ドメインによる SSL 証明書対応
