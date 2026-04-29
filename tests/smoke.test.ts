/**
 * Smoke test: calls runArchRules with the fixture project so that
 * the afterAll hook writes JSON output when ARCH_JSON_OUTPUT is set.
 * All rules are set to 'warn' so the test suite always passes
 * regardless of fixture violations.
 */
import { runArchRules } from '../src/runArchRules.js';

runArchRules({
  root: 'tests/fixtures/project/src',
  mode: 'report',
  rules: {
    'require-path-alias':             'warn',
    'max-file-lines':                 'warn',
    'no-apis-depend-on-components':   'warn',
    'no-circular-dependencies':       'warn',
    'require-barrel-exports':         'warn',
    'require-hook-prefix':            'warn',
    'require-test-type-suffix':       'warn',
  },
});
