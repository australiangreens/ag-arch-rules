# Agent-Readable Output Design

**Date:** 2026-04-29  
**Status:** Approved

## Problem

The current output of `ag-arch-rules` is human-readable stderr text. AI coding agents consuming this output must parse free-form strings to locate violations, and then perform a secondary grep pass to find the specific line to edit. This makes bulk remediation workflows (e.g. fixing 190 `require-path-alias` violations in one pass) unnecessarily expensive.

Two gaps drive most of the friction:

1. **No source line on violations** — agents know a file has a violation but not where in it.
2. **No machine-readable format** — agents must parse text rather than consume structured data.

## Goals

- Add `line?: number` to violations where it is determinable without significant architectural change.
- Emit a flat JSON file of all violations when `ARCH_JSON_OUTPUT` env var is set, alongside the existing human-readable output (which is unchanged).
- Each JSON record is self-contained: rule name, severity, file, optional line, message.

## Non-Goals

- Replacing or modifying the existing stderr text output.
- Adding line numbers to rules where they are not meaningful (filename-convention rules, file-level rules).
- Extending `requireHookPrefix` to scan function declarations inside files (out of scope).

## Type Changes (`src/types.ts`)

```typescript
// Existing — gains one optional field
export type Violation = {
  file: string;
  message: string;
  line?: number;
};

// New — what runArchRules accumulates per rule
export type RuleResult = {
  rule: string;
  severity: RuleSeverity;
  violations: Violation[];
};

// New — one record in the JSON output file
export type JsonViolationRecord = {
  rule: string;
  severity: RuleSeverity;
  file: string;
  line?: number;
  message: string;
};
```

`JsonViolationRecord` is exported so consumers can type-check against it when reading the file.

## Rule-Level Line Number Changes

### Attainable — implement

**`requirePathAlias`** — already uses `RELATIVE_IMPORT_RE.exec(content)` and has `match.index`. Compute line by counting newlines up to the match position:

```typescript
const line = content.slice(0, match.index).split('\n').length;
violations.push({ file: relFile, line, message: ... });
```

### Investigate during implementation

**`layerDependency`** (powers `no-apis-depend-on-components`, `no-apis-depend-on-pages`, `no-components-depend-on-pages`, `no-hooks-depend-on-pages`, `no-types-depend-on-runtime-layers`, `no-constants-depend-on-runtime-layers`) — archunit's raw violation objects currently provide `v.dependency.sourceLabel` and `v.dependency.targetLabel`. Before implementing, check whether the archunit API also exposes a source line (e.g. `v.dependency.sourceLine`).

- **If it does:** populate `line` on the violation. Covers 6 rules in one change.
- **If it doesn't:** leave `line` as `undefined` and add a comment in `layerDependency.ts` documenting that this was investigated and not available.

### Not meaningful — leave as `undefined`

| Rule | Reason |
|---|---|
| `maxFileLines` | Violation is the whole file |
| `requireHookPrefix` | Checks filename convention, not file contents |
| `requireTestTypeSuffix` | Checks filename convention |
| `requireBarrelExports` | Directory-level check |
| `noCircularDependencies` | madge returns cycle arrays with no per-import positions |
| `requireErrorHierarchy` / `errorsExtendAgError` | Class-level checks via archunit |

## `runArchRules` Changes (`src/runArchRules.ts`)

Accumulate `RuleResult[]` alongside the existing `violationCounts` map. Write JSON output in `afterAll` if `ARCH_JSON_OUTPUT` is set:

```typescript
const ruleResults: RuleResult[] = [];

it(name, async () => {
  const violations = await evaluate(name, config, options);
  ruleResults.push({ rule: name, severity, violations }); // new
  violationCounts[name] = violations.length;
  // existing report/enforce logic unchanged
});

afterAll(() => {
  // existing summary block unchanged

  const outputPath = process.env.ARCH_JSON_OUTPUT;
  if (outputPath) {
    writeJsonOutput(ruleResults, outputPath);
  }
});
```

`ruleResults` accumulates all rules including those with zero violations. The writer flattens to a flat array, so rules with no violations are naturally absent from the JSON output.

## Output Module (`src/output.ts`)

```typescript
import * as fs from 'node:fs';
import type { RuleResult, JsonViolationRecord } from './types.js';

export function writeJsonOutput(results: RuleResult[], outputPath: string): void {
  const records: JsonViolationRecord[] = results.flatMap(({ rule, severity, violations }) =>
    violations.map(v => ({
      rule,
      severity,
      file: v.file,
      ...(v.line !== undefined && { line: v.line }),
      message: v.message,
    }))
  );
  fs.writeFileSync(outputPath, JSON.stringify(records, null, 2));
}
```

`line` is omitted from the record entirely when not available (not `null`, not `undefined`) — agents can use `'line' in record` as an unambiguous signal that a source position is known.

## JSON Output Schema

Example output for `ARCH_JSON_OUTPUT=./arch-violations.json`:

```json
[
  {
    "rule": "require-path-alias",
    "severity": "warn",
    "file": "src/components/Foo/Foo.tsx",
    "line": 3,
    "message": "uses relative cross-directory import '../utils/bar' — use @/ alias instead"
  },
  {
    "rule": "max-file-lines",
    "severity": "warn",
    "file": "src/util/index.ts",
    "message": "exceeds 300 lines (716 actual)"
  }
]
```

## Trigger

Set the `ARCH_JSON_OUTPUT` environment variable to a file path before running vitest:

```sh
ARCH_JSON_OUTPUT=./arch-violations.json npx vitest run arch.check.ts
```

The existing human-readable stderr output is unaffected. The JSON file is written once, after all rules complete, in the `afterAll` hook.

## Files Changed

| File | Change |
|---|---|
| `src/types.ts` | Add `line?` to `Violation`; add `RuleResult`, `JsonViolationRecord` types |
| `src/output.ts` | New file — `writeJsonOutput` function |
| `src/runArchRules.ts` | Accumulate `RuleResult[]`; call `writeJsonOutput` in `afterAll` |
| `src/frontend/rules/requirePathAlias.ts` | Populate `line` from regex match index |
| `src/frontend/rules/layerDependency.ts` | Populate `line` if archunit exposes it; otherwise document investigation |
| `src/index.ts` | Export `RuleResult`, `JsonViolationRecord` from public API |
