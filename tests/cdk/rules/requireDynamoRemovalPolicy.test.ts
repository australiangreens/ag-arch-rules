import { describe, it, expect } from 'vitest';
import { requireDynamoRemovalPolicy } from '../../../src/cdk/rules/requireDynamoRemovalPolicy.js';

const CONFORMANT = 'tests/fixtures/cdk-rules/conformant';
const VIOLATIONS = 'tests/fixtures/cdk-rules/infra-violations';
const base = { mode: 'enforce' as const, rules: {} };

describe('requireDynamoRemovalPolicy', () => {
  it('returns no violations for a conformant project', async () => {
    const violations = await requireDynamoRemovalPolicy({ ...base, root: CONFORMANT }, {});
    expect(violations).toHaveLength(0);
  });

  it('reports a violation when only RETAIN is present (no conditional DESTROY)', async () => {
    const violations = await requireDynamoRemovalPolicy({ ...base, root: VIOLATIONS }, {});
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toMatch(/DESTROY/);
  });

  it('returns no violations when no DynamoDB tables are defined', async () => {
    const violations = await requireDynamoRemovalPolicy({ ...base, root: 'tests/fixtures/cdk-rules/no-constructs' }, {});
    expect(violations).toHaveLength(0);
  });
});
