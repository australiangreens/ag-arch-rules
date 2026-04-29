import * as fs from 'node:fs';
import * as path from 'node:path';
import { findFiles, matchesAny, toRelative } from '../../utils/glob.js';
import type { ArchConfig, BaseRuleOptions, Violation } from '../../types.js';

const INFRA_IMPORT_RE = /from\s+['"][^'"]*infra\/[^'"]*['"]/;

export async function noLambdaImportsFromInfra(
  config: ArchConfig,
  options: BaseRuleOptions
): Promise<Violation[]> {
  const lambdaDir = path.resolve(config.root, 'lambda');
  if (!fs.existsSync(lambdaDir)) return [];

  const pattern = path.posix.join(lambdaDir.replace(/\\/g, '/'), '**/*.ts');
  const files = await findFiles(pattern);
  const violations: Violation[] = [];

  for (const file of files) {
    const relFile = toRelative(file);
    if (matchesAny(relFile, options.except ?? [])) continue;

    const content = fs.readFileSync(file, 'utf8');
    if (INFRA_IMPORT_RE.test(content)) {
      violations.push({
        file: relFile,
        message: 'Lambda handler must not import from infra/ — handler code runs at request time and must not depend on CDK synthesis-time constructs',
      });
    }
  }

  return violations;
}
