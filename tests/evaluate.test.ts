import { describe, it, expect } from 'vitest';
import { evaluate } from '../src/evaluate.js';

const FIXTURE_ROOT = 'tests/fixtures/project/src';
const baseConfig = { root: FIXTURE_ROOT, mode: 'enforce' as const, rules: {} };

describe('evaluate', () => {
  it('dispatches no-apis-depend-on-components and returns violations', async () => {
    const violations = await evaluate('no-apis-depend-on-components', baseConfig, {});
    expect(Array.isArray(violations)).toBe(true);
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].file).not.toMatch(/^\//);
  });

  it('dispatches max-file-lines and returns violations', async () => {
    const violations = await evaluate('max-file-lines', baseConfig, {});
    expect(Array.isArray(violations)).toBe(true);
    expect(violations.some(v => v.file.includes('LongPage'))).toBe(true);
  });

  it('throws for unknown rule names', async () => {
    await expect(evaluate('unknown-rule', baseConfig, {})).rejects.toThrow(
      "Unknown rule: 'unknown-rule'"
    );
  });
});
