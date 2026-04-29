import { describe, it, expect } from 'vitest';
import { requireInfraDirectory } from '../../../src/cdk/rules/requireInfraDirectory.js';

const CONFORMANT = 'tests/fixtures/cdk-rules/conformant';
const VIOLATIONS = 'tests/fixtures/cdk-rules/lambda-violations';
const base = { mode: 'enforce' as const, rules: {} };

describe('requireInfraDirectory', () => {
  it('returns no violations for a conformant project', async () => {
    const violations = await requireInfraDirectory({ ...base, root: CONFORMANT }, {});
    expect(violations).toHaveLength(0);
  });

  it('reports a violation when infra/ is missing', async () => {
    const violations = await requireInfraDirectory({ ...base, root: VIOLATIONS }, {});
    expect(violations).toHaveLength(1);
    expect(violations[0].file).toBe('infra');
  });
});
