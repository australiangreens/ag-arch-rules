# Design Spec: `@australiangreens/ag-arch-rules`

**Date:** 2026-04-23
**Status:** Draft — pending implementation plan

---

## 1. Goal

Provide a single shared npm package that encodes agreed architectural conventions for
Australian Greens TypeScript projects. The package uses named exports so consuming projects
import only what they need. The initial ruleset targets TypeScript frontend applications;
the package is designed to accommodate additional rulesets (backend-express, cdk, etc.) as
named exports over time.

---

## 2. Package Identity

| Field | Value |
|---|---|
| Name | `@australiangreens/ag-arch-rules` |
| Registry | GitHub Packages (`https://npm.pkg.github.com`) |
| Type | ESM-only TypeScript package |
| Versioning | Semver; breaking rule changes (removed rules, tightened defaults) are major bumps |

Consuming projects import by name, destructuring only what they use:

```ts
import { agFrontendPreset, defineArchConfig, runArchRules }
  from '@australiangreens/ag-arch-rules';
```

Future rulesets are added as additional named exports:

```ts
import { agBackendExpressPreset, defineArchConfig, runArchRules }
  from '@australiangreens/ag-arch-rules';
```

---

## 3. Rule Catalogue

Fourteen rules for the frontend ruleset in three tiers. All included in `agFrontendPreset`.

### Tier 1 — Layer dependency rules

All default to `'error'`. Implemented using `archunit`.

| Rule | What it checks |
|---|---|
| `no-apis-depend-on-components` | `src/apis/**` must not import from `src/components/**` |
| `no-apis-depend-on-pages` | `src/apis/**` must not import from `src/pages/**` |
| `no-components-depend-on-pages` | `src/components/**` must not import from `src/pages/**` |
| `no-hooks-depend-on-pages` | `src/hooks/**` must not import from `src/pages/**` |
| `no-types-depend-on-runtime-layers` | `src/types/**` must not import from `src/apis/**`, `src/components/**`, or `src/pages/**` |
| `no-constants-depend-on-runtime-layers` | `src/constants/**` must not import from `src/apis/**`, `src/components/**`, or `src/pages/**` |
| `no-circular-dependencies` | No circular import chains within `src/**` |

**Allowed direction:** `src/pages/**` importing from `src/apis/**` is explicitly permitted —
this is the normal data-fetching pattern across all existing projects.

### Tier 2 — Structural convention rules

| Rule | Default severity | What it checks |
|---|---|---|
| `require-barrel-exports` | `'warn'` | Every directory directly under `src/components/` must contain `index.ts` or `index.tsx` |
| `require-path-alias` | `'warn'` | Cross-directory imports must use `@/` rather than `../../` relative paths |
| `require-error-hierarchy` | `'error'` | Every file in `src/errors/**` (except the root class and `index.ts`) must import from another `src/errors/**` file — proxy for "extends the hierarchy". Auto-detects the root class (the single file that imports from `@australiangreens/ag-error` but not from another `src/errors/**` file); accepts optional `rootErrorClass` override. Emits a descriptive config error if auto-detection finds zero or multiple candidates. |
| `errors-extend-ag-error` | `'error'` | The root class file in `src/errors/**` must import from `@australiangreens/ag-error` — proxy for "extends AgError". |

### Tier 3 — Naming and metric rules

| Rule | Default severity | What it checks |
|---|---|---|
| `require-test-type-suffix` | `'warn'` | Test files must be named `*.unit.test.*`, `*.comp.test.*`, or `*.int.test.*`. Configurable via `allowedSuffixes`. |
| `require-hook-prefix` | `'warn'` | Files under `src/hooks/**` must have names beginning with `use`. |
| `max-file-lines` | `'warn'` | Non-test source files must not exceed configurable line limits. Defaults: `{ tsx: 400, ts: 300 }`. Test files (`*.test.*`, `*.spec.*`) are excluded. |

**Rationale for `max-file-lines` defaults:** Across the three existing projects, Q3 for
production `.tsx` files is ~155–179 lines and Q3 for `.ts` is ~66–135 lines. The 400/300
limits sit at roughly 2× Q3, flagging only genuine outliers without generating noise on
typical files. Known violations at adoption: `OtherActionsPanelContent` (848 lines),
`UpdateDetailsPage` (914 lines), `EventsList` (501 lines).

---

## 4. Configuration API

### Types

```ts
type RuleSeverity = 'error' | 'warn' | 'off';

type BaseRuleOptions = {
  except?: string[];  // glob patterns relative to root; matched files are excluded
};

type RequireErrorHierarchyOptions = BaseRuleOptions & {
  rootErrorClass?: string;  // auto-detected from src/errors/ if omitted
};

type MaxFileLinesOptions = BaseRuleOptions & {
  tsx?: number;  // default 400
  ts?: number;   // default 300
};

type RequireTestTypeSuffixOptions = BaseRuleOptions & {
  allowedSuffixes?: string[];  // default: ['unit', 'comp', 'int']
};

type RuleConfig<O extends BaseRuleOptions = BaseRuleOptions> =
  | RuleSeverity
  | [RuleSeverity, O];

type RulesConfig = {
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

type ArchConfig = {
  root: string;          // path to src/, relative to the config file
  tsConfigPath?: string; // defaults to './tsconfig.json'
  mode: 'report' | 'enforce';
  rules: RulesConfig;
};
```

