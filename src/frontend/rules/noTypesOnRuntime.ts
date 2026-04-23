import { checkLayerDependency } from './layerDependency.js';
import type { ArchConfig, BaseRuleOptions, Violation } from '../../types.js';

export async function noTypesOnRuntime(config: ArchConfig, options: BaseRuleOptions): Promise<Violation[]> {
  return (await Promise.all([
    checkLayerDependency(config, 'types', 'apis', options),
    checkLayerDependency(config, 'types', 'components', options),
    checkLayerDependency(config, 'types', 'pages', options),
  ])).flat();
}
