import * as path from 'node:path';
import { findFiles, matchesAny } from '../../utils/glob.js';
import type { ArchConfig, BaseRuleOptions, Violation } from '../../types.js';

export async function requireHookPrefix(
  config: ArchConfig,
  options: BaseRuleOptions
): Promise<Violation[]> {
  const pattern = path.posix.join(config.root.replace(/\\/g, '/'), 'hooks', '**', '*.{ts,tsx}');
  const files = await findFiles(pattern);
  const violations: Violation[] = [];

  for (const file of files) {
    const basename = path.basename(file);
    if (/\.(test|spec)\./.test(basename)) continue;
    if (matchesAny(file, options.except ?? [])) continue;

    if (!basename.startsWith('use')) {
      violations.push({
        file,
        message: `hook file '${basename}' must start with 'use'`,
      });
    }
  }

  return violations;
}
