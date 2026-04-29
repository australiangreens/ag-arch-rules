import { describe, it, expect } from 'vitest';
import { noHardcodedSecretValues } from '../../../src/cdk/rules/noHardcodedSecretValues.js';

const CONFORMANT = 'tests/fixtures/cdk-rules/conformant';
const VIOLATIONS = 'tests/fixtures/cdk-rules/infra-violations';
const base = { mode: 'enforce' as const, rules: {} };

describe('noHardcodedSecretValues', () => {
  it('returns no violations for a conformant project', async () => {
    const violations = await noHardcodedSecretValues({ ...base, root: CONFORMANT }, {});
    expect(violations).toHaveLength(0);
  });

  it('reports violations for hardcoded MY_SECRET and MY_API_KEY values', async () => {
    const violations = await noHardcodedSecretValues({ ...base, root: VIOLATIONS }, {});
    expect(violations.some(v => v.file.includes('lambdaFunctions.ts'))).toBe(true);
    expect(violations.some(v => v.message.includes('MY_SECRET'))).toBe(true);
    expect(violations.some(v => v.message.includes('MY_API_KEY'))).toBe(true);
  });

  it('respects except globs', async () => {
    const violations = await noHardcodedSecretValues({ ...base, root: VIOLATIONS }, {
      except: ['tests/fixtures/cdk-rules/infra-violations/infra/lambdaFunctions.ts'],
    });
    expect(violations).toHaveLength(0);
  });
});
