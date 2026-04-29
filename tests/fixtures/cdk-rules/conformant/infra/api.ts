import { UsagePlan } from 'aws-cdk-lib/aws-apigateway';

export function createApi(scope: any) {
  const plan = new UsagePlan(scope, 'UsagePlan', {
    throttle: { rateLimit: 100, burstLimit: 200 },
  });
  return plan;
}
