import { describe, it, expect } from 'vitest';
import { noConstantsOnRuntime } from '../../../src/common/rules/noConstantsOnRuntime.js';

const SLICES_FIXTURE_ROOT = 'tests/fixtures/frontend-slices/src';

describe('noConstantsOnRuntime — sliceDirs', () => {
  it('without sliceDirs, a runtime layer that only exists inside a slice is not checked', async () => {
    const config = { root: SLICES_FIXTURE_ROOT, mode: 'enforce' as const, rules: {} };
    const violations = await noConstantsOnRuntime(config, {});
    expect(violations).toEqual([]);
  });

  it('with sliceDirs, constants importing from a slice-only runtime layer are caught', async () => {
    const config = {
      root: SLICES_FIXTURE_ROOT,
      mode: 'enforce' as const,
      rules: {},
      sliceDirs: ['features'],
    };
    const violations = await noConstantsOnRuntime(config, {});
    expect(violations.some(v => v.file.includes('features/alpha/constants/BadConstants'))).toBe(true);
  });
});
