import { describe, it, expect } from 'vitest';
import { formatViolations } from '../src/format.js';

describe('formatViolations', () => {
  it('formats a single violation', () => {
    const result = formatViolations('no-apis-depend-on-components', [
      { file: 'src/apis/bad.ts', message: 'imports from src/components/Button.tsx' },
    ]);
    expect(result).toContain("Rule 'no-apis-depend-on-components'");
    expect(result).toContain('1 violation');
    expect(result).toContain('src/apis/bad.ts');
    expect(result).toContain('imports from src/components/Button.tsx');
  });

  it('formats multiple violations', () => {
    const result = formatViolations('max-file-lines', [
      { file: 'src/pages/Foo.tsx', message: 'exceeds 400 lines (850 actual)' },
      { file: 'src/pages/Bar.tsx', message: 'exceeds 400 lines (500 actual)' },
    ]);
    expect(result).toContain('2 violation');
    expect(result).toContain('src/pages/Foo.tsx');
    expect(result).toContain('src/pages/Bar.tsx');
  });
});
