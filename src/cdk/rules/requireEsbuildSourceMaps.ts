import * as fs from 'node:fs';
import * as path from 'node:path';
import { findFiles, matchesAny, toRelative } from '../../utils/glob.js';
import type { ArchConfig, BaseRuleOptions, Violation } from '../../types.js';

const SOURCE_MAP_RE = /sourceMap\s*:\s*true/;

export async function requireEsbuildSourceMaps(
  config: ArchConfig,
  options: BaseRuleOptions
): Promise<Violation[]> {
  const constructsDir = path.resolve(config.root, 'infra', 'constructs');
  if (!fs.existsSync(constructsDir)) return [];

  const pattern = path.posix.join(constructsDir.replace(/\\/g, '/'), '**/*.ts');
  const files = await findFiles(pattern);
  const violations: Violation[] = [];

  for (const file of files) {
    const relFile = toRelative(file);
    if (matchesAny(relFile, options.except ?? [])) continue;

    const content = fs.readFileSync(file, 'utf8');
    if (!content.includes('NodejsFunction')) continue;

    if (!SOURCE_MAP_RE.test(content)) {
      violations.push({
        file: relFile,
        message: 'bundling config must include sourceMap: true — source maps are required for meaningful Lambda error traces in CloudWatch',
      });
    }
  }

  return violations;
}
