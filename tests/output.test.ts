import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { writeJsonOutput } from '../src/output.js';
import type { RuleResult, JsonViolationRecord } from '../src/types.js';

let tmpFile: string;

beforeEach(() => {
  tmpFile = path.join(os.tmpdir(), `arch-test-${Date.now()}.json`);
});

afterEach(() => {
  if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
});

describe('writeJsonOutput', () => {
  it('writes a flat JSON array to the given path', () => {
    const results: RuleResult[] = [
      {
        rule: 'require-path-alias',
        severity: 'warn',
        violations: [
          { file: 'src/foo.ts', line: 3, message: "uses '../bar'" },
          { file: 'src/baz.ts', line: 7, message: "uses '../qux'" },
        ],
      },
    ];

    writeJsonOutput(results, tmpFile);

    const records: JsonViolationRecord[] = JSON.parse(fs.readFileSync(tmpFile, 'utf8'));
    expect(records).toHaveLength(2);
    expect(records[0]).toEqual({
      rule: 'require-path-alias',
      severity: 'warn',
      file: 'src/foo.ts',
      line: 3,
      message: "uses '../bar'",
    });
    expect(records[1]).toEqual({
      rule: 'require-path-alias',
      severity: 'warn',
      file: 'src/baz.ts',
      line: 7,
      message: "uses '../qux'",
    });
  });

  it('omits the line key entirely when line is undefined', () => {
    const results: RuleResult[] = [
      {
        rule: 'max-file-lines',
        severity: 'warn',
        violations: [{ file: 'src/big.ts', message: 'exceeds 300 lines (716 actual)' }],
      },
    ];

    writeJsonOutput(results, tmpFile);

    const records: JsonViolationRecord[] = JSON.parse(fs.readFileSync(tmpFile, 'utf8'));
    expect(records).toHaveLength(1);
    expect('line' in records[0]).toBe(false);
    expect(records[0].message).toBe('exceeds 300 lines (716 actual)');
  });

  it('flattens violations from multiple rules into a single array', () => {
    const results: RuleResult[] = [
      {
        rule: 'require-path-alias',
        severity: 'warn',
        violations: [{ file: 'src/a.ts', line: 1, message: 'msg a' }],
      },
      {
        rule: 'max-file-lines',
        severity: 'warn',
        violations: [{ file: 'src/b.ts', message: 'msg b' }],
      },
    ];

    writeJsonOutput(results, tmpFile);

    const records: JsonViolationRecord[] = JSON.parse(fs.readFileSync(tmpFile, 'utf8'));
    expect(records).toHaveLength(2);
    expect(records[0].rule).toBe('require-path-alias');
    expect(records[1].rule).toBe('max-file-lines');
  });

  it('produces an empty array when all rules have zero violations', () => {
    const results: RuleResult[] = [
      { rule: 'require-path-alias', severity: 'warn', violations: [] },
    ];

    writeJsonOutput(results, tmpFile);

    const records = JSON.parse(fs.readFileSync(tmpFile, 'utf8'));
    expect(records).toEqual([]);
  });

  it('writes pretty-printed JSON', () => {
    const results: RuleResult[] = [
      {
        rule: 'require-path-alias',
        severity: 'warn',
        violations: [{ file: 'src/a.ts', line: 1, message: 'msg' }],
      },
    ];

    writeJsonOutput(results, tmpFile);

    const raw = fs.readFileSync(tmpFile, 'utf8');
    expect(raw).toContain('\n');
    expect(raw).toContain('  ');
  });
});
