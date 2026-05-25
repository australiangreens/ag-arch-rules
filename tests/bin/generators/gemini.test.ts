import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { generateGemini } from '../../../src/bin/generators/gemini.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ag-arch-gemini-'));
});

describe('generateGemini', () => {
  it('creates GEMINI.md when it does not exist', () => {
    generateGemini(tmpDir, [], '1.0.0');
    expect(fs.existsSync(path.join(tmpDir, 'GEMINI.md'))).toBe(true);
  });

  it('written file contains sentinel comments', () => {
    generateGemini(tmpDir, [], '1.0.0');
    const content = fs.readFileSync(path.join(tmpDir, 'GEMINI.md'), 'utf8');
    expect(content).toContain('<!-- ag-arch-rules: begin -->');
    expect(content).toContain('<!-- ag-arch-rules: end -->');
  });

  it('written file contains common rules', () => {
    generateGemini(tmpDir, [], '1.0.0');
    const content = fs.readFileSync(path.join(tmpDir, 'GEMINI.md'), 'utf8');
    expect(content).toContain('Common Rules');
  });

  it('preserves existing content outside the sentinel block', () => {
    const geminiPath = path.join(tmpDir, 'GEMINI.md');
    fs.writeFileSync(geminiPath, '# Gemini Config\n\nExisting settings.\n');

    generateGemini(tmpDir, [], '1.0.0');

    const content = fs.readFileSync(geminiPath, 'utf8');
    expect(content).toContain('# Gemini Config');
    expect(content).toContain('Existing settings.');
  });

  it('replaces the sentinel section on re-run without duplicating it', () => {
    generateGemini(tmpDir, [], '1.0.0');
    generateGemini(tmpDir, ['cdk'], '1.0.0');

    const content = fs.readFileSync(path.join(tmpDir, 'GEMINI.md'), 'utf8');
    const beginCount = (content.match(/<!-- ag-arch-rules: begin -->/g) ?? []).length;
    expect(beginCount).toBe(1);
    expect(content).toContain('CDK Rules');
  });

  it('includes preset-specific content when a preset is selected', () => {
    generateGemini(tmpDir, ['frontend'], '1.0.0');
    const content = fs.readFileSync(path.join(tmpDir, 'GEMINI.md'), 'utf8');
    expect(content).toContain('Frontend Rules');
  });

  it('includes the version in the generated content', () => {
    generateGemini(tmpDir, [], '2.0.0');
    const content = fs.readFileSync(path.join(tmpDir, 'GEMINI.md'), 'utf8');
    expect(content).toContain('v2.0.0');
  });
});
