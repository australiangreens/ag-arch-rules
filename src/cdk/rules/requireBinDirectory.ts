import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ArchConfig, BaseRuleOptions, Violation } from '../../types.js';

export async function requireBinDirectory(
  config: ArchConfig,
  _options: BaseRuleOptions
): Promise<Violation[]> {
  if (fs.existsSync(path.resolve(config.root, 'bin'))) return [];
  return [{ file: 'bin', message: 'bin/ directory is missing — CDK app entry point must be defined in bin/' }];
}
