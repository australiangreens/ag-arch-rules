import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ArchConfig, BaseRuleOptions, Violation } from '../../types.js';

export async function requireCdkJson(
  config: ArchConfig,
  _options: BaseRuleOptions
): Promise<Violation[]> {
  if (fs.existsSync(path.resolve(config.root, 'cdk.json'))) return [];
  return [{ file: 'cdk.json', message: 'cdk.json is missing — this does not appear to be a CDK project' }];
}
