import { describe, it, expect } from 'vitest';
import { errorsExtendAgError } from '../../../src/frontend/rules/errorsExtendAgError.js';

const FIXTURE_ROOT = 'tests/fixtures/project/src';
const baseConfig = { root: FIXTURE_ROOT, mode: 'enforce' as const, rules: {} };

describe('errorsExtendAgError', () => {
  it('returns no violations when root error class imports from ag-error', async () => {
    const violations = await errorsExtendAgError(baseConfig, {});
    expect(violations).toEqual([]);
  });

  it('returns empty when errors/ directory does not exist', async () => {
    const config = { ...baseConfig, root: 'tests/fixtures/project/src/hooks' };
    const violations = await errorsExtendAgError(config, {});
    expect(violations).toEqual([]);
  });
});
