import { describe, it, expect } from 'vitest';
import { maxFileLines } from '../../../src/common/rules/maxFileLines.js';

const FIXTURE_ROOT = 'tests/fixtures/project/src';
const baseConfig = { root: FIXTURE_ROOT, mode: 'enforce' as const, rules: {} };

describe('maxFileLines', () => {
  it('detects a .tsx file exceeding the 400-line default', async () => {
    const violations = await maxFileLines(baseConfig, {});
    expect(violations.some(v => v.file.includes('LongPage.tsx'))).toBe(true);
  });

  it('does not flag files within the limit', async () => {
    const violations = await maxFileLines(baseConfig, {});
    expect(violations.every(v => !v.file.includes('HomePage.tsx'))).toBe(true);
  });

  it('respects custom tsx limit', async () => {
    // LongPage.tsx has 401 lines; limit 500 should not flag it
    const violations = await maxFileLines(baseConfig, { tsx: 500 });
    expect(violations.every(v => !v.file.includes('LongPage.tsx'))).toBe(true);
  });

  it('excludes test files', async () => {
    const violations = await maxFileLines(baseConfig, {});
    expect(violations.every(v => !v.file.includes('.test.'))).toBe(true);
    expect(violations.every(v => !v.file.includes('.spec.'))).toBe(true);
  });

  it('Violation.file is CWD-relative', async () => {
    const violations = await maxFileLines(baseConfig, {});
    expect(violations.every(v => v.file.startsWith('tests/fixtures/'))).toBe(true);
    expect(violations.every(v => !v.file.startsWith('/'))).toBe(true);
  });

  it('respects except patterns', async () => {
    const violations = await maxFileLines(baseConfig, {
      except: ['tests/fixtures/project/src/pages/LongPage.tsx'],
    });
    expect(violations.every(v => !v.file.includes('LongPage'))).toBe(true);
  });
});
