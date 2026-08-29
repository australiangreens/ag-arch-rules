import * as fs from 'node:fs';
import * as path from 'node:path';
import { findFiles, matchesAny, toRelative } from '../../utils/glob.js';
import { IMPORT_SPECIFIER_RE, resolveToAbsolute } from '../../common/utils/crossSliceImports.js';
import type { ArchConfig, RequireFeaturePublicEntryOptions, Violation } from '../../types.js';

function stripExt(p: string): string {
  return p.replace(/\.(ts|tsx|js|jsx)$/, '');
}

export async function requireFeaturePublicEntry(
  config: ArchConfig,
  options: RequireFeaturePublicEntryOptions
): Promise<Violation[]> {
  const sliceDirs = options.sliceDirs ?? config.sliceDirs ?? ['features'];
  const entryFiles = options.entryFiles ?? ['index.ts', 'index.tsx'];
  const aliases = options.pathAliases ?? ['@/'];

  // One feature root per immediate subdirectory of each configured sliceDir.
  const featureRoots: string[] = [];
  for (const sliceDir of sliceDirs) {
    const sliceDirAbs = path.resolve(config.root, sliceDir);
    if (!fs.existsSync(sliceDirAbs)) continue;

    const entries = fs.readdirSync(sliceDirAbs, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) featureRoots.push(path.join(sliceDirAbs, entry.name));
    }
  }
  if (featureRoots.length === 0) return [];

  // Scan the whole project — violations come from code outside a
  // feature reaching into it, which could be anywhere.
  const pattern = path.posix.join(path.resolve(config.root).replace(/\\/g, '/'), '**/*.{ts,tsx}');
  const files = await findFiles(pattern);
  const violations: Violation[] = [];

  for (const file of files) {
    const relFile = toRelative(file);
    if (matchesAny(relFile, options.except ?? [])) continue;

    const content = fs.readFileSync(file, 'utf8');

    IMPORT_SPECIFIER_RE.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = IMPORT_SPECIFIER_RE.exec(content)) !== null) {
      const importPath = match[1] ?? match[2] ?? match[3];
      if (!importPath) continue;
      const resolved = resolveToAbsolute(importPath, file, path.resolve(config.root), aliases);
      if (!resolved) continue;

      for (const featureAbs of featureRoots) {
        const relToFeature = path.relative(featureAbs, resolved);
        if (relToFeature.startsWith('..')) continue; // import doesn't land in this feature

        const sourceRelToFeature = path.relative(featureAbs, file);
        if (!sourceRelToFeature.startsWith('..')) break; // source is inside the feature itself — fine

        const isBareDirImport = resolved === featureAbs;
        const isEntryFile = entryFiles.some(
          ef => stripExt(resolved) === stripExt(path.join(featureAbs, ef))
        );

        if (!isBareDirImport && !isEntryFile) {
          const line = content.slice(0, match.index).split('\n').length;
          violations.push({
            file: relFile,
            line,
            message: `import '${toRelative(resolved)}' reaches into a feature's internals — import from its public entry instead`,
          });
        }
        break; // matched a feature root, no need to check the rest
      }
    }
  }

  return violations;
}
