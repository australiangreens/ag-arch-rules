import { describe, it, expect } from 'vitest';
import { noCircularDependencies } from '../../../src/common/rules/noCircularDependencies.js';

const FIXTURE_ROOT = 'tests/fixtures/project/src';
const baseConfig = { root: FIXTURE_ROOT, mode: 'enforce' as const, rules: {} };

describe('noCircularDependencies', () => {
  it('detects circular imports', async () => {
    const violations = await noCircularDependencies(baseConfig, {});
    expect(violations.some(v => v.file.includes('circular'))).toBe(true);
  });

  it('Violation.file is CWD-relative', async () => {
    const violations = await noCircularDependencies(baseConfig, {});
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].file).not.toMatch(/^\//);
    expect(violations[0].file.startsWith('tests/')).toBe(true);
  });

  it('respects except patterns (CWD-relative)', async () => {
    const violations = await noCircularDependencies(baseConfig, {
      except: ['tests/fixtures/project/src/circular/**'],
    });
    expect(violations.every(v => !v.file.includes('circular'))).toBe(true);
  });
});
