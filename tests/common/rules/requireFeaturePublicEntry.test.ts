import { describe, it, expect } from 'vitest';
import { requireFeaturePublicEntry } from '../../../src/common/rules/requireFeaturePublicEntry.js';

const FIXTURE_ROOT = 'tests/fixtures/frontend-slices/src';

describe('requireFeaturePublicEntry', () => {
  it('flags a deep import from outside features/ entirely', async () => {
    const config = { root: FIXTURE_ROOT, mode: 'enforce' as const, rules: {} };
    const violations = await requireFeaturePublicEntry(config, {});
    expect(violations.some(v => v.file.includes('pages/HostPage'))).toBe(true);
  });

  it('does not flag an import through the public entry (.js specifier, NodeNext convention)', async () => {
    const config = { root: FIXTURE_ROOT, mode: 'enforce' as const, rules: {} };
    const violations = await requireFeaturePublicEntry(config, {});
    expect(violations.every(v => !v.file.includes('components/UsesAlphaEntry'))).toBe(true);
  });

  it('also flags a cross-feature deep import (complementary to no-cross-feature-imports)', async () => {
    const config = { root: FIXTURE_ROOT, mode: 'enforce' as const, rules: {} };
    const violations = await requireFeaturePublicEntry(config, {});
    expect(violations.some(v => v.file.includes('features/beta/components/DeepImporter'))).toBe(true);
  });

  it('does not flag a feature importing its own internals', async () => {
    const config = { root: FIXTURE_ROOT, mode: 'enforce' as const, rules: {} };
    const violations = await requireFeaturePublicEntry(config, {});
    expect(violations.every(v => !v.file.includes('features/alpha/index'))).toBe(true);
  });

  it('falls back to ["features"] when neither options.sliceDirs nor config.sliceDirs is set', async () => {
    const config = { root: FIXTURE_ROOT, mode: 'enforce' as const, rules: {} };
    const violations = await requireFeaturePublicEntry(config, {});
    expect(violations.length).toBeGreaterThan(0);
  });

  it('respects an explicit entryFiles option', async () => {
    const config = { root: FIXTURE_ROOT, mode: 'enforce' as const, rules: {} };
    const violations = await requireFeaturePublicEntry(config, { entryFiles: ['nonexistent.ts'] });
    // with a stricter entryFiles list, the legitimate public-entry import now violates too
    expect(violations.some(v => v.file.includes('components/UsesAlphaEntry'))).toBe(true);
  });

  it('respects except patterns', async () => {
    const config = { root: FIXTURE_ROOT, mode: 'enforce' as const, rules: {} };
    const violations = await requireFeaturePublicEntry(config, {
      except: [`${FIXTURE_ROOT}/pages/HostPage.tsx`],
    });
    expect(violations.every(v => !v.file.includes('pages/HostPage'))).toBe(true);
  });
});

describe('requireFeaturePublicEntry — backend (endpoints/ as sliceDir)', () => {
  const BACKEND_FIXTURE_ROOT = 'tests/fixtures/backend-rules/src';
  const backendConfig = {
    root: BACKEND_FIXTURE_ROOT,
    tsConfigPath: 'tests/fixtures/backend-rules/tsconfig.json',
    mode: 'enforce' as const,
    rules: {},
  };

  it('flags a deep import from outside endpoints/ into a feature', async () => {
    const violations = await requireFeaturePublicEntry(backendConfig, {
      sliceDirs: ['endpoints'],
    });
    expect(violations.some(v => v.file.includes('lib/deepImporter'))).toBe(true);
  });

  it('does not flag one feature importing another through its entry file', async () => {
    const violations = await requireFeaturePublicEntry(backendConfig, {
      sliceDirs: ['endpoints'],
    });
    expect(violations.every(v => !v.file.includes('endpoints/feature-a/index'))).toBe(true);
  });

  it('returns no violations without sliceDirs configured (no top-level "features/" dir on the backend fixture)', async () => {
    const violations = await requireFeaturePublicEntry(backendConfig, {});
    expect(violations).toEqual([]);
  });
});
