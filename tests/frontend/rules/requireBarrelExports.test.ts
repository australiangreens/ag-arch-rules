import { describe, it, expect } from 'vitest';
import { requireBarrelExports } from '../../../src/frontend/rules/requireBarrelExports.js';

const FIXTURE_ROOT = 'tests/fixtures/project/src';
const baseConfig = { root: FIXTURE_ROOT, mode: 'enforce' as const, rules: {} };

describe('requireBarrelExports', () => {
  it('reports the missing index.ts path for a component directory without a barrel', async () => {
    const violations = await requireBarrelExports(baseConfig, {});
    expect(violations.some(v => v.file.includes('NoBarrel/index.ts'))).toBe(true);
    expect(violations[0].message).toBe('barrel export missing');
  });

  it('does not flag directories that have index.ts', async () => {
    const violations = await requireBarrelExports(baseConfig, {});
    expect(violations.every(v => !v.file.includes('Button'))).toBe(true);
  });

  it('Violation.file is CWD-relative', async () => {
    const violations = await requireBarrelExports(baseConfig, {});
    expect(violations.every(v => v.file.startsWith('tests/fixtures/'))).toBe(true);
    expect(violations.every(v => !v.file.startsWith('/'))).toBe(true);
  });

  it('respects except patterns matched against missing-file path', async () => {
    const violations = await requireBarrelExports(baseConfig, {
      except: ['tests/fixtures/project/src/components/NoBarrel/**'],
    });
    expect(violations.every(v => !v.file.includes('NoBarrel'))).toBe(true);
  });
});
