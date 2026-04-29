import * as fs from 'node:fs';
import * as path from 'node:path';
import { findFiles, toRelative } from '../../utils/glob.js';
import type { ArchConfig, BaseRuleOptions, Violation } from '../../types.js';

const AUTH_PATTERNS: RegExp[] = [
  /addApiKey\s*\(/,
  /new\s+UsagePlan\s*\(/,
  /new\s+TokenAuthorizer\s*\(/,
  /new\s+RequestAuthorizer\s*\(/,
  /authorizationType\s*:\s*AuthorizationType\.CUSTOM/,
];

export async function requireApiAuthentication(
  config: ArchConfig,
  _options: BaseRuleOptions
): Promise<Violation[]> {
  const infraDir = path.resolve(config.root, 'infra');
  if (!fs.existsSync(infraDir)) return [];

  const pattern = path.posix.join(infraDir.replace(/\\/g, '/'), '**/*.ts');
  const files = await findFiles(pattern);
  const allContent = files.map(f => fs.readFileSync(f, 'utf8')).join('\n');

  if (AUTH_PATTERNS.some(re => re.test(allContent))) return [];

  return [{
    file: toRelative(infraDir),
    message: 'API Gateway has no authentication configured — add an API key, usage plan, or custom Lambda authorizer. Set this rule to "off" if an unauthenticated API is intentional.',
  }];
}
