# @australiangreens/ag-arch-rules

Architectural lint rules for Australian Greens TypeScript frontend projects, run as Vitest tests.

The package encodes agreed conventions around layer dependencies, project structure, naming, and file metrics. Rules run alongside your normal test suite (or as a separate command), and violations are reported or enforced depending on how you configure them.

## Installation

```sh
npm install --save-dev @australiangreens/ag-arch-rules
```

The package is published to GitHub Packages. You'll need an `.npmrc` pointing at the registry:

```
@australiangreens:registry=https://npm.pkg.github.com
```

## Quick start

Create `arch.check.ts` in your project root (not inside `src/`):

```ts
import { agFrontendPreset, defineArchConfig, runArchRules } from '@australiangreens/ag-arch-rules';

runArchRules(defineArchConfig({
  root: './src',
  mode: 'report',
  rules: {
    ...agFrontendPreset.rules,
  },
}));
```

Add a script to `package.json`:

```json
"scripts": {
  "arch:check": "vitest run --reporter=verbose arch.check.ts"
}
```

Run with:

```sh
npm run arch:check
```

In `report` mode, violations are logged to stderr but tests still pass — useful when first adopting the rules on an existing codebase. Switch to `enforce` when you're ready to make violations fail the build.

## Configuration

### `defineArchConfig`

A typed identity function that provides TypeScript inference and IDE autocomplete on your config object.

### `runArchRules`

Registers one Vitest `it()` block per enabled rule under a `describe('Architecture')` suite. Call it at the top level of your check file — not inside a test block.

### `mode`

| Value | Effect |
|---|---|
| `'report'` | Violations are logged; no tests fail |
| `'enforce'` | `error`-severity violations fail their test; `warn`-severity violations are logged |

### Rule configuration

Each rule can be set to a severity string or a `[severity, options]` tuple:

```ts
rules: {
  'max-file-lines': 'off',                           // disabled
  'require-hook-prefix': 'warn',                     // default severity
  'max-file-lines': ['warn', { tsx: 500, ts: 400 }], // with options
}
```

### `except` patterns

All rules accept an `except` array of glob patterns (CWD-relative) to exclude specific files from the rule:

```ts
'no-components-depend-on-pages': ['error', {
  except: [
    'src/components/LegacyWidget/**',
  ],
}],
```

## The `agFrontendPreset`

A ready-made config covering all 14 rules with sensible defaults:

```ts
import { agFrontendPreset, defineArchConfig, runArchRules } from '@australiangreens/ag-arch-rules';

runArchRules(defineArchConfig({
  root: './src',
  mode: 'enforce',
  rules: {
    ...agFrontendPreset.rules,
    // override individual rules below
  },
}));
```

Default severities in the preset:

| Rule | Default |
|---|---|
| `no-apis-depend-on-components` | `error` |
| `no-apis-depend-on-pages` | `error` |
| `no-components-depend-on-pages` | `error` |
| `no-hooks-depend-on-pages` | `error` |
| `no-types-depend-on-runtime-layers` | `error` |
| `no-constants-depend-on-runtime-layers` | `error` |
| `no-circular-dependencies` | `error` |
| `require-barrel-exports` | `warn` |
| `require-path-alias` | `warn` |
| `require-error-hierarchy` | `error` |
| `errors-extend-ag-error` | `error` |
| `require-test-type-suffix` | `warn` |
| `require-hook-prefix` | `warn` |
| `max-file-lines` | `warn` (`tsx: 400`, `ts: 300`) |

## Adopting on an existing codebase

Start in `report` mode so you can see what violations exist without breaking CI. Use `except` patterns to acknowledge known violations you're not ready to fix, then tighten incrementally. When a rule has no remaining violations, switch it to `enforce` or rename the file to `arch.test.ts` and set `mode: 'enforce'` globally.

## Rule reference

See [docs/RULES.md](docs/RULES.md) for a description of each rule with examples.

## Requirements

- Node.js 18+
- Vitest 1.0+ (peer dependency)
- TypeScript project with a `tsconfig.json`
