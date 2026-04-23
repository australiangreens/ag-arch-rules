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

export type RuleConfig<O extends BaseRuleOptions = BaseRuleOptions> =
  | RuleSeverity
  | [RuleSeverity, O];

export type RulesConfig = {
  'no-apis-depend-on-components'?:          RuleConfig;
  'no-apis-depend-on-pages'?:               RuleConfig;
  'no-components-depend-on-pages'?:         RuleConfig;
  'no-hooks-depend-on-pages'?:              RuleConfig;
  'no-types-depend-on-runtime-layers'?:     RuleConfig;
  'no-constants-depend-on-runtime-layers'?: RuleConfig;
  'no-circular-dependencies'?:              RuleConfig;
  'require-barrel-exports'?:                RuleConfig;
  'require-path-alias'?:                    RuleConfig;
  'require-error-hierarchy'?:               RuleConfig<RequireErrorHierarchyOptions>;
  'errors-extend-ag-error'?:                RuleConfig;
  'require-test-type-suffix'?:              RuleConfig<RequireTestTypeSuffixOptions>;
  'require-hook-prefix'?:                   RuleConfig;
  'max-file-lines'?:                        RuleConfig<MaxFileLinesOptions>;
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
};

export type RuleImplementation = (
  config: ArchConfig,
  options: BaseRuleOptions
) => Promise<Violation[]>;
