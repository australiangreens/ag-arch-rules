import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ArchConfig, BaseRuleOptions, Violation } from '../../types.js';

export async function requireEnvLocalExample(
  config: ArchConfig,
  _options: BaseRuleOptions
): Promise<Violation[]> {
  if (fs.existsSync(path.resolve(config.root, '.env.local.example'))) return [];
  return [{ file: '.env.local.example', message: '.env.local.example is missing — local development environment variables must be documented for new contributors' }];
}
