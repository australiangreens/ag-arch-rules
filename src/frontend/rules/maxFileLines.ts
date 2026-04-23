import * as fs from 'node:fs';
import * as path from 'node:path';
import { findFiles, matchesAny } from '../../utils/glob.js';
import type { ArchConfig, MaxFileLinesOptions, Violation } from '../../types.js';

const DEFAULT_TSX_LIMIT = 400;
const DEFAULT_TS_LIMIT  = 300;

export async function maxFileLines(
  config: ArchConfig,
  options: MaxFileLinesOptions
): Promise<Violation[]> {
  const tsxLimit = options.tsx ?? DEFAULT_TSX_LIMIT;
  const tsLimit  = options.ts  ?? DEFAULT_TS_LIMIT;

  const pattern = config.root.replace(/\\/g, '/') + '/**/*.{ts,tsx}';
  const files = await findFiles(pattern);
  const violations: Violation[] = [];

  for (const file of files) {
    const basename = path.basename(file);
    if (/\.(test|spec)\./.test(basename)) continue;
    if (matchesAny(file, options.except ?? [])) continue;

    const content = fs.readFileSync(file, 'utf8');
    const lineCount = content.split('\n').length;
    const limit = file.endsWith('.tsx') ? tsxLimit : tsLimit;

    if (lineCount > limit) {
      violations.push({
        file,
        message: `exceeds ${limit} lines (${lineCount} actual)`,
      });
    }
  }

  return violations;
}
