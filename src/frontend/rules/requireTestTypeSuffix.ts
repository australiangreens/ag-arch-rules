import * as path from 'node:path';
import { findFiles, matchesAny } from '../../utils/glob.js';
import type { ArchConfig, RequireTestTypeSuffixOptions, Violation } from '../../types.js';

const DEFAULT_SUFFIXES = ['unit', 'comp', 'int'];

export async function requireTestTypeSuffix(
  config: ArchConfig,
  options: RequireTestTypeSuffixOptions
): Promise<Violation[]> {
  const allowedSuffixes = options.allowedSuffixes ?? DEFAULT_SUFFIXES;
  const pattern = config.root.replace(/\\/g, '/') + '/**/*.{test,spec}.{ts,tsx,js,jsx}';
  const files = await findFiles(pattern);
  const violations: Violation[] = [];

  for (const file of files) {
    if (matchesAny(file, options.except ?? [])) continue;

    const basename = path.basename(file);
    const hasValidSuffix = allowedSuffixes.some(suffix =>
      new RegExp(`\\.${suffix}\\.(?:test|spec)\\.`).test(basename)
    );

    if (!hasValidSuffix) {
      violations.push({
        file,
        message: `test file must be named *.{${allowedSuffixes.join('|')}}.test.* — got '${basename}'`,
      });
    }
  }

  return violations;
}
