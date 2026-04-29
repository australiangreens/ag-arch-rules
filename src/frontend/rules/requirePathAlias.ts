import * as fs from 'node:fs';
import { findFiles, matchesAny, toRelative } from '../../utils/glob.js';
import type { ArchConfig, BaseRuleOptions, Violation } from '../../types.js';

const RELATIVE_IMPORT_RE = /from\s+['"](\.\.\/[^'"]+)['"]/gm;

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
    RELATIVE_IMPORT_RE.lastIndex = 0;
    const match = RELATIVE_IMPORT_RE.exec(content);
    if (match) {
      const line = content.slice(0, match.index).split('\n').length;
      violations.push({
        file: relFile,
        line,
        message: `uses relative cross-directory import '${match[1]}' — use @/ alias instead`,
      });
    }
  }

  return violations;
}
