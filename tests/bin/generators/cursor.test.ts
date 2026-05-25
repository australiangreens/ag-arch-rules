import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { generateCursor } from '../../../src/bin/generators/cursor.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ag-arch-cursor-'));
});

describe('generateCursor', () => {
  it('creates .cursor/rules/ directory if absent', () => {
    generateCursor(tmpDir, [], '1.0.0');
    expect(fs.existsSync(path.join(tmpDir, '.cursor', 'rules'))).toBe(true);
  });

  it('always writes the common .mdc file', () => {
    generateCursor(tmpDir, [], '1.0.0');
    const file = path.join(tmpDir, '.cursor', 'rules', 'ag-arch-rules-common.mdc');
    expect(fs.existsSync(file)).toBe(true);
  });

  it('common .mdc has alwaysApply: true frontmatter', () => {
    generateCursor(tmpDir, [], '1.0.0');
    const content = fs.readFileSync(
      path.join(tmpDir, '.cursor', 'rules', 'ag-arch-rules-common.mdc'),
      'utf8',
    );
    expect(content).toContain('alwaysApply: true');
  });

  it('writes a preset .mdc for each selected preset', () => {
    generateCursor(tmpDir, ['frontend', 'cdk'], '1.0.0');
    expect(fs.existsSync(path.join(tmpDir, '.cursor', 'rules', 'ag-arch-rules-frontend.mdc'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.cursor', 'rules', 'ag-arch-rules-cdk.mdc'))).toBe(true);
  });

  it('does not write .mdc for unselected presets', () => {
    generateCursor(tmpDir, ['frontend'], '1.0.0');
    expect(fs.existsSync(path.join(tmpDir, '.cursor', 'rules', 'ag-arch-rules-backend-node.mdc'))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, '.cursor', 'rules', 'ag-arch-rules-cdk.mdc'))).toBe(false);
  });

  it('preset .mdc has alwaysApply: false and a globs entry', () => {
    generateCursor(tmpDir, ['frontend'], '1.0.0');
    const content = fs.readFileSync(
      path.join(tmpDir, '.cursor', 'rules', 'ag-arch-rules-frontend.mdc'),
      'utf8',
    );
    expect(content).toContain('alwaysApply: false');
    expect(content).toContain('globs:');
  });

  it('includes the version in the generated file header', () => {
    generateCursor(tmpDir, [], '2.3.4');
    const content = fs.readFileSync(
      path.join(tmpDir, '.cursor', 'rules', 'ag-arch-rules-common.mdc'),
      'utf8',
    );
    expect(content).toContain('v2.3.4');
  });

  it('returns the list of files written', () => {
    const written = generateCursor(tmpDir, ['frontend'], '1.0.0');
    expect(written).toContain('.cursor/rules/ag-arch-rules-common.mdc');
    expect(written).toContain('.cursor/rules/ag-arch-rules-frontend.mdc');
  });

  it('overwrites existing .mdc files on re-run', () => {
    const rulesDir = path.join(tmpDir, '.cursor', 'rules');
    fs.mkdirSync(rulesDir, { recursive: true });
    const file = path.join(rulesDir, 'ag-arch-rules-common.mdc');
    fs.writeFileSync(file, 'old content');

    generateCursor(tmpDir, [], '1.0.0');

    const content = fs.readFileSync(file, 'utf8');
    expect(content).not.toBe('old content');
    expect(content).toContain('ag-arch-rules');
  });
});
