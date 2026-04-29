import * as fs from 'node:fs';
import * as path from 'node:path';
import { matchesAny, toRelative } from '../../utils/glob.js';
import type { ArchConfig, BaseRuleOptions, RequireBarrelExportsOptions, Violation } from '../../types.js';

export async function requireBarrelExports(
  config: ArchConfig,
  options: BaseRuleOptions
): Promise<Violation[]> {
  const { directories } = options as RequireBarrelExportsOptions;
  const dirsToCheck = directories ?? ['components'];
  const violations: Violation[] = [];

  for (const dirName of dirsToCheck) {
    const absDir = path.resolve(config.root, dirName);
    if (!fs.existsSync(absDir)) continue;

    const entries = fs.readdirSync(absDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const absSubDir = path.join(absDir, entry.name);
      const hasBarrel =
        fs.existsSync(path.join(absSubDir, 'index.ts')) ||
        fs.existsSync(path.join(absSubDir, 'index.tsx'));

      if (!hasBarrel) {
        const missingFile = toRelative(path.join(absSubDir, 'index.ts'));
        if (!matchesAny(missingFile, options.except ?? [])) {
          violations.push({ file: missingFile, message: 'barrel export missing' });
        }
      }
    }
  }

  return violations;
}