### The preset

```ts
export const agFrontendPreset = {
  rules: {
    'no-apis-depend-on-components':          'error',
    'no-apis-depend-on-pages':               'error',
    'no-components-depend-on-pages':         'error',
    'no-hooks-depend-on-pages':              'error',
    'no-types-depend-on-runtime-layers':     'error',
    'no-constants-depend-on-runtime-layers': 'error',
    'no-circular-dependencies':              'error',
    'require-barrel-exports':                'warn',
    'require-path-alias':                    'warn',
    'require-error-hierarchy':               'error',
    'errors-extend-ag-error':                'error',
    'require-test-type-suffix':              'warn',
    'require-hook-prefix':                   'warn',
    'max-file-lines':                ['warn', { tsx: 400, ts: 300 }],
  } satisfies RulesConfig,
} as const;
```

### `defineArchConfig`

Typed identity function providing TypeScript inference and IDE autocomplete on the config
object:

```ts
export function defineArchConfig(config: ArchConfig): ArchConfig {
  return config;
}
```

### `runArchRules`

Registers one Vitest `it()` block per enabled rule under a `describe('Architecture')` suite.
Mode and severity are resolved here; consuming projects never reason about the matrix
directly.

```ts
export function runArchRules(config: ArchConfig): void {
  describe('Architecture', () => {
    for (const [name, ruleConfig] of Object.entries(config.rules)) {
      const [severity, options] = normalise(ruleConfig);
      if (severity === 'off') continue;

      it(name, async () => {
        const violations = await evaluate(name, config, options);
        if (violations.length === 0) return;

        const report = formatViolations(name, violations);

        if (config.mode === 'report' || severity === 'warn') {
          console.warn(`\n[arch] ${report}`);
        } else {
          throw new Error(`\n[arch] ${report}`);
        }
      });
    }
  });
}
```

### Mode × severity matrix

| `mode` | severity | Result |
|---|---|---|
| `report` | `error` | Violations logged; test passes |
| `report` | `warn` | Violations logged; test passes |
| `enforce` | `error` | Violations fail the test |
| `enforce` | `warn` | Violations logged; test passes |

`'off'` rules are never registered.

---

## 5. Consuming Project Integration

### Invocation (separate command)

Each consuming project adds one file and one script:

```ts
// arch.check.ts  (not matched by the default test glob)
import {
  agFrontendPreset,
  defineArchConfig,
  runArchRules,
} from '@australiangreens/ag-arch-rules';

runArchRules(defineArchConfig({
  root: './src',
  mode: 'report',
  rules: {
    ...agFrontendPreset.rules,
    // project-specific overrides below
  },
}));
```

```json
// package.json
"scripts": {
  "arch:check": "vitest run --reporter=verbose arch.check.ts"
}
```

To integrate into the normal test suite later, rename to `arch.test.ts` and switch
`mode` to `'enforce'` when ready.

### Initial configs for the three existing projects

**listmanager-frontend:**
```ts
import { agFrontendPreset, defineArchConfig, runArchRules }
  from '@australiangreens/ag-arch-rules';

runArchRules(defineArchConfig({
  root: './src',
  mode: 'report',
  rules: {
    ...agFrontendPreset.rules,
    'no-components-depend-on-pages': ['error', {
      except: [
        // labelSorting utility co-located in pages/ — tracked for extraction to src/util/
        'src/components/TagsFetchAutocomplete/**',
        'src/components/OtherActionsPanelContent/**',
        'src/components/UsersFetchAutocomplete/**',
        'src/components/DistributionListPanel/**',
        'src/components/GroupsFetchAutocomplete/**',
      ],
    }],
  },
}));
```

**eventsmanager-frontend:**
```ts
import { agFrontendPreset, defineArchConfig, runArchRules }
  from '@australiangreens/ag-arch-rules';

runArchRules(defineArchConfig({
  root: './src',
  mode: 'report',
  rules: {
    ...agFrontendPreset.rules,
    'no-components-depend-on-pages': ['error', {
      except: [
        // FormAtoms types used by WysiwygEditor — tracked for extraction to src/types/
        'src/components/WysiwygEditor/**',
      ],
    }],
  },
}));
```

**volunteer-frontend:**
```ts
import { agFrontendPreset, defineArchConfig, runArchRules }
  from '@australiangreens/ag-arch-rules';

runArchRules(defineArchConfig({
  root: './src',
  mode: 'report',
  rules: {
    ...agFrontendPreset.rules,
    'require-error-hierarchy': 'off',  // no src/errors/ in this project
    'errors-extend-ag-error':  'off',
  },
}));
```

---

## 6. Package Internals

### Directory structure

Shared infrastructure lives at the `src/` root. Rulesets are namespaced under
`src/<domain>/`. Adding a new ruleset means adding a directory and exporting its preset
from `index.ts`.

