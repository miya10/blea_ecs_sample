import { Environment } from "aws-cdk-lib";

// Parameters for Application
export interface AppParameter {
  env?: Environment;
  envName: string;
  monitoringNotifyEmail: string;
  vpcCidr: string;
  dashboardName: string;

  // -- Sample to use custom domain on CloudFront
  // hostedZoneId: string;
  // domainName: string;
  // cloudFrontHostName: string;
}

// Parameters for Dev Account
export const devParameter: AppParameter = {
  env: {
    // account: '111111111111',
    region: "ap-northeast-1",
  },
  envName: "Development",
  monitoringNotifyEmail: "notify-security@example.com",
  vpcCidr: "10.100.0.0/16",
  dashboardName: "BLEA-ECS-App-Sample",

  // -- Sample to use custom domain on CloudFront
  // hostedZoneId: 'Z00000000000000000000',
  // domainName: 'example.com',
  // cloudFrontHostName: 'www',
};
