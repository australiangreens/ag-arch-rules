import { describe, it, expect } from 'vitest';
import { requireBinDirectory } from '../../../src/cdk/rules/requireBinDirectory.js';

const CONFORMANT = 'tests/fixtures/cdk-rules/conformant';
const VIOLATIONS = 'tests/fixtures/cdk-rules/infra-violations';
const base = { mode: 'enforce' as const, rules: {} };

describe('requireBinDirectory', () => {
  it('returns no violations for a conformant project', async () => {
    const violations = await requireBinDirectory({ ...base, root: CONFORMANT }, {});
    expect(violations).toHaveLength(0);
  });

  it('reports a violation when bin/ is missing', async () => {
    const violations = await requireBinDirectory({ ...base, root: VIOLATIONS }, {});
    expect(violations).toHaveLength(1);
    expect(violations[0].file).toBe('bin');
  });
});
