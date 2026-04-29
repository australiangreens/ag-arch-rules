import { checkLayerDependency } from '../../common/utils/layerDependency.js';
import type { ArchConfig, BaseRuleOptions, Violation } from '../../types.js';

export async function noMiddlewareDependsOnModels(
  config: ArchConfig,
  options: BaseRuleOptions
): Promise<Violation[]> {
  return checkLayerDependency(config, 'middlewares', 'models', options);
}
