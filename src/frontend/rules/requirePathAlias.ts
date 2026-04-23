import * as fs from 'node:fs';
import { findFiles, matchesAny, toRelative } from '../../utils/glob.js';
import type { ArchConfig, BaseRuleOptions, Violation } from '../../types.js';

const IMPORT_RE = /(?:^|\n)\s*(?:import|export)\s+(?:.*?\s+from\s+)?['"]([^'"]+)['"]/g;

export async function requirePathAlias(
  config: ArchConfig,
  options: BaseRuleOptions
): Promise<Violation[]> {
  const pattern = config.root.replace(/\\/g, '/') + '/**/*.{ts,tsx}';
  const files = await findFiles(pattern);
  const violations: Violation[] = [];

  for (const file of files) {
    const relFile = toRelative(file);
    if (matchesAny(relFile, options.except ?? [])) continue;

    const content = fs.readFileSync(file, 'utf8');
    IMPORT_RE.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = IMPORT_RE.exec(content)) !== null) {
      if (match[1].startsWith('..')) {
        violations.push({
          file: relFile,
          message: `uses relative cross-directory import '${match[1]}' — use @/ alias instead`,
        });
        break;
      }
    }
  }

  return violations;
}
