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
