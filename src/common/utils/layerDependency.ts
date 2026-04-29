import { projectFiles } from 'archunit';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { matchesAny } from '../../utils/glob.js';
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

export async function checkLayerDependency(
  config: ArchConfig,
  fromLayer: string,
  toLayer: string,
  options: BaseRuleOptions
): Promise<Violation[]> {
  const tsConfigPath = config.tsConfigPath
    ? path.resolve(config.tsConfigPath)
    : findTsConfig(config.root);

  const tsConfigDir = tsConfigPath ? path.dirname(tsConfigPath) : process.cwd();

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
    .map(({ rel, to }) => ({
      file: rel,
      message: `imports from ${to}`,
    }));
}
