export type RuleSeverity = 'error' | 'warn' | 'off';

export type BaseRuleOptions = {
  except?: string[];
};

export type RequireErrorHierarchyOptions = BaseRuleOptions & {
  rootErrorClass?: string;
};

export type MaxFileLinesOptions = BaseRuleOptions & {
  tsx?: number;
  ts?: number;
};

export type RequireTestTypeSuffixOptions = BaseRuleOptions & {
  allowedSuffixes?: string[];
};

export type RequireBarrelExportsOptions = BaseRuleOptions & {
  /** Directories (relative to config.root) whose immediate subdirectories must each have an index.ts barrel.
   *  Defaults to ['components'] when not specified. */
  directories?: string[];
};

export type NoEndpointsDependOnEndpointsOptions = BaseRuleOptions & {
  /** Number of path segments under endpoints/ used to define a "feature". Default: 1 */
  featureRootDepth?: number;
  /** Path aliases that resolve to config.root (for example ['@/', 'src/']). */
  pathAliases?: string[];
  /** When true, imports within the same feature are allowed. Default: true */
  allowIntraFeature?: boolean;
  /** CWD-relative target path globs that are always allowed. */
  allowTargetGlobs?: string[];
};

export type NoMiddlewareDependsOnModelsOptions = BaseRuleOptions & {
  /** Report only dependencies matching these target globs (CWD-relative). */
  forbiddenModelGlobs?: string[];
  /** Ignore dependencies matching these target globs (CWD-relative). */
  allowedModelGlobs?: string[];
};

export type RestrictDbClientToApprovedZonesOptions = BaseRuleOptions & {
  /** CWD-relative globs allowed to import DB client modules. */
  allowedImporterGlobs?: string[];
  /** Module specifiers treated as DB clients. */
  dbModuleSpecifiers?: string[];
  /** Additional regex patterns (as strings) matched against import specifier text. */
  dbSpecifierRegexes?: string[];
  /** Check CommonJS require() calls as well as import/export statements. Default: true */
  includeRequire?: boolean;
};

export type RuleConfig<O extends BaseRuleOptions = BaseRuleOptions> =
  | RuleSeverity
  | [RuleSeverity, O];

export type RulesConfig = {
  // Common rules (frontend + backend)
  'no-circular-dependencies'?:              RuleConfig;
  'no-types-depend-on-runtime-layers'?:     RuleConfig;
  'no-constants-depend-on-runtime-layers'?: RuleConfig;
  'require-barrel-exports'?:                RuleConfig<RequireBarrelExportsOptions>;
  'require-error-hierarchy'?:               RuleConfig<RequireErrorHierarchyOptions>;
  'errors-extend-ag-error'?:                RuleConfig;
  'require-test-type-suffix'?:              RuleConfig<RequireTestTypeSuffixOptions>;
  'max-file-lines'?:                        RuleConfig<MaxFileLinesOptions>;

  // Frontend-only rules
  'no-apis-depend-on-components'?:          RuleConfig;
  'no-apis-depend-on-pages'?:               RuleConfig;
  'no-components-depend-on-pages'?:         RuleConfig;
  'no-hooks-depend-on-pages'?:              RuleConfig;
  'require-path-alias'?:                    RuleConfig;
  'require-hook-prefix'?:                   RuleConfig;

  // Backend Node rules
  'no-endpoints-depend-on-endpoints'?:      RuleConfig<NoEndpointsDependOnEndpointsOptions>;
  'no-models-depend-on-endpoints'?:         RuleConfig;
  'no-middleware-depends-on-models'?:       RuleConfig<NoMiddlewareDependsOnModelsOptions>;
  'require-validation-schema'?:             RuleConfig;
  'restrict-db-client-to-approved-zones'?:  RuleConfig<RestrictDbClientToApprovedZonesOptions>;
};

export type ArchConfig = {
  root: string;
  tsConfigPath?: string;
  /** CWD-relative globs identifying test files. Defaults to DEFAULT_TEST_FILE_GLOBS. */
  testFiles?: string[];
  mode: 'report' | 'enforce';
  rules: RulesConfig;
};

export type Violation = {
  file: string;
  message: string;
  line?: number;
};

export type RuleResult = {
  rule: string;
  severity: RuleSeverity;
  violations: Violation[];
};

export type JsonViolationRecord = {
  rule: string;
  severity: RuleSeverity;
  file: string;
  line?: number;
  message: string;
};

export type RuleImplementation = (
  config: ArchConfig,
  options: BaseRuleOptions
) => Promise<Violation[]>;
