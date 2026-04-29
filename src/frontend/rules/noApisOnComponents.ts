import { checkLayerDependency } from '../../common/utils/layerDependency.js';
import type { ArchConfig, BaseRuleOptions, Violation } from '../../types.js';

export async function noApisOnComponents(config: ArchConfig, options: BaseRuleOptions): Promise<Violation[]> {
  return checkLayerDependency(config, 'apis', 'components', options);
}
