import { describe, it, expect } from 'vitest';
import { requireEnvLocalExample } from '../../../src/cdk/rules/requireEnvLocalExample.js';

const CONFORMANT = 'tests/fixtures/cdk-rules/conformant';
const VIOLATIONS = 'tests/fixtures/cdk-rules/infra-violations';
const base = { mode: 'enforce' as const, rules: {} };

describe('requireEnvLocalExample', () => {
  it('returns no violations for a conformant project', async () => {
    const violations = await requireEnvLocalExample({ ...base, root: CONFORMANT }, {});
    expect(violations).toHaveLength(0);
  });

  it('reports a violation when .env.local.example is missing', async () => {
    const violations = await requireEnvLocalExample({ ...base, root: VIOLATIONS }, {});
    expect(violations).toHaveLength(1);
    expect(violations[0].file).toBe('.env.local.example');
  });
});
