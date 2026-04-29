import { describe, it, expect, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { runArchRules } from '../src/runArchRules.js';

const tmpFile = path.join(os.tmpdir(), `arch-smoke-${Date.now()}.json`);

process.env.ARCH_JSON_OUTPUT = tmpFile;

runArchRules({
  root: 'tests/fixtures/project/src',
  mode: 'report',
  rules: {
    'require-path-alias':           'warn',
    'max-file-lines':               'warn',
    'no-apis-depend-on-components': 'warn',
    'no-circular-dependencies':     'warn',
    'require-barrel-exports':       'warn',
    'require-hook-prefix':          'warn',
    'require-test-type-suffix':     'warn',
  },
});

describe('JSON output smoke test', () => {
  afterAll(() => {
    delete process.env.ARCH_JSON_OUTPUT;
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  });

  it('writes a JSON file when ARCH_JSON_OUTPUT is set', () => {
    expect(fs.existsSync(tmpFile)).toBe(true);
  });

  it('require-path-alias violations include a line number', () => {
    const records: Array<Record<string, unknown>> = JSON.parse(fs.readFileSync(tmpFile, 'utf8'));
    const rpa = records.filter(r => r.rule === 'require-path-alias');
    expect(rpa.length).toBeGreaterThan(0);
    expect(rpa.every(r => typeof r.line === 'number' && (r.line as number) > 0)).toBe(true);
  });

  it('max-file-lines violations do not include a line key', () => {
    const records: Array<Record<string, unknown>> = JSON.parse(fs.readFileSync(tmpFile, 'utf8'));
    const mfl = records.filter(r => r.rule === 'max-file-lines');
    expect(mfl.length).toBeGreaterThan(0);
    expect(mfl.every(r => !('line' in r))).toBe(true);
  });
});
