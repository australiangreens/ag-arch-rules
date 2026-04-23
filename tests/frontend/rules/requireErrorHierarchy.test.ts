import { describe, it, expect } from 'vitest';
import { requireErrorHierarchy } from '../../../src/frontend/rules/requireErrorHierarchy.js';

const FIXTURE_ROOT = 'tests/fixtures/project/src';
const baseConfig = { root: FIXTURE_ROOT, mode: 'enforce' as const, rules: {} };

describe('requireErrorHierarchy', () => {
  it('returns no violations when all non-root error files import from errors/', async () => {
    const violations = await requireErrorHierarchy(baseConfig, {});
    expect(violations).toEqual([]);
  });

  it('returns empty when errors/ directory does not exist', async () => {
    const config = { ...baseConfig, root: 'tests/fixtures/project/src/hooks' };
    const violations = await requireErrorHierarchy(config, {});
    expect(violations).toEqual([]);
  });

  it('throws when no root error class can be auto-detected', async () => {
    const config = { ...baseConfig, root: 'tests/fixtures/bad-errors/src' };
    await expect(requireErrorHierarchy(config, {})).rejects.toThrow(
      'require-error-hierarchy: auto-detection found 0 root error class candidates'
    );
  });
});
