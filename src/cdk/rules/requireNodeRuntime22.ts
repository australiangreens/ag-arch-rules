import * as fs from 'node:fs';
import * as path from 'node:path';
import { findFiles, matchesAny, toRelative } from '../../utils/glob.js';
import type { ArchConfig, BaseRuleOptions, Violation } from '../../types.js';

// Matches NODEJS_22_X through NODEJS_99_X, plus NODEJS_LATEST
const VALID_RUNTIME_RE = /NODEJS_(?:2[2-9]|[3-9]\d)_X|NODEJS_LATEST/;

export async function requireNodeRuntime22(
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

    if (!VALID_RUNTIME_RE.test(content)) {
      violations.push({
        file: relFile,
        message: 'Lambda runtime must be Node.js 22.x or higher — update to Runtime.NODEJS_22_X',
      });
    }
  }

  return violations;
}
