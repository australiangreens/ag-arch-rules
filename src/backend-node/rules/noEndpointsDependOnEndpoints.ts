import * as fs from 'node:fs';
import * as path from 'node:path';
import { findFiles, matchesAny, toRelative } from '../../utils/glob.js';
import type { ArchConfig, BaseRuleOptions, Violation } from '../../types.js';

const IMPORT_RE = /from\s+['"](\.[^'"]+)['"]/gm;

export async function noEndpointsDependOnEndpoints(
  config: ArchConfig,
  options: BaseRuleOptions
): Promise<Violation[]> {
  const endpointsDir = path.resolve(config.root, 'endpoints');
  if (!fs.existsSync(endpointsDir)) return [];

  const entries = fs.readdirSync(endpointsDir, { withFileTypes: true });
  const subDirs = new Set(entries.filter(e => e.isDirectory()).map(e => e.name));

  const pattern = path.posix.join(endpointsDir.replace(/\\/g, '/'), '**/*.ts');
  const files = await findFiles(pattern);
  const violations: Violation[] = [];

  for (const file of files) {
    // Skip files at the root endpoints/ level (the aggregator barrel and its siblings)
    if (path.dirname(file) === endpointsDir) continue;

    const relFile = toRelative(file);
    if (matchesAny(relFile, options.except ?? [])) continue;

    const content = fs.readFileSync(file, 'utf8');
    const fileRelToEndpoints = path.relative(endpointsDir, path.dirname(file));
    const fileSubDir = fileRelToEndpoints.split(path.sep)[0];

    IMPORT_RE.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = IMPORT_RE.exec(content)) !== null) {
      const importPath = match[1];
      const resolved = path.resolve(path.dirname(file), importPath);
      const relToEndpoints = path.relative(endpointsDir, resolved);

      if (relToEndpoints.startsWith('..')) continue;

      const targetSubDir = relToEndpoints.split(path.sep)[0];
      if (subDirs.has(targetSubDir) && targetSubDir !== fileSubDir) {
        const line = content.slice(0, match.index).split('\n').length;
        violations.push({
          file: relFile,
          line,
          message: `imports from sibling endpoint '${targetSubDir}' — endpoints must not depend on each other`,
        });
      }
    }
  }

  return violations;
}
