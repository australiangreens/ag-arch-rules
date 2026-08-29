import { describe, it, expect } from 'vitest';
import { checkLayerDependency } from '../../../src/common/utils/layerDependency.js';

const FIXTURE_ROOT = 'tests/fixtures/project/src';
const baseConfig = { root: FIXTURE_ROOT, mode: 'enforce' as const, rules: {} };

describe('checkLayerDependency', () => {
  it('returns no violations when no forbidden imports exist', async () => {
    const violations = await checkLayerDependency(baseConfig, 'apis', 'pages', {});
    expect(violations).toEqual([]);
  });

  it('detects a violation when apis imports from components', async () => {
    const violations = await checkLayerDependency(baseConfig, 'apis', 'components', {});
    expect(violations.length).toBeGreaterThan(0);
    const badApi = violations.find(v => v.file.includes('badApi'));
    expect(badApi).toBeDefined();
    expect(badApi!.message).toMatch(/components/);
  });

  it('Violation.file is CWD-relative', async () => {
    const violations = await checkLayerDependency(baseConfig, 'apis', 'components', {});
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].file.startsWith('tests/fixtures/project/src')).toBe(true);
    expect(violations[0].file).not.toMatch(/^[A-Z]:\\/); // not Windows absolute
    expect(violations[0].file).not.toMatch(/^\//);       // not POSIX absolute
  });

  it('respects except patterns (CWD-relative)', async () => {
    const violations = await checkLayerDependency(
      baseConfig,
      'apis',
      'components',
      { except: ['tests/fixtures/project/src/apis/**'] }
    );
    expect(violations).toEqual([]);
  });

  it('detects components importing from pages', async () => {
    const violations = await checkLayerDependency(baseConfig, 'components', 'pages', {});
    expect(violations.some(v => v.file.includes('PageDependent'))).toBe(true);
  });
});

describe('checkLayerDependency — sliceDirs', () => {
  const SLICES_FIXTURE_ROOT = 'tests/fixtures/frontend-slices/src';

  it('without sliceDirs, an intra-slice layer violation is silently missed', async () => {
    const config = { root: SLICES_FIXTURE_ROOT, mode: 'enforce' as const, rules: {} };
    const violations = await checkLayerDependency(config, 'apis', 'components', {});
    expect(violations).toEqual([]);
  });

  it('with sliceDirs, the same intra-slice layer violation is caught', async () => {
    const config = {
      root: SLICES_FIXTURE_ROOT,
      mode: 'enforce' as const,
      rules: {},
      sliceDirs: ['features'],
    };
    const violations = await checkLayerDependency(config, 'apis', 'components', {});
    expect(violations.some(v => v.file.includes('features/alpha/apis/client'))).toBe(true);
  });

  it('a slice with no matching layer contributes no violations (allowEmptyTests)', async () => {
    const config = {
      root: SLICES_FIXTURE_ROOT,
      mode: 'enforce' as const,
      rules: {},
      sliceDirs: ['features'],
    };
    // beta has no apis/ directory at all
    const violations = await checkLayerDependency(config, 'apis', 'components', {});
    expect(violations.every(v => !v.file.includes('features/beta'))).toBe(true);
  });
});
