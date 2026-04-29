import { projectFiles } from 'archunit';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { matchesAny } from '../../utils/glob.js';
import type { ArchConfig, BaseRuleOptions, Violation } from '../../types.js';

/**
 * Walk up from `startDir` until we find a tsconfig.json, returning its
 * absolute path, or undefined if we reach the filesystem root.
 */
function findTsConfig(startDir: string): string | undefined {
  let dir = path.resolve(startDir);
  while (true) {
    const candidate = path.join(dir, 'tsconfig.json');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) return undefined; // filesystem root
    dir = parent;
  }
}

export async function checkLayerDependency(
  config: ArchConfig,
  fromLayer: string,
  toLayer: string,
  options: BaseRuleOptions
): Promise<Violation[]> {
  // Resolve the tsconfig to use: explicit path > derived from config.root
  const tsConfigPath = config.tsConfigPath
    ? path.resolve(config.tsConfigPath)
    : findTsConfig(config.root);

  // The directory that archunit treats as project root (where tsconfig lives).
  // Paths in violation labels will be relative to this directory.
  const tsConfigDir = tsConfigPath ? path.dirname(tsConfigPath) : process.cwd();

  // Build patterns relative to tsConfigDir so they match archunit's labels.
  const rootAbs = path.resolve(config.root);
  const rootRelToTs = path.relative(tsConfigDir, rootAbs).replace(/\\/g, '/');

  const fromPattern = rootRelToTs + '/' + fromLayer + '/**';
  const toPattern   = rootRelToTs + '/' + toLayer + '/**';

  const rule = projectFiles(tsConfigPath)
    .inFolder(fromPattern)
    .shouldNot()
    .dependOnFiles()
    .inFolder(toPattern);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any[] = await rule.check({ allowEmptyTests: true });

  // Convert archunit-relative labels to CWD-relative paths.
  return raw
    .map(v => ({
      rel: path.join(tsConfigDir, v.dependency.sourceLabel).replace(/\\/g, '/'),
      to:  path.join(tsConfigDir, v.dependency.targetLabel).replace(/\\/g, '/'),
    }))
    .map(({ rel, to }) => ({
      rel: path.relative(process.cwd(), rel).replace(/\\/g, '/'),
      to:  path.relative(process.cwd(), to).replace(/\\/g, '/'),
    }))
    .filter(({ rel }) => !matchesAny(rel, options.except ?? []))
    // archunit violations expose only sourceLabel/targetLabel — no source line is available.
    // Investigated against archunit@2.x: cumulatedEdges carry {source,target,external,importKinds}
    // only. line is therefore omitted from these violations.
    .map(({ rel, to }) => ({
      file: rel,
      message: `imports from ${to}`,
    }));
}
