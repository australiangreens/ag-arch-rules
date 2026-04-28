# Agent-Readable Output Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `line?: number` to violations where determinable, and emit a flat JSON sidecar file when `ARCH_JSON_OUTPUT` env var is set.

**Architecture:** Extend the `Violation` type with an optional `line` field; introduce a `RuleResult` type that `runArchRules` accumulates per rule; extract a dedicated `writeJsonOutput` function in a new `src/output.ts` module that flattens results to `JsonViolationRecord[]` and writes them to the caller-specified path.

**Tech Stack:** TypeScript, Vitest, Node.js `fs` module. No new dependencies.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/types.ts` | Modify | Add `line?` to `Violation`; add `RuleResult`, `JsonViolationRecord` types |
| `src/output.ts` | Create | `writeJsonOutput(results, outputPath)` — flatten and serialise |
| `src/frontend/rules/requirePathAlias.ts` | Modify | Populate `line` from regex match index |
| `src/frontend/rules/layerDependency.ts` | Modify | Add comment documenting archunit line number investigation outcome |
| `src/runArchRules.ts` | Modify | Accumulate `RuleResult[]`; call `writeJsonOutput` in `afterAll` |
| `src/index.ts` | Modify | Export `RuleResult`, `JsonViolationRecord` |
| `tests/output.test.ts` | Create | Unit tests for `writeJsonOutput` |
| `tests/frontend/rules/requirePathAlias.test.ts` | Modify | Assert `line` is populated on violations |

---

## Task 1: Add new types to `src/types.ts`

**Files:**
- Modify: `src/types.ts`

No tests needed for pure type changes — TypeScript compilation catches errors.

- [ ] **Step 1: Add `line?` to `Violation` and add `RuleResult` and `JsonViolationRecord`**

Replace the existing `Violation` type and append the two new types in `src/types.ts`:

```typescript
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
```

The full updated `src/types.ts` (replace the file):

```typescript
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add RuleResult and JsonViolationRecord types, line? to Violation"
```

---

## Task 2: Create the output module

**Files:**
- Create: `src/output.ts`
- Create: `tests/output.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/output.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { writeJsonOutput } from '../src/output.js';
import type { RuleResult, JsonViolationRecord } from '../src/types.js';

let tmpFile: string;

beforeEach(() => {
  tmpFile = path.join(os.tmpdir(), `arch-test-${Date.now()}.json`);
});

afterEach(() => {
  if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
});

