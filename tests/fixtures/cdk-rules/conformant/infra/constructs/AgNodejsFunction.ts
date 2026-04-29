import { NodejsFunction, NodejsFunctionProps } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export class AgNodejsFunction extends NodejsFunction {
  constructor(scope: Construct, id: string, props?: NodejsFunctionProps) {
    super(scope, id, {
      runtime: Runtime.NODEJS_22_X,
      bundling: {
        sourceMap: true,
        target: 'es2020',
      },
      ...props,
    });
  }
}
