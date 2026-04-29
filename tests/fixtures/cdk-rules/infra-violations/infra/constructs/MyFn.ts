import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';

export class MyFn extends NodejsFunction {
  constructor(scope: any, id: string, props: any) {
    super(scope, id, {
      runtime: Runtime.NODEJS_20_X,
      bundling: {
        target: 'es2020',
      },
      ...props,
    });
  }
}
