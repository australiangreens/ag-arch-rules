import * as path from 'node:path';
import { findFiles, matchesAny } from '../../utils/glob.js';
import { DEFAULT_TEST_FILE_GLOBS } from '../../defaults.js';
import type { ArchConfig, BaseRuleOptions, RequireTestTypeSuffixOptions, Violation } from '../../types.js';

const DEFAULT_SUFFIXES = ['unit', 'comp', 'int'];

export async function requireTestTypeSuffix(
  config: ArchConfig,
  options: BaseRuleOptions
): Promise<Violation[]> {
  const { allowedSuffixes } = options as RequireTestTypeSuffixOptions;
  const resolvedSuffixes = allowedSuffixes ?? DEFAULT_SUFFIXES;

  const testGlobs = config.testFiles ?? DEFAULT_TEST_FILE_GLOBS;
  const root = config.root.replace(/\\/g, '/');
  // Scope each glob to config.root when no explicit testFiles are provided,
  // otherwise use consumer-supplied CWD-relative globs as-is.
  const patterns = config.testFiles
    ? testGlobs
    : testGlobs.map(g => `${root}/${g}`);

  const fileSets = await Promise.all(patterns.map(p => findFiles(p)));
  const files = [...new Set(fileSets.flat())];
  const violations: Violation[] = [];

  for (const file of files) {
    if (matchesAny(file, options.except ?? [])) continue;

    const basename = path.basename(file);
    // Matches both *.suffix.test.ts and *.suffix.ts (for __tests__/ style)
    const hasValidSuffix = resolvedSuffixes.some(suffix =>
      new RegExp(`\\.${suffix}\\.`).test(basename)
    );

    if (!hasValidSuffix) {
      violations.push({
        file,
        message: `test file must include a type suffix (.${resolvedSuffixes.join('|.')}) — got '${basename}'`,
      });
    }
  }

  return violations;
}
