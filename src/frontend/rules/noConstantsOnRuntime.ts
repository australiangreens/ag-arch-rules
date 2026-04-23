import { checkLayerDependency } from './layerDependency.js';
import type { ArchConfig, BaseRuleOptions, Violation } from '../../types.js';

export async function noConstantsOnRuntime(config: ArchConfig, options: BaseRuleOptions): Promise<Violation[]> {
  return (await Promise.all([
    checkLayerDependency(config, 'constants', 'apis', options),
    checkLayerDependency(config, 'constants', 'components', options),
    checkLayerDependency(config, 'constants', 'pages', options),
  ])).flat();
}
