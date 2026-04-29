import * as fs from 'node:fs';
import * as path from 'node:path';
import { findFiles, matchesAny, toRelative } from '../../utils/glob.js';
import type { ArchConfig, BaseRuleOptions, Violation } from '../../types.js';

export async function requirePayPerRequestBilling(
  config: ArchConfig,
  options: BaseRuleOptions
): Promise<Violation[]> {
  const infraDir = path.resolve(config.root, 'infra');
  if (!fs.existsSync(infraDir)) return [];

  const pattern = path.posix.join(infraDir.replace(/\\/g, '/'), '**/*.ts');
  const files = await findFiles(pattern);
  const violations: Violation[] = [];

  for (const file of files) {
    const relFile = toRelative(file);
    if (matchesAny(relFile, options.except ?? [])) continue;

    const content = fs.readFileSync(file, 'utf8');
    if (!content.includes('new Table(')) continue;

    if (!content.includes('PAY_PER_REQUEST')) {
      violations.push({
        file: relFile,
        message: 'DynamoDB table must use PAY_PER_REQUEST billing mode — provisioned throughput requires explicit justification and a rule override',
      });
    }
  }

  return violations;
}
