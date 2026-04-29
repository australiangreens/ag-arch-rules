import { describe, it, expect } from 'vitest';
import { requireLambdaHandlerExport } from '../../../src/cdk/rules/requireLambdaHandlerExport.js';

const CONFORMANT = 'tests/fixtures/cdk-rules/conformant';
const VIOLATIONS = 'tests/fixtures/cdk-rules/lambda-violations';
const base = { mode: 'enforce' as const, rules: {} };

describe('requireLambdaHandlerExport', () => {
  it('returns no violations for a conformant project', async () => {
    const violations = await requireLambdaHandlerExport({ ...base, root: CONFORMANT }, {});
    expect(violations).toHaveLength(0);
  });

  it('reports a violation when an entry-point file does not export handler', async () => {
    const violations = await requireLambdaHandlerExport({ ...base, root: VIOLATIONS }, {});
    expect(violations.some(v => v.file.includes('badFunction/index.ts'))).toBe(true);
    expect(violations[0].message).toMatch(/handler/);
  });

  it('does not flag shared utility files nested deeper than one directory', async () => {
    const violations = await requireLambdaHandlerExport({ ...base, root: CONFORMANT }, {});
    expect(violations.every(v => !v.file.includes('shared/helper.ts'))).toBe(true);
  });

  it('respects except globs', async () => {
    const violations = await requireLambdaHandlerExport({ ...base, root: VIOLATIONS }, {
      except: ['tests/fixtures/cdk-rules/lambda-violations/lambda/badFunction/index.ts'],
    });
    expect(violations).toHaveLength(0);
  });
});
