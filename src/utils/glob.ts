import micromatch from 'micromatch';
import { glob } from 'glob';
import * as path from 'node:path';

export function toRelative(filePath: string): string {
  const abs = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
  return path.relative(process.cwd(), abs).replace(/\\/g, '/');
}

export function matchesAny(filePath: string, patterns: string[]): boolean {
  if (patterns.length === 0) return false;
  return micromatch.isMatch(filePath, patterns);
}

export async function findFiles(pattern: string): Promise<string[]> {
  const results = await glob(pattern, { nodir: true });
  return results.map(f => f.replace(/\\/g, '/'));
}
