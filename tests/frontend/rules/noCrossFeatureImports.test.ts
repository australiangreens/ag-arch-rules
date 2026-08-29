import { describe, it, expect } from 'vitest';
import { noCrossFeatureImports } from '../../../src/frontend/rules/noCrossFeatureImports.js';

const FIXTURE_ROOT = 'tests/fixtures/frontend-slices/src';

describe('noCrossFeatureImports', () => {
  it('flags a cross-feature import when no sliceDirs/sliceDir is configured (falls back to "features")', async () => {
    const config = { root: FIXTURE_ROOT, mode: 'enforce' as const, rules: {} };
    const violations = await noCrossFeatureImports(config, {});
    expect(violations.some(v => v.file.includes('features/beta/components/DeepImporter'))).toBe(true);
  });

  it('defaults sliceDir from config.sliceDirs when set', async () => {
    const config = {
      root: FIXTURE_ROOT,
      mode: 'enforce' as const,
      rules: {},
      sliceDirs: ['features'],
    };
    const violations = await noCrossFeatureImports(config, {});
    expect(violations.some(v => v.file.includes('features/beta/components/DeepImporter'))).toBe(true);
  });

  it('does not flag intra-feature imports', async () => {
    const config = { root: FIXTURE_ROOT, mode: 'enforce' as const, rules: {} };
    const violations = await noCrossFeatureImports(config, {});
    expect(violations.every(v => !v.file.includes('features/alpha/index.ts'))).toBe(true);
  });

  it('respects allowTargetGlobs exceptions', async () => {
    const config = { root: FIXTURE_ROOT, mode: 'enforce' as const, rules: {} };
    const violations = await noCrossFeatureImports(config, {
      allowTargetGlobs: [`${FIXTURE_ROOT}/features/alpha/**`],
    });
    expect(violations.every(v => !v.file.includes('features/beta/components/DeepImporter'))).toBe(true);
  });

  it('honours an explicit sliceDir override', async () => {
    const config = { root: FIXTURE_ROOT, mode: 'enforce' as const, rules: {} };
    const violations = await noCrossFeatureImports(config, { sliceDir: 'does-not-exist' });
    expect(violations).toEqual([]);
  });
});
