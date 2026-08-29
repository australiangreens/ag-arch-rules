import * as fs from 'node:fs';
import * as path from 'node:path';
import { checkLayerDependency } from '../utils/layerDependency.js';
import { resolveLayerRoots } from '../utils/sliceRoots.js';
import type { ArchConfig, BaseRuleOptions, Violation } from '../../types.js';

const RUNTIME_LAYERS = [
  'apis', 'components', 'pages',         // frontend
  'endpoints', 'models', 'middlewares',   // backend
];

export async function noTypesOnRuntime(
  config: ArchConfig,
  options: BaseRuleOptions
): Promise<Violation[]> {
  const roots = resolveLayerRoots(config);
  const existingLayers = RUNTIME_LAYERS.filter(l =>
    roots.some(root => fs.existsSync(path.resolve(root, l)))
  );
  return (await Promise.all(
    existingLayers.map(layer => checkLayerDependency(config, 'types', layer, options))
  )).flat();
}
