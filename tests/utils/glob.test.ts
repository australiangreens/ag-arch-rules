import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import { matchesAny, findFiles, toRelative } from '../../src/utils/glob.js';

describe('toRelative', () => {
  it('converts an absolute path to CWD-relative', () => {
    const abs = path.resolve('src/foo/bar.ts');
    expect(toRelative(abs)).toBe('src/foo/bar.ts');
  });

  it('is a no-op for paths already relative to CWD', () => {
    expect(toRelative('src/foo/bar.ts')).toBe('src/foo/bar.ts');
  });

  it('normalizes backslashes to forward slashes', () => {
    const abs = path.resolve('src/foo/bar.ts');
    expect(toRelative(abs)).not.toContain('\\');
  });
});

describe('matchesAny', () => {
  it('returns true when file matches at least one pattern', () => {
    expect(matchesAny('src/components/Foo/Foo.tsx', ['src/components/Foo/**'])).toBe(true);
  });

  it('returns false when file matches no pattern', () => {
    expect(matchesAny('src/apis/userApi.ts', ['src/components/**'])).toBe(false);
  });

  it('returns false for empty patterns array', () => {
    expect(matchesAny('src/anything.ts', [])).toBe(false);
  });
});

describe('findFiles', () => {
  it('returns CWD-relative paths matching a glob pattern', async () => {
    const files = await findFiles('tests/fixtures/project/src/apis/*.ts');
    expect(files.length).toBeGreaterThan(0);
    expect(files.every(f => f.endsWith('.ts'))).toBe(true);
    expect(files.every(f => !path.isAbsolute(f))).toBe(true);
  });

  it('returns empty array when no files match', async () => {
    const files = await findFiles('tests/fixtures/project/src/nonexistent/**');
    expect(files).toEqual([]);
  });
});
