import * as fs from 'node:fs';
import * as path from 'node:path';
import { findFiles, matchesAny, toRelative } from '../../utils/glob.js';
import type { ArchConfig, BaseRuleOptions, Violation } from '../../types.js';

export async function requireValidationSchema(
  config: ArchConfig,
  options: BaseRuleOptions
): Promise<Violation[]> {
  const endpointsDir = path.resolve(config.root, 'endpoints');
  if (!fs.existsSync(endpointsDir)) return [];

  const pattern = path.posix.join(endpointsDir.replace(/\\/g, '/'), '**/index.ts');
  const indexFiles = await findFiles(pattern);
  const violations: Violation[] = [];

  for (const indexFile of indexFiles) {
    const dir = path.dirname(indexFile);
    // Skip the root endpoints/index.ts (the router aggregator has no schema of its own)
    if (dir === endpointsDir) continue;

    const hasSchema = fs.existsSync(path.join(dir, 'validationSchemas.ts'));
    if (!hasSchema) {
      const missingFile = toRelative(path.join(dir, 'validationSchemas.ts'));
      if (!matchesAny(missingFile, options.except ?? [])) {
        violations.push({
          file: missingFile,
          message: 'validation schema file missing — each endpoint directory must declare explicit request validation',
        });
      }
    }
  }

  return violations;
}
