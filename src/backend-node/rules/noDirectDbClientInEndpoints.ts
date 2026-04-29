import * as fs from 'node:fs';
import * as path from 'node:path';
import { findFiles, matchesAny, toRelative } from '../../utils/glob.js';
import type { ArchConfig, BaseRuleOptions, Violation } from '../../types.js';

const FORBIDDEN: Array<{ re: RegExp; label: string }> = [
  { re: /from\s+['"][^'"]*[\\/]knexClient['"]/m, label: 'knexClient module' },
  { re: /from\s+['"]knex['"]/m,                  label: "'knex' package" },
];

export async function noDirectDbClientInEndpoints(
  config: ArchConfig,
  options: BaseRuleOptions
): Promise<Violation[]> {
  const endpointsDir = path.resolve(config.root, 'endpoints');
  if (!fs.existsSync(endpointsDir)) return [];

  const pattern = path.posix.join(endpointsDir.replace(/\\/g, '/'), '**/*.ts');
  const files = await findFiles(pattern);
  const violations: Violation[] = [];

  for (const file of files) {
    const relFile = toRelative(file);
    if (matchesAny(relFile, options.except ?? [])) continue;

    const content = fs.readFileSync(file, 'utf8');

    for (const { re, label } of FORBIDDEN) {
      if (re.test(content)) {
        violations.push({
          file: relFile,
          message: `imports ${label} directly — database access must go through the models layer`,
        });
        break;
      }
    }
  }

  return violations;
}
