import * as fs from 'node:fs';
import * as path from 'node:path';
import { findFiles, matchesAny, toRelative } from '../../utils/glob.js';
import type {
  ArchConfig,
  RestrictDbClientToApprovedZonesOptions,
  Violation,
} from '../../types.js';

const IMPORT_SPECIFIER_RE =
  /(?:import|export)\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|require\(\s*['"]([^'"]+)['"]\s*\)/gm;

function isDbSpecifier(specifier: string, options: RestrictDbClientToApprovedZonesOptions): boolean {
  const specifiers = options.dbModuleSpecifiers ?? ['knex', 'knexClient'];
  const regexes = (options.dbSpecifierRegexes ?? []).map(value => new RegExp(value));

  if (specifiers.some(s => s === specifier)) return true;
  if (specifiers.some(s => s !== 'knex' && specifier.endsWith('/' + s))) return true;
  if (regexes.some(re => re.test(specifier))) return true;
  return false;
}

export async function restrictDbClientToApprovedZones(
  config: ArchConfig,
  options: RestrictDbClientToApprovedZonesOptions
): Promise<Violation[]> {
  const rootDir = path.resolve(config.root);
  if (!fs.existsSync(rootDir)) return [];

  const allowedImporterGlobs = options.allowedImporterGlobs ?? ['**/models/db/**/*.ts'];
  const includeRequire = options.includeRequire ?? true;

  const patterns = [
    path.posix.join(rootDir.replace(/\\/g, '/'), '**/*.ts'),
    path.posix.join(rootDir.replace(/\\/g, '/'), '**/*.tsx'),
  ];
  const files = (await Promise.all(patterns.map(pattern => findFiles(pattern)))).flat();
  const violations: Violation[] = [];

  for (const file of files) {
    const relFile = toRelative(file);
    if (matchesAny(relFile, options.except ?? [])) continue;

    const content = fs.readFileSync(file, 'utf8');
    IMPORT_SPECIFIER_RE.lastIndex = 0;

    let hasDbImport = false;
    let match: RegExpExecArray | null;
    while ((match = IMPORT_SPECIFIER_RE.exec(content)) !== null) {
      const specifier = match[1] ?? match[2] ?? match[3];
      const isRequireMatch = Boolean(match[3]);
      if (!specifier) continue;
      if (!includeRequire && isRequireMatch) continue;
      if (isDbSpecifier(specifier, options)) {
        hasDbImport = true;
        break;
      }
    }

    if (!hasDbImport) continue;
    if (matchesAny(relFile, allowedImporterGlobs)) continue;

    violations.push({
      file: relFile,
      message:
        'imports DB client module outside approved zones — move access into approved data-access paths',
    });
  }

  return violations;
}
