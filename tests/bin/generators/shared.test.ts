import { describe, it, expect } from 'vitest';
import { upsertSentinelSection, buildMarkdownContent } from '../../../src/bin/generators/shared.js';

describe('upsertSentinelSection', () => {
  it('appends sentinel block when file is empty', () => {
    const result = upsertSentinelSection('', 'section content');
    expect(result).toContain('<!-- ag-arch-rules: begin -->');
    expect(result).toContain('section content');
    expect(result).toContain('<!-- ag-arch-rules: end -->');
  });

  it('appends sentinel block when file has no existing sentinel', () => {
    const result = upsertSentinelSection('# My File\n\nExisting content.\n', 'section content');
    expect(result).toContain('# My File');
    expect(result).toContain('Existing content.');
    expect(result).toContain('<!-- ag-arch-rules: begin -->');
    expect(result).toContain('section content');
  });

  it('replaces section between sentinels on re-run', () => {
    const existing = [
      '# My File',
      '',
      '<!-- ag-arch-rules: begin -->',
      'old content',
      '<!-- ag-arch-rules: end -->',
      '',
      'After sentinel.',
    ].join('\n');

    const result = upsertSentinelSection(existing, 'new content');
    expect(result).toContain('new content');
    expect(result).not.toContain('old content');
    expect(result).toContain('After sentinel.');
    expect(result).toContain('# My File');
  });

  it('preserves content before and after the sentinel block', () => {
    const existing = [
      'Before content.',
      '',
      '<!-- ag-arch-rules: begin -->',
      'old',
      '<!-- ag-arch-rules: end -->',
      '',
      'After content.',
    ].join('\n');

    const result = upsertSentinelSection(existing, 'new');
    expect(result.indexOf('Before content.')).toBeLessThan(result.indexOf('ag-arch-rules: begin'));
    expect(result.indexOf('After content.')).toBeGreaterThan(result.indexOf('ag-arch-rules: end'));
  });
});

describe('buildMarkdownContent', () => {
  it('always includes the version header', () => {
    const result = buildMarkdownContent([], '1.2.3');
    expect(result).toContain('ag-arch-rules v1.2.3');
  });

  it('always includes common rules', () => {
    const result = buildMarkdownContent([], '1.0.0');
    expect(result).toContain('Common Rules');
  });

  it('includes frontend rules when frontend preset is selected', () => {
    const result = buildMarkdownContent(['frontend'], '1.0.0');
    expect(result).toContain('Frontend Rules');
  });

  it('includes backend-node rules when backend-node preset is selected', () => {
    const result = buildMarkdownContent(['backend-node'], '1.0.0');
    expect(result).toContain('Backend Node Rules');
  });

  it('includes cdk rules when cdk preset is selected', () => {
    const result = buildMarkdownContent(['cdk'], '1.0.0');
    expect(result).toContain('CDK Rules');
  });

  it('excludes frontend rules when not selected', () => {
    const result = buildMarkdownContent(['cdk'], '1.0.0');
    expect(result).not.toContain('Frontend Rules');
  });
});
