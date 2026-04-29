import * as fs from 'node:fs';
import * as path from 'node:path';
import { findFiles, toRelative } from '../../utils/glob.js';
import type { ArchConfig, BaseRuleOptions, Violation } from '../../types.js';

export async function requireCustomNodejsConstruct(
  config: ArchConfig,
  _options: BaseRuleOptions
): Promise<Violation[]> {
  const infraDir = path.resolve(config.root, 'infra');
  if (!fs.existsSync(infraDir)) return [];

  const constructsDir = path.resolve(infraDir, 'constructs');
  if (!fs.existsSync(constructsDir)) {
    return [{
      file: toRelative(constructsDir),
      message: 'infra/constructs/ directory is missing — each CDK project must define a custom NodejsFunction wrapper construct with shared defaults',
    }];
  }

  const pattern = path.posix.join(constructsDir.replace(/\\/g, '/'), '**/*.ts');
  const files = await findFiles(pattern);

  const hasWrapper = files.some(file => {
    const content = fs.readFileSync(file, 'utf8');
    return /NodejsFunction/.test(content);
  });

  if (!hasWrapper) {
    return [{
      file: toRelative(constructsDir),
      message: 'infra/constructs/ contains no NodejsFunction wrapper — define a project-specific subclass with shared runtime defaults',
    }];
  }

  return [];
}