```
ag-arch-rules/
├── src/
│   ├── index.ts                  # All public named exports
│   ├── types.ts                  # ArchConfig, RulesConfig, Violation, etc.
│   ├── defineArchConfig.ts       # Shared typed identity helper
│   ├── runArchRules.ts           # Shared Vitest test registration
│   ├── evaluate.ts               # Shared rule name → implementation dispatcher
│   ├── format.ts                 # Shared violation formatter
│   ├── utils/
│   │   ├── normalise.ts          # Unpacks RuleConfig string|tuple → [severity, options]
│   │   └── glob.ts               # Shared path/glob helpers
│   └── frontend/
│       ├── preset.ts             # agFrontendPreset
│       └── rules/
│           ├── layerDependency.ts    # Generic archunit-based layer A → B dependency check
│           ├── noApisOnComponents.ts
│           ├── noApisOnPages.ts
│           ├── noComponentsOnPages.ts
│           ├── noHooksOnPages.ts
│           ├── noTypesOnRuntime.ts
│           ├── noConstantsOnRuntime.ts
│           ├── noCircularDependencies.ts
│           ├── requireBarrelExports.ts
│           ├── requirePathAlias.ts
│           ├── requireErrorHierarchy.ts
│           ├── errorsExtendAgError.ts
│           ├── requireTestTypeSuffix.ts
│           ├── requireHookPrefix.ts
│           └── maxFileLines.ts
├── package.json
├── tsconfig.json
└── README.md
```

### `src/index.ts`

```ts
// Shared infrastructure
export { defineArchConfig } from './defineArchConfig.js';
export { runArchRules }     from './runArchRules.js';
export type { ArchConfig, RulesConfig, RuleConfig, Violation,
              BaseRuleOptions, MaxFileLinesOptions,
              RequireErrorHierarchyOptions,
              RequireTestTypeSuffixOptions } from './types.js';

// Frontend ruleset
export { agFrontendPreset } from './frontend/preset.js';
```

### Implementation categories

**Category A — Import graph rules (7 rules, plus `require-error-hierarchy` and `errors-extend-ag-error`)**

Use `archunit` to analyse the TypeScript project's import graph, resolved via the
consuming project's `tsconfig.json` (including `@/` path alias). All seven layer
dependency rules delegate to `layerDependency.ts`, which wraps the `archunit` API.
`except` patterns are applied as a post-filter using `micromatch`.

`require-error-hierarchy` and `errors-extend-ag-error` also use `archunit` as import-graph
proxies for class inheritance, avoiding the heavier `ts-morph` dependency:
- `require-error-hierarchy`: files in `src/errors/**` (non-root, non-index) must import
  from `src/errors/**`
- `errors-extend-ag-error`: the root error class file must import from
  `@australiangreens/ag-error`

> **Verify at implementation:** Confirm `archunit`'s current API for loading a project,
> defining path-based slices, and retrieving violations before implementing
> `layerDependency.ts`. The package's own README is authoritative.

**Category B — File system rules (5 rules)**

Use `glob` + `fs.readFileSync` + `micromatch`. No TypeScript AST required.
`max-file-lines` excludes `*.test.*` and `*.spec.*` files.

### Package metadata

```json
{
  "name": "@australiangreens/ag-arch-rules",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types":  "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts",
    "test":  "vitest run"
  },
  "peerDependencies": {
    "vitest": ">=1.0.0"
  },
  "dependencies": {
    "archunit":   "^<latest>",
    "glob":       "^11.0.0",
    "micromatch": "^4.0.0"
  },
  "devDependencies": {
    "tsup":       "^8.0.0",
    "typescript": "^5.0.0",
    "vitest":     "^3.0.0"
  },
  "publishConfig": {
    "registry": "https://npm.pkg.github.com"
  }
}
```

---

## 7. Adoption Path

1. Publish `v0.1.0` to GitHub Packages
2. Each project installs `@australiangreens/ag-arch-rules` as a dev dependency
3. Each project adds `arch.check.ts` + `"arch:check"` script; add to CI as a non-blocking
   informational step
4. Teams work through report output — fixing genuine violations, adding documented `except`
   entries for deliberate exceptions
5. Per-project: once violations are resolved or excepted, switch `mode` to `'enforce'`
6. Per-project: optionally rename to `arch.test.ts` to fold into the main test suite

---

## 8. Known Violations at Adoption

Expected to appear in report output immediately. Each should be fixed or added as a
documented `except` entry.

| Project | Rule | Files |
|---|---|---|
| listmanager | `no-components-depend-on-pages` | 5 components import `labelSorting` from `pages/QuickFilterListCreatorPage/util` |
| eventsmanager | `no-components-depend-on-pages` | `WysiwygEditor` imports `FormFieldError`/`StateAtoms` from `pages/createEvent/FormAtoms` |
| volunteer | `require-error-hierarchy` / `errors-extend-ag-error` | No `src/errors/` — disable both rules |
| all three | `max-file-lines` | Several production files exceed 400 tsx / 300 ts lines |
| all three | `require-barrel-exports` | ~5–6 components per project missing `index.ts` |
| volunteer | `require-test-type-suffix` | All test files use plain `.test.*` naming |
