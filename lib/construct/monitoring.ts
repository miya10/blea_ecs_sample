import { aws_iam as iam, aws_sns as sns, PhysicalName } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface MonitoringProps {
  monitoringNotifyEmail: string;
}

export class Monitoring extends Construct {
  public readonly alarmTopic: sns.Topic;

  constructor(scope: Construct, id: string, props: MonitoringProps) {
    super(scope, id);

    // SNS Topic for Monitoring Alarm
    const topic = new sns.Topic(this, 'AlarmTopic', {
      topicName: PhysicalName.GENERATE_IF_NEEDED, // for crossRegionReference
    });

    new sns.Subscription(this, 'EmailSubsc', {
      endpoint: props.monitoringNotifyEmail,
      protocol: sns.SubscriptionProtocol.EMAIL,
      topic: topic,
    });
    this.alarmTopic = topic;

    // Allow to publish message from CloudWatch
    topic.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal('cloudwatch.amazonaws.com')],
        actions: ['sns:Publish'],
        resources: [topic.topicArn],
      }),
    );
  }
}
