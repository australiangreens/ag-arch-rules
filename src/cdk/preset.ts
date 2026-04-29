import type { RulesConfig } from '../types.js';

export const agCdkPreset = {
  rules: {
    // Tier 1 — infrastructure code
    'require-custom-nodejs-construct': 'error',
    'require-node-runtime-22':         'error',
    'require-esbuild-source-maps':     'error',
    'require-pay-per-request-billing': 'error',
    'require-dynamo-removal-policy':   'error',
    'no-hardcoded-secret-values':      'error',
    'require-secrets-manager-grants':  'error',
    'require-api-authentication':      'error',

    // Tier 2 — lambda handler code
    'no-lambda-imports-from-infra':    'warn',
    'require-lambda-handler-export':   'warn',

    // Tier 3 — project structure
    'require-cdk-json':                'warn',
    'require-bin-directory':           'warn',
    'require-infra-directory':         'warn',
    'require-env-local-example':       'warn',
  } satisfies RulesConfig,
} as const;
