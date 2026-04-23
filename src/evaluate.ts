import type { ArchConfig, BaseRuleOptions, RuleImplementation, Violation } from './types.js';
import { noApisOnComponents }    from './frontend/rules/noApisOnComponents.js';
import { noApisOnPages }         from './frontend/rules/noApisOnPages.js';
import { noComponentsOnPages }   from './frontend/rules/noComponentsOnPages.js';
import { noHooksOnPages }        from './frontend/rules/noHooksOnPages.js';
import { noTypesOnRuntime }      from './frontend/rules/noTypesOnRuntime.js';
import { noConstantsOnRuntime }  from './frontend/rules/noConstantsOnRuntime.js';
import { noCircularDependencies }  from './frontend/rules/noCircularDependencies.js';
import { requireBarrelExports }  from './frontend/rules/requireBarrelExports.js';
import { requirePathAlias }      from './frontend/rules/requirePathAlias.js';
import { requireErrorHierarchy } from './frontend/rules/requireErrorHierarchy.js';
import { errorsExtendAgError }   from './frontend/rules/errorsExtendAgError.js';
import { requireTestTypeSuffix } from './frontend/rules/requireTestTypeSuffix.js';
import { requireHookPrefix }     from './frontend/rules/requireHookPrefix.js';
import { maxFileLines }          from './frontend/rules/maxFileLines.js';

const RULES: Record<string, RuleImplementation> = {
  'no-apis-depend-on-components':          noApisOnComponents,
  'no-apis-depend-on-pages':               noApisOnPages,
  'no-components-depend-on-pages':         noComponentsOnPages,
  'no-hooks-depend-on-pages':              noHooksOnPages,
  'no-types-depend-on-runtime-layers':     noTypesOnRuntime,
  'no-constants-depend-on-runtime-layers': noConstantsOnRuntime,
  'no-circular-dependencies':              noCircularDependencies,
  'require-barrel-exports':                requireBarrelExports,
  'require-path-alias':                    requirePathAlias,
  'require-error-hierarchy':               requireErrorHierarchy,
  'errors-extend-ag-error':                errorsExtendAgError,
  'require-test-type-suffix':              requireTestTypeSuffix,
  'require-hook-prefix':                   requireHookPrefix,
  'max-file-lines':                        maxFileLines,
};

export async function evaluate(
  name: string,
  config: ArchConfig,
  options: BaseRuleOptions
): Promise<Violation[]> {
  const impl = RULES[name];
  if (!impl) throw new Error(`Unknown rule: '${name}'`);
  return impl(config, options);
}
