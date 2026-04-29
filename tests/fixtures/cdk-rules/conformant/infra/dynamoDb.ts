import { Table, BillingMode } from 'aws-cdk-lib/aws-dynamodb';
import { RemovalPolicy } from 'aws-cdk-lib';

const isProd = process.env.ENV === 'prod';

export function createTable(scope: any) {
  return new Table(scope, 'MyTable', {
    billingMode: BillingMode.PAY_PER_REQUEST,
    removalPolicy: isProd ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
  });
}
