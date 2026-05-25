import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { generateClaude } from '../../../src/bin/generators/claude.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ag-arch-claude-'));
});

describe('generateClaude', () => {
  it('creates CLAUDE.md when it does not exist', () => {
    generateClaude(tmpDir, [], '1.0.0');
    expect(fs.existsSync(path.join(tmpDir, 'CLAUDE.md'))).toBe(true);
  });

  it('written file contains sentinel comments', () => {
    generateClaude(tmpDir, [], '1.0.0');
    const content = fs.readFileSync(path.join(tmpDir, 'CLAUDE.md'), 'utf8');
    expect(content).toContain('<!-- ag-arch-rules: begin -->');
    expect(content).toContain('<!-- ag-arch-rules: end -->');
  });

  it('written file contains common rules', () => {
    generateClaude(tmpDir, [], '1.0.0');
    const content = fs.readFileSync(path.join(tmpDir, 'CLAUDE.md'), 'utf8');
    expect(content).toContain('Common Rules');
  });

  it('preserves existing content outside the sentinel block', () => {
    const claudePath = path.join(tmpDir, 'CLAUDE.md');
    fs.writeFileSync(claudePath, '# My Project\n\nExisting docs.\n');

    generateClaude(tmpDir, [], '1.0.0');

    const content = fs.readFileSync(claudePath, 'utf8');
    expect(content).toContain('# My Project');
    expect(content).toContain('Existing docs.');
  });

  it('replaces the sentinel section on re-run without duplicating it', () => {
    generateClaude(tmpDir, [], '1.0.0');
    generateClaude(tmpDir, ['frontend'], '1.0.0');

    const content = fs.readFileSync(path.join(tmpDir, 'CLAUDE.md'), 'utf8');
    const beginCount = (content.match(/<!-- ag-arch-rules: begin -->/g) ?? []).length;
    expect(beginCount).toBe(1);
    expect(content).toContain('Frontend Rules');
  });

  it('includes preset-specific content when a preset is selected', () => {
    generateClaude(tmpDir, ['backend-node'], '1.0.0');
    const content = fs.readFileSync(path.join(tmpDir, 'CLAUDE.md'), 'utf8');
    expect(content).toContain('Backend Node Rules');
  });

  it('includes the version in the generated content', () => {
    generateClaude(tmpDir, [], '3.1.4');
    const content = fs.readFileSync(path.join(tmpDir, 'CLAUDE.md'), 'utf8');
    expect(content).toContain('v3.1.4');
  });
});
