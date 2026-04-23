import * as fs from 'node:fs';
import { findFiles, matchesAny } from '../../utils/glob.js';
import { DEFAULT_TEST_FILE_GLOBS } from '../../defaults.js';
import type { ArchConfig, BaseRuleOptions, MaxFileLinesOptions, Violation } from '../../types.js';

const DEFAULT_TSX_LIMIT = 400;
const DEFAULT_TS_LIMIT  = 300;

export async function maxFileLines(
  config: ArchConfig,
  options: BaseRuleOptions
): Promise<Violation[]> {
  const { tsx, ts } = options as MaxFileLinesOptions;
  const tsxLimit = tsx ?? DEFAULT_TSX_LIMIT;
  const tsLimit  = ts  ?? DEFAULT_TS_LIMIT;

  const testGlobs = config.testFiles ?? DEFAULT_TEST_FILE_GLOBS;
  const pattern = config.root.replace(/\\/g, '/') + '/**/*.{ts,tsx}';
  const files = await findFiles(pattern);
  const violations: Violation[] = [];

  for (const file of files) {
    if (matchesAny(file, testGlobs)) continue;
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
