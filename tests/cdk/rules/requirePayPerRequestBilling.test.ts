import { describe, it, expect } from 'vitest';
import { requirePayPerRequestBilling } from '../../../src/cdk/rules/requirePayPerRequestBilling.js';

const CONFORMANT = 'tests/fixtures/cdk-rules/conformant';
const VIOLATIONS = 'tests/fixtures/cdk-rules/infra-violations';
const base = { mode: 'enforce' as const, rules: {} };

describe('requirePayPerRequestBilling', () => {
  it('returns no violations for a conformant project', async () => {
    const violations = await requirePayPerRequestBilling({ ...base, root: CONFORMANT }, {});
    expect(violations).toHaveLength(0);
  });

  it('reports a violation when a table uses PROVISIONED billing', async () => {
    const violations = await requirePayPerRequestBilling({ ...base, root: VIOLATIONS }, {});
    expect(violations.some(v => v.file.includes('dynamoDb.ts'))).toBe(true);
    expect(violations[0].message).toMatch(/PAY_PER_REQUEST/);
  });

  it('returns no violations when infra/ is absent', async () => {
    const violations = await requirePayPerRequestBilling({ ...base, root: 'tests/fixtures/cdk-rules/lambda-violations' }, {});
    expect(violations).toHaveLength(0);
  });

  it('respects except globs', async () => {
    const violations = await requirePayPerRequestBilling({ ...base, root: VIOLATIONS }, {
      except: ['tests/fixtures/cdk-rules/infra-violations/infra/dynamoDb.ts'],
    });
    expect(violations).toHaveLength(0);
  });
});
