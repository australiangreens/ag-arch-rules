import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

export function importSecrets(scope: any, secretName: string) {
  const secret = secretsmanager.Secret.fromSecretNameV2(scope, 'AppSecret', secretName);
  // No grantRead call
}
