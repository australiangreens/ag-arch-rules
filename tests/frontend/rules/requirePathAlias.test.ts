import { describe, it, expect } from 'vitest';
import { requirePathAlias } from '../../../src/frontend/rules/requirePathAlias.js';

const FIXTURE_ROOT = 'tests/fixtures/project/src';
const baseConfig = { root: FIXTURE_ROOT, mode: 'enforce' as const, rules: {} };

describe('requirePathAlias', () => {
  it('detects relative cross-directory imports using ../', async () => {
    const violations = await requirePathAlias(baseConfig, {});
    expect(violations.some(v => v.file.includes('RelativeImporter'))).toBe(true);
  });

  it('does not flag same-directory ./foo imports', async () => {
    const violations = await requirePathAlias(baseConfig, {});
    // Button/index.ts uses './Button.js' — same directory, allowed
    expect(violations.every(v => !v.file.includes('Button/index'))).toBe(true);
  });

  it('Violation.file is CWD-relative', async () => {
    const violations = await requirePathAlias(baseConfig, {});
    expect(violations.every(v => v.file.startsWith('tests/fixtures/'))).toBe(true);
    expect(violations.every(v => !v.file.startsWith('/'))).toBe(true);
  });

  it('respects except patterns', async () => {
    const violations = await requirePathAlias(baseConfig, {
      except: ['tests/fixtures/project/src/components/RelativeImporter.ts'],
    });
    expect(violations.every(v => !v.file.includes('RelativeImporter'))).toBe(true);
  });

  it('populates line number on violations', async () => {
    const violations = await requirePathAlias(baseConfig, {});
    const relativeImporterViolation = violations.find(v => v.file.includes('RelativeImporter'));
    expect(relativeImporterViolation).toBeDefined();
    expect(relativeImporterViolation!.line).toBe(1);
  });
});
