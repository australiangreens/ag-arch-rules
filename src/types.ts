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
  'no-endpoints-depend-on-endpoints'?:      RuleConfig;
  'no-models-depend-on-endpoints'?:         RuleConfig;
  'no-middleware-depends-on-models'?:       RuleConfig;
  'require-validation-schema'?:             RuleConfig;
  'no-direct-db-client-in-endpoints'?:      RuleConfig;
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
