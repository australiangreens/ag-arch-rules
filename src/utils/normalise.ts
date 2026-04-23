import type { RuleConfig, RuleSeverity, BaseRuleOptions } from '../types.js';

export function normalise<O extends BaseRuleOptions>(
  config: RuleConfig<O>
): [RuleSeverity, O] {
  if (Array.isArray(config)) {
    return config as [RuleSeverity, O];
  }
  return [config, {} as O];
}
