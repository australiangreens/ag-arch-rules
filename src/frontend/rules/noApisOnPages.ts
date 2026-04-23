import { checkLayerDependency } from './layerDependency.js';
import type { ArchConfig, BaseRuleOptions, Violation } from '../../types.js';

export async function noApisOnPages(config: ArchConfig, options: BaseRuleOptions): Promise<Violation[]> {
  return checkLayerDependency(config, 'apis', 'pages', options);
}
