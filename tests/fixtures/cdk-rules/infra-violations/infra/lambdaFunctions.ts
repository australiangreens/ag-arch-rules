import { MyFn } from './constructs/MyFn';

export function createLambdas(scope: any) {
  return new MyFn(scope, 'MyFunction', {
    environment: {
      MY_SECRET: 'actual-hardcoded-secret',
      MY_API_KEY: 'hardcoded-key-value',
    },
  });
}
