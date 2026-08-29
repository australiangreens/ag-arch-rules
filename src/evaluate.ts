import type { ArchConfig, BaseRuleOptions, RuleImplementation, Violation } from './types.js';

// Common rules
import { noCircularDependencies }    from './common/rules/noCircularDependencies.js';
import { noTypesOnRuntime }          from './common/rules/noTypesOnRuntime.js';
import { noConstantsOnRuntime }      from './common/rules/noConstantsOnRuntime.js';
import { requireBarrelExports }      from './common/rules/requireBarrelExports.js';
import { requireErrorHierarchy }     from './common/rules/requireErrorHierarchy.js';
import { errorsExtendAgError }       from './common/rules/errorsExtendAgError.js';
import { requireTestTypeSuffix }     from './common/rules/requireTestTypeSuffix.js';
import { maxFileLines }              from './common/rules/maxFileLines.js';

// Frontend rules
import { noApisOnComponents }        from './frontend/rules/noApisOnComponents.js';
import { noApisOnPages }             from './frontend/rules/noApisOnPages.js';
import { noComponentsOnPages }       from './frontend/rules/noComponentsOnPages.js';
import { noHooksOnPages }            from './frontend/rules/noHooksOnPages.js';
import { requirePathAlias }          from './frontend/rules/requirePathAlias.js';
import { requireHookPrefix }         from './frontend/rules/requireHookPrefix.js';
import { noCrossFeatureImports }     from './frontend/rules/noCrossFeatureImports.js';

// Backend Node rules
import { noEndpointsDependOnEndpoints } from './backend-node/rules/noEndpointsDependOnEndpoints.js';
import { noModelsDependOnEndpoints }    from './backend-node/rules/noModelsDependOnEndpoints.js';
import { noMiddlewareDependsOnModels }  from './backend-node/rules/noMiddlewareDependsOnModels.js';
import { requireValidationSchema }      from './backend-node/rules/requireValidationSchema.js';
import { restrictDbClientToApprovedZones } from './backend-node/rules/restrictDbClientToApprovedZones.js';

// CDK rules
import { requireCustomNodejsConstruct } from './cdk/rules/requireCustomNodejsConstruct.js';
import { requireNodeRuntime22 }         from './cdk/rules/requireNodeRuntime22.js';
import { requireEsbuildSourceMaps }     from './cdk/rules/requireEsbuildSourceMaps.js';
import { requirePayPerRequestBilling }  from './cdk/rules/requirePayPerRequestBilling.js';
import { requireDynamoRemovalPolicy }   from './cdk/rules/requireDynamoRemovalPolicy.js';
import { noHardcodedSecretValues }      from './cdk/rules/noHardcodedSecretValues.js';
import { requireSecretsManagerGrants }  from './cdk/rules/requireSecretsManagerGrants.js';
import { requireApiAuthentication }     from './cdk/rules/requireApiAuthentication.js';
import { noLambdaImportsFromInfra }     from './cdk/rules/noLambdaImportsFromInfra.js';
import { requireLambdaHandlerExport }   from './cdk/rules/requireLambdaHandlerExport.js';
import { requireCdkJson }               from './cdk/rules/requireCdkJson.js';
import { requireBinDirectory }          from './cdk/rules/requireBinDirectory.js';
import { requireInfraDirectory }        from './cdk/rules/requireInfraDirectory.js';
import { requireEnvLocalExample }       from './cdk/rules/requireEnvLocalExample.js';

const RULES: Record<string, RuleImplementation> = {
  // Common
  'no-circular-dependencies':              noCircularDependencies,
  'no-types-depend-on-runtime-layers':     noTypesOnRuntime,
  'no-constants-depend-on-runtime-layers': noConstantsOnRuntime,
  'require-barrel-exports':                requireBarrelExports,
  'require-error-hierarchy':               requireErrorHierarchy,
  'errors-extend-ag-error':                errorsExtendAgError,
  'require-test-type-suffix':              requireTestTypeSuffix,
  'max-file-lines':                        maxFileLines,
  // Frontend
  'no-apis-depend-on-components':          noApisOnComponents,
  'no-apis-depend-on-pages':               noApisOnPages,
  'no-components-depend-on-pages':         noComponentsOnPages,
  'no-hooks-depend-on-pages':              noHooksOnPages,
  'require-path-alias':                    requirePathAlias,
  'require-hook-prefix':                   requireHookPrefix,
  'no-cross-feature-imports':              noCrossFeatureImports,
  // Backend Node
  'no-endpoints-depend-on-endpoints':      noEndpointsDependOnEndpoints,
  'no-models-depend-on-endpoints':         noModelsDependOnEndpoints,
  'no-middleware-depends-on-models':       noMiddlewareDependsOnModels,
  'require-validation-schema':             requireValidationSchema,
  'restrict-db-client-to-approved-zones':  restrictDbClientToApprovedZones,
  // CDK
  'require-custom-nodejs-construct':       requireCustomNodejsConstruct,
  'require-node-runtime-22':              requireNodeRuntime22,
  'require-esbuild-source-maps':          requireEsbuildSourceMaps,
  'require-pay-per-request-billing':      requirePayPerRequestBilling,
  'require-dynamo-removal-policy':        requireDynamoRemovalPolicy,
  'no-hardcoded-secret-values':           noHardcodedSecretValues,
  'require-secrets-manager-grants':       requireSecretsManagerGrants,
  'require-api-authentication':           requireApiAuthentication,
  'no-lambda-imports-from-infra':         noLambdaImportsFromInfra,
  'require-lambda-handler-export':        requireLambdaHandlerExport,
  'require-cdk-json':                     requireCdkJson,
  'require-bin-directory':               requireBinDirectory,
  'require-infra-directory':             requireInfraDirectory,
  'require-env-local-example':           requireEnvLocalExample,
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
