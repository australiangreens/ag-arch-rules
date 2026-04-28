import madge from 'madge';
import * as path from 'node:path';
import { matchesAny, toRelative } from '../../utils/glob.js';
import type { ArchConfig, BaseRuleOptions, Violation } from '../../types.js';

export async function noCircularDependencies(
  config: ArchConfig,
  options: BaseRuleOptions
): Promise<Violation[]> {
  const rootAbs = path.resolve(config.root);

  const result = await madge(rootAbs, {
    fileExtensions: ['ts', 'tsx'],
    tsConfig: config.tsConfigPath,
  });

  const cycles: string[][] = result.circular();
  const violations: Violation[] = [];

  for (const cycle of cycles) {
    const cycleFiles = cycle.map(f =>
      toRelative(path.join(rootAbs, f))
    );
    if (cycleFiles.some(f => matchesAny(f, options.except ?? []))) continue;
    violations.push({
      file: cycleFiles[0],
      message: `part of circular dependency cycle: ${cycleFiles.join(' → ')}`,
    });
  }

  return violations;
}
