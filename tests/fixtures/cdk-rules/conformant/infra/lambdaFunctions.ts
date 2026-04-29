import { AgNodejsFunction } from './constructs/AgNodejsFunction';

export function createLambdas(scope: any) {
  return new AgNodejsFunction(scope, 'MyFunction', {
    environment: {
      MY_SECRET: process.env.MY_SECRET ?? '',
      MY_API_KEY: process.env.MY_API_KEY ?? '',
    },
  });
}
