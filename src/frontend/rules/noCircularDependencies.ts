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

export async function noCircularDependencies(
  config: ArchConfig,
  options: BaseRuleOptions
): Promise<Violation[]> {
  // Resolve the tsconfig to use: explicit path > derived from config.root
  const tsConfigPath = config.tsConfigPath
    ? path.resolve(config.tsConfigPath)
    : findTsConfig(config.root);

  // The directory that archunit treats as project root (where tsconfig lives).
  // Paths in violation labels will be relative to this directory.
  const tsConfigDir = tsConfigPath ? path.dirname(tsConfigPath) : process.cwd();

  // Build pattern relative to tsConfigDir so it matches archunit's labels.
  const rootAbs = path.resolve(config.root);
  const rootRelToTs = path.relative(tsConfigDir, rootAbs).replace(/\\/g, '/');
  const srcPattern = rootRelToTs + '/**';

  const rule = projectFiles(tsConfigPath)
    .inFolder(srcPattern)
    .should()
    .haveNoCycles();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any[] = await rule.check({ allowEmptyTests: true });

  return raw
    .map(v => {
      const sourceLabel = v.cycle[0].sourceLabel;
      const targetLabel = v.cycle[0].targetLabel;
      const relFile = path
        .relative(process.cwd(), path.join(tsConfigDir, sourceLabel))
        .replace(/\\/g, '/');
      const relTarget = path
        .relative(process.cwd(), path.join(tsConfigDir, targetLabel))
        .replace(/\\/g, '/');
      return { rel: relFile, to: relTarget };
    })
    .filter(({ rel }) => !matchesAny(rel, options.except ?? []))
    .map(({ rel, to }) => ({
      file: rel,
      message: `part of circular dependency cycle with ${to}`,
    }));
}
