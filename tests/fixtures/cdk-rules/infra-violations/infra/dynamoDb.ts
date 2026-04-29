import { Table, BillingMode } from 'aws-cdk-lib/aws-dynamodb';
import { RemovalPolicy } from 'aws-cdk-lib';

export function createTable(scope: any) {
  return new Table(scope, 'MyTable', {
    billingMode: BillingMode.PROVISIONED,
    removalPolicy: RemovalPolicy.RETAIN,
  });
}
