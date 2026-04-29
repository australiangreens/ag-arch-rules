import { describe, it, expect } from 'vitest';
import { requireEsbuildSourceMaps } from '../../../src/cdk/rules/requireEsbuildSourceMaps.js';

const CONFORMANT = 'tests/fixtures/cdk-rules/conformant';
const VIOLATIONS = 'tests/fixtures/cdk-rules/infra-violations';
const base = { mode: 'enforce' as const, rules: {} };

describe('requireEsbuildSourceMaps', () => {
  it('returns no violations for a conformant project', async () => {
    const violations = await requireEsbuildSourceMaps({ ...base, root: CONFORMANT }, {});
    expect(violations).toHaveLength(0);
  });

  it('reports a violation when sourceMap is absent from the construct', async () => {
    const violations = await requireEsbuildSourceMaps({ ...base, root: VIOLATIONS }, {});
    expect(violations.some(v => v.file.includes('constructs/MyFn.ts'))).toBe(true);
    expect(violations[0].message).toMatch(/sourceMap/);
  });

  it('returns no violations when infra/constructs/ is absent', async () => {
    const violations = await requireEsbuildSourceMaps({ ...base, root: 'tests/fixtures/cdk-rules/no-constructs' }, {});
    expect(violations).toHaveLength(0);
  });

  it('respects except globs', async () => {
    const violations = await requireEsbuildSourceMaps({ ...base, root: VIOLATIONS }, {
      except: ['tests/fixtures/cdk-rules/infra-violations/infra/constructs/MyFn.ts'],
    });
    expect(violations).toHaveLength(0);
  });
});
