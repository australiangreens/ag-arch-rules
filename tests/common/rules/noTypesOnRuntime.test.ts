import { describe, it, expect } from 'vitest';
import { noTypesOnRuntime } from '../../../src/common/rules/noTypesOnRuntime.js';

const SLICES_FIXTURE_ROOT = 'tests/fixtures/frontend-slices/src';

describe('noTypesOnRuntime — sliceDirs', () => {
  it('without sliceDirs, a runtime layer that only exists inside a slice is not checked', async () => {
    const config = { root: SLICES_FIXTURE_ROOT, mode: 'enforce' as const, rules: {} };
    const violations = await noTypesOnRuntime(config, {});
    expect(violations).toEqual([]);
  });

  it('with sliceDirs, types importing from a slice-only runtime layer are caught', async () => {
    const config = {
      root: SLICES_FIXTURE_ROOT,
      mode: 'enforce' as const,
      rules: {},
      sliceDirs: ['features'],
    };
    const violations = await noTypesOnRuntime(config, {});
    expect(violations.some(v => v.file.includes('features/alpha/types/BadType'))).toBe(true);
  });
});
