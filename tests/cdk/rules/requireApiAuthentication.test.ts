import { describe, it, expect } from 'vitest';
import { requireApiAuthentication } from '../../../src/cdk/rules/requireApiAuthentication.js';

const CONFORMANT = 'tests/fixtures/cdk-rules/conformant';
const VIOLATIONS = 'tests/fixtures/cdk-rules/infra-violations';
const base = { mode: 'enforce' as const, rules: {} };

describe('requireApiAuthentication', () => {
  it('returns no violations for a conformant project', async () => {
    const violations = await requireApiAuthentication({ ...base, root: CONFORMANT }, {});
    expect(violations).toHaveLength(0);
  });

  it('reports a violation when no auth pattern is present', async () => {
    const violations = await requireApiAuthentication({ ...base, root: VIOLATIONS }, {});
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toMatch(/authentication/);
  });

  it('returns no violations when infra/ is absent', async () => {
    const violations = await requireApiAuthentication({ ...base, root: 'tests/fixtures/cdk-rules/lambda-violations' }, {});
    expect(violations).toHaveLength(0);
  });
});
