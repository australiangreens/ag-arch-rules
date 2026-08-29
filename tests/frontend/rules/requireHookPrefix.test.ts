import { describe, it, expect } from 'vitest';
import { requireHookPrefix } from '../../../src/frontend/rules/requireHookPrefix.js';

const FIXTURE_ROOT = 'tests/fixtures/project/src';
const baseConfig = { root: FIXTURE_ROOT, mode: 'enforce' as const, rules: {} };

describe('requireHookPrefix', () => {
  it('detects hook files not prefixed with use', async () => {
    const violations = await requireHookPrefix(baseConfig, {});
    expect(violations.some(v => v.file.includes('badHook'))).toBe(true);
  });

  it('does not flag files correctly prefixed with use', async () => {
    const violations = await requireHookPrefix(baseConfig, {});
    expect(violations.every(v => !v.file.includes('useUser'))).toBe(true);
  });

  it('does not flag test files inside hooks/', async () => {
    const violations = await requireHookPrefix(baseConfig, {});
    expect(violations.every(v => !v.file.includes('.test.'))).toBe(true);
    expect(violations.every(v => !v.file.includes('.spec.'))).toBe(true);
  });

  it('Violation.file is CWD-relative', async () => {
    const violations = await requireHookPrefix(baseConfig, {});
    expect(violations.every(v => v.file.startsWith('tests/fixtures/'))).toBe(true);
    expect(violations.every(v => !v.file.startsWith('/'))).toBe(true);
  });

  it('respects except patterns', async () => {
    const violations = await requireHookPrefix(baseConfig, {
      except: ['tests/fixtures/project/src/hooks/badHook.ts'],
    });
    expect(violations.every(v => !v.file.includes('badHook'))).toBe(true);
  });
});

describe('requireHookPrefix — sliceDirs', () => {
  const SLICES_FIXTURE_ROOT = 'tests/fixtures/frontend-slices/src';

  it('without sliceDirs, a hooks/ dir nested in a slice is not checked', async () => {
    const config = { root: SLICES_FIXTURE_ROOT, mode: 'enforce' as const, rules: {} };
    const violations = await requireHookPrefix(config, {});
    expect(violations).toEqual([]);
  });

  it('with sliceDirs, a hook file inside a slice missing the use prefix is caught', async () => {
    const config = {
      root: SLICES_FIXTURE_ROOT,
      mode: 'enforce' as const,
      rules: {},
      sliceDirs: ['features'],
    };
    const violations = await requireHookPrefix(config, {});
    expect(violations.some(v => v.file.includes('features/alpha/hooks/badHook'))).toBe(true);
  });
});
