import { describe, it, expect } from 'vitest';
import { requireFeaturePublicEntry } from '../../../src/frontend/rules/requireFeaturePublicEntry.js';

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
