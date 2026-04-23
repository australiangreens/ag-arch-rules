import type { RulesConfig } from '../types.js';

export const agFrontendPreset = {
  rules: {
    'no-apis-depend-on-components':          'error',
    'no-apis-depend-on-pages':               'error',
    'no-components-depend-on-pages':         'error',
    'no-hooks-depend-on-pages':              'error',
    'no-types-depend-on-runtime-layers':     'error',
    'no-constants-depend-on-runtime-layers': 'error',
    'no-circular-dependencies':              'error',
    'require-barrel-exports':                'warn',
    'require-path-alias':                    'warn',
    'require-error-hierarchy':               'error',
    'errors-extend-ag-error':                'error',
    'require-test-type-suffix':              'warn',
    'require-hook-prefix':                   'warn',
    'max-file-lines':                        ['warn', { tsx: 400, ts: 300 }],
  } satisfies RulesConfig,
} as const;
