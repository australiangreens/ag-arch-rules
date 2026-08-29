import { projectFiles } from 'archunit';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { matchesAny } from '../../utils/glob.js';
import { resolveLayerRoots } from './sliceRoots.js';
import type { ArchConfig, BaseRuleOptions, Violation } from '../../types.js';

function findTsConfig(startDir: string): string | undefined {
  let dir = path.resolve(startDir);
  while (true) {
    const candidate = path.join(dir, 'tsconfig.json');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

async function runLayerCheckInRoot(
  root: string,
  fromLayer: string,
  toLayer: string,
  tsConfigPath: string | undefined,
  tsConfigDir: string
): Promise<{ file: string; to: string }[]> {
  const rootAbs = path.resolve(root);
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

  return raw
    .map(v => ({
      file: path.join(tsConfigDir, v.dependency.sourceLabel).replace(/\\/g, '/'),
      to:   path.join(tsConfigDir, v.dependency.targetLabel).replace(/\\/g, '/'),
    }))
    .map(({ file, to }) => ({
      file: path.relative(process.cwd(), file).replace(/\\/g, '/'),
      to:   path.relative(process.cwd(), to).replace(/\\/g, '/'),
    }));
}

/**
 * Slice-aware layer check, returning raw {file, to} pairs with no
 * except-filtering or message formatting applied. Callers that need
 * more than checkLayerDependency's plain "imports from X" message
 * (e.g. filtering on the target path) should use this directly.
 */
export async function checkLayerDependencyRaw(
  config: ArchConfig,
  fromLayer: string,
  toLayer: string
): Promise<{ file: string; to: string }[]> {
  const tsConfigPath = config.tsConfigPath
    ? path.resolve(config.tsConfigPath)
    : findTsConfig(config.root);

  const tsConfigDir = tsConfigPath ? path.dirname(tsConfigPath) : process.cwd();

  const roots = resolveLayerRoots(config);
  const results = await Promise.all(
    roots.map(root => runLayerCheckInRoot(root, fromLayer, toLayer, tsConfigPath, tsConfigDir))
  );

  return results.flat();
}

export async function checkLayerDependency(
  config: ArchConfig,
  fromLayer: string,
  toLayer: string,
  options: BaseRuleOptions
): Promise<Violation[]> {
  const raw = await checkLayerDependencyRaw(config, fromLayer, toLayer);

  return raw
    .filter(({ file }) => !matchesAny(file, options.except ?? []))
    .map(({ file, to }) => ({
      file,
      message: `imports from ${to}`,
    }));
}
