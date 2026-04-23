import { describe, it, expect } from 'vitest';
import { requireTestTypeSuffix } from '../../../src/frontend/rules/requireTestTypeSuffix.js';

const FIXTURE_ROOT = 'tests/fixtures/project/src';
const baseConfig = { root: FIXTURE_ROOT, mode: 'enforce' as const, rules: {} };

describe('requireTestTypeSuffix', () => {
  it('detects test files missing a type suffix', async () => {
    const violations = await requireTestTypeSuffix(baseConfig, {});
    expect(violations.some(v => v.file.includes('badTest.test'))).toBe(true);
  });

  it('does not flag correctly-suffixed test files', async () => {
    const violations = await requireTestTypeSuffix(baseConfig, {});
    expect(violations.every(v => !v.file.includes('useFeature.unit.test'))).toBe(true);
  });

  it('respects custom allowedSuffixes', async () => {
    const violations = await requireTestTypeSuffix(baseConfig, {
      allowedSuffixes: ['unit', 'comp', 'int', 'e2e'],
    });
    expect(violations.some(v => v.file.includes('badTest.test'))).toBe(true);
  });

  it('Violation.file is CWD-relative', async () => {
    const violations = await requireTestTypeSuffix(baseConfig, {});
    expect(violations.every(v => v.file.startsWith('tests/fixtures/'))).toBe(true);
    expect(violations.every(v => !v.file.startsWith('/'))).toBe(true);
  });

  it('respects except patterns', async () => {
    const violations = await requireTestTypeSuffix(baseConfig, {
      except: ['tests/fixtures/project/src/hooks/badTest.test.ts'],
    });
    expect(violations.every(v => !v.file.includes('badTest'))).toBe(true);
  });
});
