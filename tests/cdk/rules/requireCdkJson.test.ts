import { describe, it, expect } from 'vitest';
import { requireCdkJson } from '../../../src/cdk/rules/requireCdkJson.js';

const CONFORMANT = 'tests/fixtures/cdk-rules/conformant';
const VIOLATIONS = 'tests/fixtures/cdk-rules/infra-violations';
const base = { mode: 'enforce' as const, rules: {} };

describe('requireCdkJson', () => {
  it('returns no violations for a conformant project', async () => {
    const violations = await requireCdkJson({ ...base, root: CONFORMANT }, {});
    expect(violations).toHaveLength(0);
  });

  it('reports a violation when cdk.json is missing', async () => {
    const violations = await requireCdkJson({ ...base, root: VIOLATIONS }, {});
    expect(violations).toHaveLength(1);
    expect(violations[0].file).toBe('cdk.json');
  });
});
