import * as fs from 'node:fs';
import * as path from 'node:path';
import { findFiles, matchesAny, toRelative } from '../../utils/glob.js';
import type { ArchConfig, CrossSliceImportOptions, Violation } from '../../types.js';

export const IMPORT_SPECIFIER_RE =
  /(?:import|export)\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|require\(\s*['"]([^'"]+)['"]\s*\)/gm;

function featureKey(
  sliceDirAbs: string,
  targetPath: string,
  depth: number
): string | undefined {
  const rel = path.relative(sliceDirAbs, targetPath);
  if (rel.startsWith('..')) return undefined;
  const parts = rel.split(path.sep).filter(Boolean);
  if (parts.length < depth) return undefined;
  return parts.slice(0, depth).join('/');
}

export function resolveToAbsolute(
  importPath: string,
  sourceFile: string,
  configRoot: string,
  aliases: string[]
): string | undefined {
  if (importPath.startsWith('.')) return path.resolve(path.dirname(sourceFile), importPath);

  for (const alias of aliases) {
    if (!alias) continue;
    if (importPath === alias || importPath.startsWith(alias)) {
      const withoutAlias = importPath.slice(alias.length).replace(/^\/+/, '');
      return path.resolve(configRoot, withoutAlias);
    }
  }

  if (importPath.startsWith('src/')) {
    return path.resolve(configRoot, importPath.slice('src/'.length));
  }

  return undefined;
}

export async function checkCrossSliceImports(
  config: ArchConfig,
  options: CrossSliceImportOptions & { sliceDir: string }
): Promise<Violation[]> {
  const sliceDirAbs = path.resolve(config.root, options.sliceDir);
  if (!fs.existsSync(sliceDirAbs)) return [];

  const featureRootDepth = Math.max(1, options.featureRootDepth ?? 1);
  const allowIntraFeature = options.allowIntraFeature ?? true;
  const aliases = options.pathAliases ?? ['@/'];
  const allowTargetGlobs = options.allowTargetGlobs ?? [];

  const entries = fs.readdirSync(sliceDirAbs, { withFileTypes: true });
  const subDirs = new Set(entries.filter(e => e.isDirectory()).map(e => e.name));

  const pattern = path.posix.join(sliceDirAbs.replace(/\\/g, '/'), '**/*.{ts,tsx}');
  const files = await findFiles(pattern);
  const violations: Violation[] = [];

  for (const file of files) {
    // Skip files at the root sliceDir level (the aggregator barrel and its siblings)
    if (path.dirname(file) === sliceDirAbs) continue;

    const relFile = toRelative(file);
    if (matchesAny(relFile, options.except ?? [])) continue;

    const content = fs.readFileSync(file, 'utf8');
    const fileFeature = featureKey(sliceDirAbs, path.dirname(file), featureRootDepth);
    if (!fileFeature) continue;

    IMPORT_SPECIFIER_RE.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = IMPORT_SPECIFIER_RE.exec(content)) !== null) {
      const importPath = match[1] ?? match[2] ?? match[3];
      if (!importPath) continue;
      const resolved = resolveToAbsolute(importPath, file, path.resolve(config.root), aliases);
      if (!resolved) continue;

      const relToSliceDir = path.relative(sliceDirAbs, resolved);

      if (relToSliceDir.startsWith('..')) continue;
      const targetRel = toRelative(resolved);
      if (allowTargetGlobs.length > 0 && matchesAny(targetRel, allowTargetGlobs)) continue;

      const targetSubDir = relToSliceDir.split(path.sep)[0];
      if (!subDirs.has(targetSubDir)) continue;
      const targetFeature = featureKey(sliceDirAbs, resolved, featureRootDepth);
      if (!targetFeature) continue;

      if (!allowIntraFeature || targetFeature !== fileFeature) {
        const line = content.slice(0, match.index).split('\n').length;
        violations.push({
          file: relFile,
          line,
          message: `cross-slice import '${targetFeature}' from '${fileFeature}' is not allowed`,
        });
      }
    }
  }

  return violations;
}
