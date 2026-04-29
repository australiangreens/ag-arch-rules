import * as fs from 'node:fs';
import * as path from 'node:path';
import { findFiles, toRelative } from '../../utils/glob.js';
import type { ArchConfig, BaseRuleOptions, Violation } from '../../types.js';

export async function requireSecretsManagerGrants(
  config: ArchConfig,
  _options: BaseRuleOptions
): Promise<Violation[]> {
  const infraDir = path.resolve(config.root, 'infra');
  if (!fs.existsSync(infraDir)) return [];

  const pattern = path.posix.join(infraDir.replace(/\\/g, '/'), '**/*.ts');
  const files = await findFiles(pattern);

  const allContent = files.map(f => fs.readFileSync(f, 'utf8')).join('\n');

  if (!allContent.includes('secretsmanager')) return [];
  if (allContent.includes('.grantRead(')) return [];

  return [{
    file: toRelative(infraDir),
    message: 'Secrets Manager is used but no .grantRead() call was found — every secret must be explicitly granted to the Lambda functions that need it',
  }];
}
