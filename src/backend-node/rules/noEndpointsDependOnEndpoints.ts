import * as fs from 'node:fs';
import * as path from 'node:path';
import { findFiles, matchesAny, toRelative } from '../../utils/glob.js';
import type {
  ArchConfig,
  NoEndpointsDependOnEndpointsOptions,
  Violation,
} from '../../types.js';

const IMPORT_SPECIFIER_RE =
  /(?:import|export)\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|require\(\s*['"]([^'"]+)['"]\s*\)/gm;

function featureKey(
  endpointsDir: string,
  targetPath: string,
  depth: number
): string | undefined {
  const rel = path.relative(endpointsDir, targetPath);
  if (rel.startsWith('..')) return undefined;
  const parts = rel.split(path.sep).filter(Boolean);
  if (parts.length < depth) return undefined;
  return parts.slice(0, depth).join('/');
}

function resolveToAbsolute(
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

export async function noEndpointsDependOnEndpoints(
  config: ArchConfig,
  options: NoEndpointsDependOnEndpointsOptions
): Promise<Violation[]> {
  const endpointsDir = path.resolve(config.root, 'endpoints');
  if (!fs.existsSync(endpointsDir)) return [];

  const featureRootDepth = Math.max(1, options.featureRootDepth ?? 1);
  const allowIntraFeature = options.allowIntraFeature ?? true;
  const aliases = options.pathAliases ?? ['@/'];
  const allowTargetGlobs = options.allowTargetGlobs ?? [];

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
    const fileFeature = featureKey(endpointsDir, path.dirname(file), featureRootDepth);
    if (!fileFeature) continue;

    IMPORT_SPECIFIER_RE.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = IMPORT_SPECIFIER_RE.exec(content)) !== null) {
      const importPath = match[1] ?? match[2] ?? match[3];
      if (!importPath) continue;
      const resolved = resolveToAbsolute(importPath, file, path.resolve(config.root), aliases);
      if (!resolved) continue;

      const relToEndpoints = path.relative(endpointsDir, resolved);

      if (relToEndpoints.startsWith('..')) continue;
      const targetRel = toRelative(resolved);
      if (allowTargetGlobs.length > 0 && matchesAny(targetRel, allowTargetGlobs)) continue;

      const targetSubDir = relToEndpoints.split(path.sep)[0];
      if (!subDirs.has(targetSubDir)) continue;
      const targetFeature = featureKey(endpointsDir, resolved, featureRootDepth);
      if (!targetFeature) continue;

      if (!allowIntraFeature || targetFeature !== fileFeature) {
        const line = content.slice(0, match.index).split('\n').length;
        violations.push({
          file: relFile,
          line,
          message: `cross-feature endpoint import '${targetFeature}' from feature '${fileFeature}' is not allowed`,
        });
      }
    }
  }

  return violations;
}
