import { checkLayerDependency } from './layerDependency.js';
import type { ArchConfig, BaseRuleOptions, Violation } from '../../types.js';

export async function noHooksOnPages(config: ArchConfig, options: BaseRuleOptions): Promise<Violation[]> {
  return checkLayerDependency(config, 'hooks', 'pages', options);
}
