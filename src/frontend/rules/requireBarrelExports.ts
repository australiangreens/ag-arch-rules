import * as fs from 'node:fs';
import * as path from 'node:path';
import { matchesAny, toRelative } from '../../utils/glob.js';
import type { ArchConfig, BaseRuleOptions, Violation } from '../../types.js';

export async function requireBarrelExports(
  config: ArchConfig,
  options: BaseRuleOptions
): Promise<Violation[]> {
  const absComponentsDir = path.resolve(config.root, 'components');
  if (!fs.existsSync(absComponentsDir)) return [];

  const entries = fs.readdirSync(absComponentsDir, { withFileTypes: true });
  const violations: Violation[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const absDir = path.join(absComponentsDir, entry.name);
    const hasBarrel =
      fs.existsSync(path.join(absDir, 'index.ts')) ||
      fs.existsSync(path.join(absDir, 'index.tsx'));

    if (!hasBarrel) {
      const missingFile = toRelative(path.join(absDir, 'index.ts'));
      if (!matchesAny(missingFile, options.except ?? [])) {
        violations.push({ file: missingFile, message: 'barrel export missing' });
      }
    }
  }

  return violations;
}