describe('writeJsonOutput', () => {
  it('writes a flat JSON array to the given path', () => {
    const results: RuleResult[] = [
      {
        rule: 'require-path-alias',
        severity: 'warn',
        violations: [
          { file: 'src/foo.ts', line: 3, message: "uses '../bar'" },
          { file: 'src/baz.ts', line: 7, message: "uses '../qux'" },
        ],
      },
    ];

    writeJsonOutput(results, tmpFile);

    const records: JsonViolationRecord[] = JSON.parse(fs.readFileSync(tmpFile, 'utf8'));
    expect(records).toHaveLength(2);
    expect(records[0]).toEqual({
      rule: 'require-path-alias',
      severity: 'warn',
      file: 'src/foo.ts',
      line: 3,
      message: "uses '../bar'",
    });
    expect(records[1]).toEqual({
      rule: 'require-path-alias',
      severity: 'warn',
      file: 'src/baz.ts',
      line: 7,
      message: "uses '../qux'",
    });
  });

  it('omits the line key entirely when line is undefined', () => {
    const results: RuleResult[] = [
      {
        rule: 'max-file-lines',
        severity: 'warn',
        violations: [{ file: 'src/big.ts', message: 'exceeds 300 lines (716 actual)' }],
      },
    ];

    writeJsonOutput(results, tmpFile);

    const records: JsonViolationRecord[] = JSON.parse(fs.readFileSync(tmpFile, 'utf8'));
    expect(records).toHaveLength(1);
    expect('line' in records[0]).toBe(false);
    expect(records[0].message).toBe('exceeds 300 lines (716 actual)');
  });

  it('flattens violations from multiple rules into a single array', () => {
    const results: RuleResult[] = [
      {
        rule: 'require-path-alias',
        severity: 'warn',
        violations: [{ file: 'src/a.ts', line: 1, message: 'msg a' }],
      },
      {
        rule: 'max-file-lines',
        severity: 'warn',
        violations: [{ file: 'src/b.ts', message: 'msg b' }],
      },
    ];

    writeJsonOutput(results, tmpFile);

    const records: JsonViolationRecord[] = JSON.parse(fs.readFileSync(tmpFile, 'utf8'));
    expect(records).toHaveLength(2);
    expect(records[0].rule).toBe('require-path-alias');
    expect(records[1].rule).toBe('max-file-lines');
  });

  it('produces an empty array when all rules have zero violations', () => {
    const results: RuleResult[] = [
      { rule: 'require-path-alias', severity: 'warn', violations: [] },
    ];

    writeJsonOutput(results, tmpFile);

    const records = JSON.parse(fs.readFileSync(tmpFile, 'utf8'));
    expect(records).toEqual([]);
  });

  it('writes pretty-printed JSON', () => {
    const results: RuleResult[] = [
      {
        rule: 'require-path-alias',
        severity: 'warn',
        violations: [{ file: 'src/a.ts', line: 1, message: 'msg' }],
      },
    ];

    writeJsonOutput(results, tmpFile);

    const raw = fs.readFileSync(tmpFile, 'utf8');
    expect(raw).toContain('\n');
    expect(raw).toContain('  ');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test tests/output.test.ts
```

Expected: FAIL — `Cannot find module '../src/output.js'`

- [ ] **Step 3: Create `src/output.ts`**

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

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test tests/output.test.ts
```

Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/output.ts tests/output.test.ts
git commit -m "feat: add writeJsonOutput module"
```

---

## Task 3: Add line numbers to `requirePathAlias`

**Files:**
- Modify: `src/frontend/rules/requirePathAlias.ts`
- Modify: `tests/frontend/rules/requirePathAlias.test.ts`

- [ ] **Step 1: Add a failing test for line number**

In `tests/frontend/rules/requirePathAlias.test.ts`, add this test inside the existing `describe` block:

```typescript
it('populates line number on violations', async () => {
  const violations = await requirePathAlias(baseConfig, {});
  const relativeImporterViolation = violations.find(v => v.file.includes('RelativeImporter'));
  expect(relativeImporterViolation).toBeDefined();
  expect(relativeImporterViolation!.line).toBe(1);
});
```

The fixture file `tests/fixtures/project/src/components/RelativeImporter.ts` has its relative import on line 1, so `line: 1` is the expected value.

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm test tests/frontend/rules/requirePathAlias.test.ts
```

Expected: FAIL — `expect(undefined).toBe(1)`

- [ ] **Step 3: Update `requirePathAlias` to compute line number**

Replace the violation push in `src/frontend/rules/requirePathAlias.ts`:

```typescript
// Before:
if (match) {
  violations.push({
    file: relFile,
    message: `uses relative cross-directory import '${match[1]}' — use @/ alias instead`,
  });
}

// After:
if (match) {
  const line = content.slice(0, match.index).split('\n').length;
  violations.push({
    file: relFile,
    line,
    message: `uses relative cross-directory import '${match[1]}' — use @/ alias instead`,
  });
}
```

- [ ] **Step 4: Run all requirePathAlias tests**

```bash
pnpm test tests/frontend/rules/requirePathAlias.test.ts
```

Expected: all 5 tests PASS.

- [ ] **Step 5: Run the full test suite to check for regressions**

```bash
pnpm test
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/frontend/rules/requirePathAlias.ts tests/frontend/rules/requirePathAlias.test.ts
git commit -m "feat: add line number to requirePathAlias violations"
```

---

## Task 4: Document archunit line number limitation in `layerDependency`

**Files:**
- Modify: `src/frontend/rules/layerDependency.ts`

Archunit's violation objects expose only `sourceLabel`, `targetLabel`, and `cumulatedEdges` (`{source, target, external, importKinds}`). No line number is available. Add a comment documenting this so future maintainers know it was investigated.

- [ ] **Step 1: Add investigative comment to `layerDependency.ts`**

Add the following comment directly above the `.map(({ rel, to }) => ({` line in the final chain in `checkLayerDependency`:

```typescript
  // archunit violations expose only sourceLabel/targetLabel — no source line is available.
  // Investigated against archunit@2.x: cumulatedEdges carry {source,target,external,importKinds}
  // only. line is therefore omitted from these violations.
  .map(({ rel, to }) => ({
    file: rel,
    message: `imports from ${to}`,
  }));
```

- [ ] **Step 2: Verify tests still pass**

```bash
pnpm test
```

Expected: all tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/frontend/rules/layerDependency.ts
git commit -m "docs: document archunit line number investigation in layerDependency"
```

---

## Task 5: Update `runArchRules` to accumulate results and write JSON output

**Files:**
- Modify: `src/runArchRules.ts`

The `runArchRules` function wraps Vitest primitives (`describe`, `it`, `afterAll`) and cannot be unit-tested in isolation without mocking the test runner. The `writeJsonOutput` function is already fully tested in Task 2. This task is verified by a smoke test.

- [ ] **Step 1: Update `src/runArchRules.ts`**

Replace the full file content:

```typescript
import { afterAll, describe, it } from 'vitest';
import { normalise }        from './utils/normalise.js';
import { evaluate }         from './evaluate.js';
import { formatViolations } from './format.js';
import { writeJsonOutput }  from './output.js';
import type { ArchConfig, RuleResult }  from './types.js';

export function runArchRules(config: ArchConfig): void {
  describe('Architecture', () => {
    const violationCounts: Record<string, number> = {};
    const ruleResults: RuleResult[] = [];

    for (const [name, ruleConfig] of Object.entries(config.rules)) {
      const [severity, options] = normalise(ruleConfig);
      if (severity === 'off') continue;

      it(name, async () => {
        const violations = await evaluate(name, config, options);
        ruleResults.push({ rule: name, severity, violations });
        violationCounts[name] = violations.length;
        if (violations.length === 0) return;

        const report = formatViolations(name, violations);

        if (config.mode === 'report' || severity === 'warn') {
          console.warn(`\n[arch] ${report}`);
        } else {
          throw new Error(`\n[arch] ${report}`);
        }
      });
    }

    afterAll(() => {
      const entries = Object.entries(violationCounts).filter(([, count]) => count > 0);
      if (entries.length > 0) {
        const maxNameLen = Math.max(...entries.map(([name]) => name.length));
        const maxCountLen = Math.max(...entries.map(([, count]) => String(count).length));
        const lines = entries.map(([name, count]) =>
          `  ${name.padEnd(maxNameLen)}  ${String(count).padStart(maxCountLen)}`
        );
        console.warn(`\n[arch] Violation summary:\n${lines.join('\n')}`);
      }

      const outputPath = process.env.ARCH_JSON_OUTPUT;
      if (outputPath) {
        writeJsonOutput(ruleResults, outputPath);
      }
    });
  });
}
```

- [ ] **Step 2: Smoke test — run test suite with `ARCH_JSON_OUTPUT` set**

```bash
ARCH_JSON_OUTPUT=/tmp/arch-smoke.json pnpm test && cat /tmp/arch-smoke.json | head -20
```

Expected: tests pass and the JSON file begins with `[` followed by violation records. Example head output:

```json
[
  {
    "rule": "...",
    "severity": "...",
    "file": "...",
```

- [ ] **Step 3: Smoke test — verify `line` appears on `require-path-alias` records**

```bash
cat /tmp/arch-smoke.json | grep -A 5 '"require-path-alias"' | head -20
```

Expected: records include a `"line":` key with a positive integer.

- [ ] **Step 4: Smoke test — verify `line` is absent on `max-file-lines` records**

```bash
node -e "
const r = JSON.parse(require('fs').readFileSync('/tmp/arch-smoke.json','utf8'));
const mfl = r.filter(x => x.rule === 'max-file-lines');
const hasLine = mfl.some(x => 'line' in x);
console.log('max-file-lines violations with line key:', hasLine ? 'YES (unexpected)' : 'NONE (correct)');
"
```

Expected: `max-file-lines violations with line key: NONE (correct)`

- [ ] **Step 5: Smoke test — verify output is absent without env var**

```bash
SENTINEL=/tmp/arch-sentinel-$$.json
pnpm test
ls $SENTINEL 2>&1
```

Expected: `No such file or directory` — the file was not created because `ARCH_JSON_OUTPUT` was not set.

- [ ] **Step 6: Commit**

```bash
git add src/runArchRules.ts
git commit -m "feat: accumulate RuleResult and write JSON output via ARCH_JSON_OUTPUT"
```

---

## Task 6: Export new types from the public API

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Add exports to `src/index.ts`**

Add `RuleResult` and `JsonViolationRecord` to the existing type export block:

```typescript
export { defineArchConfig }        from './defineArchConfig.js';
export { defineArchVitestConfig }  from './defineArchVitestConfig.js';
export { runArchRules }            from './runArchRules.js';
export { agFrontendPreset }        from './frontend/preset.js';
export { DEFAULT_TEST_FILE_GLOBS } from './defaults.js';
export type {
  ArchConfig,
  RulesConfig,
  RuleConfig,
  RuleSeverity,
  Violation,
  BaseRuleOptions,
  MaxFileLinesOptions,
  RequireErrorHierarchyOptions,
  RequireTestTypeSuffixOptions,
  RuleResult,
  JsonViolationRecord,
} from './types.js';
export type { ArchVitestConfigOptions } from './defineArchVitestConfig.js';
```

- [ ] **Step 2: Build to confirm the public API compiles**

```bash
pnpm build
```

Expected: `dist/index.js` and `dist/index.d.ts` are regenerated with no errors.

- [ ] **Step 3: Confirm new types appear in the built declarations**

```bash
grep -E "RuleResult|JsonViolationRecord" dist/index.d.ts
```

Expected: both type names appear.

- [ ] **Step 4: Commit**

```bash
git add src/index.ts dist/
git commit -m "feat: export RuleResult and JsonViolationRecord from public API"
```
