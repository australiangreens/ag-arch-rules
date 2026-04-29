import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ArchConfig, BaseRuleOptions, Violation } from '../../types.js';

export async function requireInfraDirectory(
  config: ArchConfig,
  _options: BaseRuleOptions
): Promise<Violation[]> {
  if (fs.existsSync(path.resolve(config.root, 'infra'))) return [];
  return [{ file: 'infra', message: 'infra/ directory is missing — CDK infrastructure code must live separately from Lambda handler code' }];
}
