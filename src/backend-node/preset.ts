import type { RulesConfig } from '../types.js';

export const agBackendNodePreset = {
  rules: {
    'no-circular-dependencies':              'error',
    'no-types-depend-on-runtime-layers':     'error',
    'no-constants-depend-on-runtime-layers': 'error',
    'require-barrel-exports':                ['error', { directories: ['endpoints', 'models/db'] }],
    'require-error-hierarchy':               'error',
    'errors-extend-ag-error':                'error',
    'require-test-type-suffix':              'warn',
    'max-file-lines':                        ['warn', { ts: 500 }],
    'no-endpoints-depend-on-endpoints':      'error',
    'no-models-depend-on-endpoints':         'error',
    'no-middleware-depends-on-models':       'warn',
    'require-validation-schema':             'error',
    'no-direct-db-client-in-endpoints':      'error',
  } satisfies RulesConfig,
} as const;
