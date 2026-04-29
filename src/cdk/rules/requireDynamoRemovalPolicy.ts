import * as fs from 'node:fs';
import * as path from 'node:path';
import { findFiles, toRelative } from '../../utils/glob.js';
import type { ArchConfig, BaseRuleOptions, Violation } from '../../types.js';

export async function requireDynamoRemovalPolicy(
  config: ArchConfig,
  _options: BaseRuleOptions
): Promise<Violation[]> {
  const infraDir = path.resolve(config.root, 'infra');
  if (!fs.existsSync(infraDir)) return [];

  const pattern = path.posix.join(infraDir.replace(/\\/g, '/'), '**/*.ts');
  const files = await findFiles(pattern);

  const allContent = files.map(f => fs.readFileSync(f, 'utf8')).join('\n');

  if (!allContent.includes('new Table(')) return [];

  const hasRetain  = allContent.includes('RemovalPolicy.RETAIN');
  const hasDestroy = allContent.includes('RemovalPolicy.DESTROY');

  if (hasRetain && hasDestroy) return [];

  const missing = [
    ...(!hasRetain  ? ['RemovalPolicy.RETAIN']  : []),
    ...(!hasDestroy ? ['RemovalPolicy.DESTROY'] : []),
  ];

  return [{
    file: toRelative(infraDir),
    message: `DynamoDB tables must have a conditional removal policy — both RemovalPolicy.RETAIN and RemovalPolicy.DESTROY must appear in infra/ code. Missing: ${missing.join(', ')}`,
  }];
}
