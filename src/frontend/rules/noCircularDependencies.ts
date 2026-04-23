import { extractGraph } from 'archunit';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { matchesAny, toRelative } from '../../utils/glob.js';
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

/**
 * DFS-based cycle detection. Finds one representative cycle per back-edge — O(V+E).
 * Returns arrays of node labels forming each cycle.
 */
function findCycles(adj: Map<string, string[]>): string[][] {
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  const parent = new Map<string, string | undefined>();
  const cycles: string[][] = [];

  for (const node of adj.keys()) color.set(node, WHITE);

  function dfs(u: string): void {
    color.set(u, GRAY);
    for (const v of adj.get(u) ?? []) {
      if (!color.has(v)) continue; // node outside our subgraph
      if (color.get(v) === GRAY) {
        const cycle: string[] = [];
        let curr: string | undefined = u;
        while (curr !== undefined && curr !== v) {
          cycle.unshift(curr);
          curr = parent.get(curr);
        }
        cycle.unshift(v);
        cycles.push(cycle);
      } else if (color.get(v) === WHITE) {
        parent.set(v, u);
        dfs(v);
      }
    }
    color.set(u, BLACK);
  }

  for (const node of adj.keys()) {
    if (color.get(node) === WHITE) {
      parent.set(node, undefined);
      dfs(node);
    }
  }

  return cycles;
}

export async function noCircularDependencies(
  config: ArchConfig,
  options: BaseRuleOptions
): Promise<Violation[]> {
  const tsConfigPath = config.tsConfigPath
    ? path.resolve(config.tsConfigPath)
    : findTsConfig(config.root);

  const tsConfigDir = tsConfigPath ? path.dirname(tsConfigPath) : process.cwd();
  const rootAbs = path.resolve(config.root);
  const rootRelToTs = path.relative(tsConfigDir, rootAbs).replace(/\\/g, '/');
  const prefix = rootRelToTs ? rootRelToTs + '/' : '';

  const rawEdges = await extractGraph(tsConfigPath);

  const adj = new Map<string, string[]>();
  for (const edge of rawEdges) {
    if (edge.external) continue;
    if (prefix && (!edge.source.startsWith(prefix) || !edge.target.startsWith(prefix))) continue;
    if (!adj.has(edge.source)) adj.set(edge.source, []);
    if (!adj.has(edge.target)) adj.set(edge.target, []); // ensure every node is in the map
    adj.get(edge.source)!.push(edge.target);
  }

  const cycles = findCycles(adj);
  const violations: Violation[] = [];

  for (const cycle of cycles) {
    const cycleFiles = cycle.map(f => toRelative(path.join(tsConfigDir, f)));
    if (cycleFiles.some(f => matchesAny(f, options.except ?? []))) continue;
    violations.push({
      file: cycleFiles[0],
      message: `part of circular dependency cycle: ${cycleFiles.join(' → ')} → ${cycleFiles[0]}`,
    });
  }

  return violations;
}
