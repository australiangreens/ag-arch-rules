import * as path from 'node:path';
import { findFiles, matchesAny } from '../../utils/glob.js';
import { resolveLayerRoots } from '../../common/utils/sliceRoots.js';
import type { ArchConfig, BaseRuleOptions, Violation } from '../../types.js';

export async function requireHookPrefix(
  config: ArchConfig,
  options: BaseRuleOptions
): Promise<Violation[]> {
  const roots = resolveLayerRoots(config);
  const violations: Violation[] = [];

  for (const root of roots) {
    const pattern = path.posix.join(root.replace(/\\/g, '/'), 'hooks', '**', '*.{ts,tsx}');
    const files = await findFiles(pattern);

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
  }

  return violations;
}
