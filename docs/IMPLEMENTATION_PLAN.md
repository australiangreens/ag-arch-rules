# ag-arch-rules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish `@australiangreens/ag-arch-rules`, an ESM TypeScript npm package that exposes 14 architectural lint rules for Australian Greens frontend projects, runnable as Vitest tests.

**Architecture:** Each rule is a pure async function returning `Violation[]`. The `evaluate.ts` dispatcher maps rule names to implementations. `runArchRules` registers one Vitest `it()` per enabled rule and handles the report/enforce × warn/error matrix. Import-graph rules use `archunit`; filesystem rules and error-hierarchy rules use `glob` + `fs` + regex.

**Tech Stack:** TypeScript 5, Vitest 3, archunit (~2.1.x), glob 11, micromatch 4, tsup 8 (build).

---

## Commit Convention

Commit after each task using `feat:` / `chore:` / `test:` conventional commit messages. No specific git workflow is prescribed — use whatever branching strategy the project uses.

---

## Assumptions and Decisions

Review before starting. These resolve open questions from the spec.

**Path normalization contract (cross-cutting):**
- `config.root` is CWD-relative as provided by the caller (e.g. `'src'` or `'tests/fixtures/project/src'`). Rule implementations resolve it to absolute internally with `path.resolve(config.root)` for filesystem operations.
- `except` patterns are CWD-relative (e.g. `'src/components/Foo/**'`). This matches the consuming-project examples in the spec. The spec comment "relative to root" is overridden by those examples.
- `Violation.file` is always a normalized CWD-relative path (e.g. `'src/apis/bad.ts'`). No absolute paths reach the public API.
- A shared `toRelative(absPath)` utility in `src/utils/glob.ts` converts absolute-or-relative paths to CWD-relative before any output or except matching.
- `matchesAny(toRelative(path), options.except ?? [])` is the standard pattern for except filtering in every rule.

**Error hierarchy rules use filesystem + regex, not archunit:**
- The spec categorizes `require-error-hierarchy` and `errors-extend-ag-error` as Category A (archunit). This plan deviates intentionally: `@australiangreens/ag-error` is a node_modules package, not a local source file, so archunit's file-graph analysis cannot track imports to it. Regex on file content (`content.includes('@australiangreens/ag-error')`) is direct, predictable, and testable. Both rules move to Category B. The spec's Category A/B table should be updated to reflect this.

**`tsConfigPath` is a no-op in v0.1.0:**
- `tsConfigPath` is accepted in `ArchConfig` and typed correctly, but is not passed to archunit in this release. Archunit auto-detects `tsconfig.json` from CWD. If non-root tsconfig support is needed in future, add a `setTsConfig(path)` call in `layerDependency.ts`. Document this in a comment there.

**`require-barrel-exports` violation shape:**
- Violations report the missing file path (e.g. `src/components/NoBarrel/index.ts`, message: `'barrel export missing'`). This makes `Violation.file` a file path in all rules (consistent) and makes except patterns work uniformly: `'src/components/NoBarrel/**'` matches `src/components/NoBarrel/index.ts` via micromatch.

**Other decisions:**
- `Violation` type: `{ file: string; message: string }`.
- `require-path-alias` flags imports whose specifier starts with `..`. Same-directory `./foo` imports are permitted.
- `noCircularDependencies` + `except`: skips violations where `toRelative(v.from)` matches any except pattern.
- `require-barrel-exports` checks one level deep (immediate subdirectories of `src/components/`).
- `require-error-hierarchy` config errors throw an `Error` inside the test body (surfaces as test failure in Vitest).
- archunit version: `^2.1.0` (latest stable ~2.1.63).

---

## File Map

```
ag-arch-rules/
├── src/
│   ├── index.ts                          public named exports
│   ├── types.ts                          all shared types
│   ├── defineArchConfig.ts               typed identity helper
│   ├── runArchRules.ts                   Vitest test registration
│   ├── evaluate.ts                       rule name → implementation dispatcher
│   ├── format.ts                         violation string formatter
│   ├── utils/
│   │   ├── normalise.ts                  RuleConfig string|tuple → [severity, options]
│   │   └── glob.ts                       micromatch wrapper, file finder, toRelative
│   └── frontend/
│       ├── preset.ts                     agFrontendPreset constant
│       └── rules/
│           ├── layerDependency.ts        generic archunit layer-A→layer-B check
│           ├── noApisOnComponents.ts     thin wrapper
│           ├── noApisOnPages.ts          thin wrapper
│           ├── noComponentsOnPages.ts    thin wrapper
│           ├── noHooksOnPages.ts         thin wrapper
│           ├── noTypesOnRuntime.ts       thin wrapper
│           ├── noConstantsOnRuntime.ts   thin wrapper
│           ├── noCircularDependencies.ts archunit haveNoCycles wrapper
│           ├── requireBarrelExports.ts   fs.readdirSync + missing-index check
│           ├── requirePathAlias.ts       readFileSync + regex scan
│           ├── requireErrorHierarchy.ts  readFileSync + regex (Category B)
│           ├── errorsExtendAgError.ts    readFileSync + regex (Category B)
│           ├── requireTestTypeSuffix.ts  glob filename check
│           ├── requireHookPrefix.ts      glob filename check
│           └── maxFileLines.ts           readFileSync line count
├── tests/
│   ├── fixtures/
│   │   ├── project/
│   │   │   ├── tsconfig.json
│   │   │   └── src/
│   │   │       ├── apis/
│   │   │       │   ├── userApi.ts        clean
│   │   │       │   └── badApi.ts         imports from components/ → layer violation
│   │   │       ├── components/
│   │   │       │   ├── Button/
│   │   │       │   │   ├── Button.tsx    clean
│   │   │       │   │   └── index.ts      barrel present
│   │   │       │   ├── NoBarrel/
│   │   │       │   │   └── NoBarrel.tsx  missing index.ts → barrel violation
│   │   │       │   ├── PageDependent.tsx imports from pages/ → layer violation
│   │   │       │   └── RelativeImporter.ts uses ../../ → path-alias violation
│   │   │       ├── pages/
│   │   │       │   ├── HomePage.tsx      clean (no imports)
│   │   │       │   └── LongPage.tsx      401 lines → max-file-lines violation
│   │   │       ├── hooks/
│   │   │       │   ├── useUser.ts        clean
│   │   │       │   ├── badHook.ts        no use-prefix + imports from pages/
│   │   │       │   ├── useFeature.unit.test.ts  correctly named
│   │   │       │   └── badTest.test.ts   missing type suffix → violation
│   │   │       ├── types/
│   │   │       │   ├── UserType.ts       clean
│   │   │       │   └── badType.ts        imports from apis/ → layer violation
│   │   │       ├── constants/
│   │   │       │   ├── AppConstants.ts   clean
│   │   │       │   └── badConstant.ts    imports from components/ → layer violation
│   │   │       ├── errors/
│   │   │       │   ├── AgBaseError.ts    imports @australiangreens/ag-error (root)
│   │   │       │   ├── UserError.ts      imports ./AgBaseError (hierarchy ok)
│   │   │       │   └── index.ts          re-exports
│   │   │       └── circular/
│   │   │           ├── a.ts              imports b.ts
│   │   │           └── b.ts              imports a.ts
│   │   └── bad-errors/
│   │       └── src/errors/
│   │           └── NoRootError.ts        no ag-error import → 0 root candidates
│   ├── utils/
│   │   ├── normalise.test.ts
│   │   └── glob.test.ts
│   ├── format.test.ts
│   ├── evaluate.test.ts
│   └── frontend/rules/
│       ├── layerDependency.test.ts
│       ├── noCircularDependencies.test.ts
│       ├── requireBarrelExports.test.ts
│       ├── requirePathAlias.test.ts
│       ├── requireErrorHierarchy.test.ts
│       ├── errorsExtendAgError.test.ts
│       ├── requireTestTypeSuffix.test.ts
│       ├── requireHookPrefix.test.ts
│       └── maxFileLines.test.ts
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.gitignore`

- [ ] **Step 1: Create `package.json`**

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
    "archunit":   "^2.1.0",
    "glob":       "^11.0.0",
    "micromatch": "^4.0.0"
  },
  "devDependencies": {
    "@types/micromatch": "^4.0.0",
    "tsup":       "^8.0.0",
    "typescript": "^5.0.0",
    "vitest":     "^3.0.0"
  },
  "publishConfig": {
    "registry": "https://npm.pkg.github.com"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Create `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
```

- [ ] **Step 4: Create `.gitignore`**

```
node_modules/
dist/
*.log
```

- [ ] **Step 5: Install dependencies**

```bash
npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 6: Verify vitest runs**

```bash
npm test
```

Expected: `No test files found` or similar — no crash.

---

## Task 2: Core Types

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: Create `src/types.ts`**

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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit --project tsconfig.json
```

Expected: no errors.

---

## Task 3: `normalise` Utility

**Files:**
- Create: `src/utils/normalise.ts`
- Create: `tests/utils/normalise.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/utils/normalise.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { normalise } from '../../src/utils/normalise.js';

describe('normalise', () => {
  it('passes a string severity through with empty options', () => {
    expect(normalise('error')).toEqual(['error', {}]);
    expect(normalise('warn')).toEqual(['warn', {}]);
    expect(normalise('off')).toEqual(['off', {}]);
  });

  it('unpacks a tuple into severity and options', () => {
    expect(normalise(['warn', { tsx: 200, ts: 150 }])).toEqual([
      'warn',
      { tsx: 200, ts: 150 },
    ]);
  });

  it('preserves except arrays from tuple options', () => {
    expect(normalise(['error', { except: ['src/foo/**'] }])).toEqual([
      'error',
      { except: ['src/foo/**'] },
    ]);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- --reporter=verbose tests/utils/normalise.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/utils/normalise.ts`**

```typescript
import type { RuleConfig, RuleSeverity, BaseRuleOptions } from '../types.js';

export function normalise<O extends BaseRuleOptions>(
  config: RuleConfig<O>
): [RuleSeverity, O] {
  if (Array.isArray(config)) {
    return config as [RuleSeverity, O];
  }
  return [config, {} as O];
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npm test -- --reporter=verbose tests/utils/normalise.test.ts
```

Expected: 3 tests PASS.

---

## Task 4: `glob` Utility (includes `toRelative`)

**Files:**
- Create: `src/utils/glob.ts`
- Create: `tests/utils/glob.test.ts`

`toRelative` is the single normalizer for the path contract. All rules call it before putting a path into `Violation.file` or passing to `matchesAny`.

- [ ] **Step 1: Write the failing tests**

Create `tests/utils/glob.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import { matchesAny, findFiles, toRelative } from '../../src/utils/glob.js';

describe('toRelative', () => {
  it('converts an absolute path to CWD-relative', () => {
    const abs = path.resolve('src/foo/bar.ts');
    expect(toRelative(abs)).toBe('src/foo/bar.ts');
  });

  it('is a no-op for paths already relative to CWD', () => {
    expect(toRelative('src/foo/bar.ts')).toBe('src/foo/bar.ts');
  });

  it('normalizes backslashes to forward slashes', () => {
    const abs = path.resolve('src/foo/bar.ts');
    expect(toRelative(abs)).not.toContain('\\');
  });
});

describe('matchesAny', () => {
  it('returns true when file matches at least one pattern', () => {
    expect(matchesAny('src/components/Foo/Foo.tsx', ['src/components/Foo/**'])).toBe(true);
  });

  it('returns false when file matches no pattern', () => {
    expect(matchesAny('src/apis/userApi.ts', ['src/components/**'])).toBe(false);
  });

  it('returns false for empty patterns array', () => {
    expect(matchesAny('src/anything.ts', [])).toBe(false);
  });
});

describe('findFiles', () => {
  it('returns CWD-relative paths matching a glob pattern', async () => {
    const files = await findFiles('tests/fixtures/project/src/apis/*.ts');
    expect(files.length).toBeGreaterThan(0);
    expect(files.every(f => f.endsWith('.ts'))).toBe(true);
    expect(files.every(f => !path.isAbsolute(f))).toBe(true);
  });

  it('returns empty array when no files match', async () => {
    const files = await findFiles('tests/fixtures/project/src/nonexistent/**');
    expect(files).toEqual([]);
  });
});
```

The `findFiles` tests depend on Task 7 fixtures. Run just `toRelative` and `matchesAny` tests until then.

- [ ] **Step 2: Run `toRelative` and `matchesAny` tests to confirm failure**

```bash
npm test -- --reporter=verbose tests/utils/glob.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/utils/glob.ts`**

```typescript
import micromatch from 'micromatch';
import { glob } from 'glob';
import * as path from 'node:path';

export function toRelative(filePath: string): string {
  const abs = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
  return path.relative(process.cwd(), abs).replace(/\\/g, '/');
}

export function matchesAny(filePath: string, patterns: string[]): boolean {
  if (patterns.length === 0) return false;
  return micromatch.isMatch(filePath, patterns);
}

export async function findFiles(pattern: string): Promise<string[]> {
  const results = await glob(pattern, { nodir: true });
  return results.map(f => f.replace(/\\/g, '/'));
}
```

- [ ] **Step 4: Run `toRelative` and `matchesAny` tests**

```bash
npm test -- --reporter=verbose tests/utils/glob.test.ts
```

Expected: `toRelative` (3) and `matchesAny` (3) PASS. `findFiles` tests FAIL (fixtures missing) — this is expected until Task 7.

---

## Task 5: `defineArchConfig`

**Files:**
- Create: `src/defineArchConfig.ts`
- Create: `tests/defineArchConfig.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/defineArchConfig.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { defineArchConfig } from '../src/defineArchConfig.js';

describe('defineArchConfig', () => {
  it('returns the config object unchanged', () => {
    const config = {
      root: 'src',
      mode: 'report' as const,
      rules: { 'max-file-lines': 'warn' as const },
    };
    expect(defineArchConfig(config)).toBe(config);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- --reporter=verbose tests/defineArchConfig.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement `src/defineArchConfig.ts`**

```typescript
import type { ArchConfig } from './types.js';

export function defineArchConfig(config: ArchConfig): ArchConfig {
  return config;
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npm test -- --reporter=verbose tests/defineArchConfig.test.ts
```

Expected: 1 test PASS.

---

## Task 6: `format.ts`

**Files:**
- Create: `src/format.ts`
- Create: `tests/format.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/format.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { formatViolations } from '../src/format.js';

describe('formatViolations', () => {
  it('formats a single violation', () => {
    const result = formatViolations('no-apis-depend-on-components', [
      { file: 'src/apis/bad.ts', message: 'imports from src/components/Button.tsx' },
    ]);
    expect(result).toContain("Rule 'no-apis-depend-on-components'");
    expect(result).toContain('1 violation');
    expect(result).toContain('src/apis/bad.ts');
    expect(result).toContain('imports from src/components/Button.tsx');
  });

  it('formats multiple violations', () => {
    const result = formatViolations('max-file-lines', [
      { file: 'src/pages/Foo.tsx', message: 'exceeds 400 lines (850 actual)' },
      { file: 'src/pages/Bar.tsx', message: 'exceeds 400 lines (500 actual)' },
    ]);
    expect(result).toContain('2 violation');
    expect(result).toContain('src/pages/Foo.tsx');
    expect(result).toContain('src/pages/Bar.tsx');
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- --reporter=verbose tests/format.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement `src/format.ts`**

```typescript
import type { Violation } from './types.js';

export function formatViolations(ruleName: string, violations: Violation[]): string {
  const count = violations.length;
  const noun = count === 1 ? 'violation' : 'violations';
  const lines = violations.map(v => `  ${v.file}: ${v.message}`);
  return `Rule '${ruleName}' has ${count} ${noun}:\n${lines.join('\n')}`;
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npm test -- --reporter=verbose tests/format.test.ts
```

Expected: 2 tests PASS.

---

## Task 7: Test Fixtures

All fixture files are real TypeScript files on disk. Each file is minimal — no imports beyond what is needed to create the violation. Clean files must be truly clean: no `..` imports, no naming violations, no import patterns that would trigger rules not being tested.

- [ ] **Step 1: Create `tests/fixtures/project/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 2: Create clean files**

`tests/fixtures/project/src/apis/userApi.ts`:
```typescript
export const getUser = () => ({ id: 1 });
```

`tests/fixtures/project/src/components/Button/Button.tsx`:
```typescript
export const Button = () => null;
```

`tests/fixtures/project/src/components/Button/index.ts`:
```typescript
export { Button } from './Button.js';
```

`tests/fixtures/project/src/pages/HomePage.tsx`:
```typescript
export const HomePage = () => null;
```

`tests/fixtures/project/src/hooks/useUser.ts`:
```typescript
export const useUser = () => ({ name: 'Alice' });
```

`tests/fixtures/project/src/types/UserType.ts`:
```typescript
export type User = { id: number; name: string };
```

`tests/fixtures/project/src/constants/AppConstants.ts`:
```typescript
export const APP_NAME = 'TestApp';
```

`tests/fixtures/project/src/errors/AgBaseError.ts`:
```typescript
import { AgError } from '@australiangreens/ag-error';
export class AgBaseError extends AgError {}
```

`tests/fixtures/project/src/errors/UserError.ts`:
```typescript
import { AgBaseError } from './AgBaseError.js';
export class UserError extends AgBaseError {}
```

`tests/fixtures/project/src/errors/index.ts`:
```typescript
export { AgBaseError } from './AgBaseError.js';
export { UserError } from './UserError.js';
```

- [ ] **Step 3: Create violation files**

`tests/fixtures/project/src/apis/badApi.ts` (imports from components — layer violation):
```typescript
import { Button } from '../components/Button/Button.js';
export const badFn = () => Button;
```

`tests/fixtures/project/src/components/NoBarrel/NoBarrel.tsx` (no index.ts — barrel violation):
```typescript
export const NoBarrel = () => null;
```

`tests/fixtures/project/src/components/PageDependent.tsx` (imports from pages — layer violation):
```typescript
import { HomePage } from '../pages/HomePage.js';
export const Wrapper = () => HomePage;
```

`tests/fixtures/project/src/components/RelativeImporter.ts` (uses `../` — path-alias violation):
```typescript
import { getUser } from '../apis/userApi.js';
export const fn = getUser;
```

`tests/fixtures/project/src/hooks/badHook.ts` (no `use` prefix + imports from pages):
```typescript
import { HomePage } from '../pages/HomePage.js';
export const badHook = () => HomePage;
```

`tests/fixtures/project/src/types/badType.ts` (imports from apis — layer violation):
```typescript
import { getUser } from '../apis/userApi.js';
export type BadType = typeof getUser;
```

`tests/fixtures/project/src/constants/badConstant.ts` (imports from components — layer violation):
```typescript
import { Button } from '../components/Button/Button.js';
export const BAD = Button;
```

- [ ] **Step 4: Create circular dependency files**

`tests/fixtures/project/src/circular/a.ts`:
```typescript
import { b } from './b.js';
export const a = b;
```

`tests/fixtures/project/src/circular/b.ts`:
```typescript
import { a } from './a.js';
export const b = a;
```

- [ ] **Step 5: Create test-suffix and max-lines fixtures**

`tests/fixtures/project/src/hooks/useFeature.unit.test.ts`:
```typescript
// correctly named test file
```

`tests/fixtures/project/src/hooks/badTest.test.ts`:
```typescript
// missing type suffix — violates require-test-type-suffix
```

Generate `tests/fixtures/project/src/pages/LongPage.tsx` with 401 lines:

```bash
printf 'export const LongPage = () => null;\n' > tests/fixtures/project/src/pages/LongPage.tsx
for i in $(seq 2 401); do printf "// padding line %d\n" $i; done >> tests/fixtures/project/src/pages/LongPage.tsx
```

- [ ] **Step 6: Create the bad-errors fixture (used by error hierarchy tests)**

`tests/fixtures/bad-errors/src/errors/NoRootError.ts`:
```typescript
export class NoRootError extends Error {}
```

This file has no `@australiangreens/ag-error` import, so auto-detection finds zero root candidates → triggers the expected error throw.

- [ ] **Step 7: Run glob tests — all should pass now**

```bash
npm test -- --reporter=verbose tests/utils/glob.test.ts
```

Expected: all 8 tests PASS (including `findFiles` tests that required the fixtures).

---

## Task 8A: Archunit API Verification (Hard Gate)

Before writing any archunit-dependent code, confirm the archunit API matches what the plan assumes. This task gates Tasks 8 and 9.

- [ ] **Step 1: Create a throwaway verification script `verify-archunit.mjs`**

```javascript
import { projectFiles } from 'archunit';
import * as path from 'node:path';

const srcRoot = 'tests/fixtures/project/src';
const fromPattern = path.posix.join(srcRoot, 'apis', '**');
const toPattern   = path.posix.join(srcRoot, 'components', '**');

const rule = projectFiles()
  .inFolder(fromPattern)
  .shouldNot()
  .dependOnFiles()
  .inFolder(toPattern);

const violations = await rule.check({ allowEmptyTests: true });
console.log('violations count:', violations.length);
console.log('first violation keys:', violations.length > 0 ? Object.keys(violations[0]) : 'n/a');
console.log('first violation:', violations[0]);
```

- [ ] **Step 2: Run the verification script**

```bash
node verify-archunit.mjs
```

Expected output similar to:
```
violations count: 1
first violation keys: [ 'from', 'to' ]
first violation: { from: '/absolute/path/tests/fixtures/project/src/apis/badApi.ts', to: '...' }
```

Confirm:
1. `violations.length > 0` — archunit detected `badApi.ts` importing from components
2. Violation objects have a `from` property with the importing file path
3. Violation objects have a `to` property with the imported file path

- [ ] **Step 3: Verify `haveNoCycles` API**

Add to `verify-archunit.mjs` (or run separately):

```javascript
const cycleRule = projectFiles()
  .inFolder(path.posix.join(srcRoot, 'circular', '**'))
  .should()
  .haveNoCycles();

const cycleViolations = await cycleRule.check({ allowEmptyTests: true });
console.log('cycle violations count:', cycleViolations.length);
console.log('cycle violation keys:', cycleViolations.length > 0 ? Object.keys(cycleViolations[0]) : 'n/a');
```

Expected: `cycleViolations.length > 0`.

- [ ] **Step 4: Reconcile any API differences**

If the violation object keys differ from `{ from, to }`:
- Update `layerDependency.ts` (Task 8) and `noCircularDependencies.ts` (Task 9) to use the actual property names.

If `inFolder` / `shouldNot` / `dependOnFiles` / `haveNoCycles` / `check` have different names:
- Read `node_modules/archunit/README.md` for the correct API and update the implementation tasks below.

If archunit returns CWD-relative paths instead of absolute:
- `toRelative` handles both — no change needed, but note it for confidence.

- [ ] **Step 5: Delete the verification script**

```bash
rm verify-archunit.mjs
```

---

## Task 8: Layer Dependency Rules (archunit — 7 rules)

**Files:**
- Create: `src/frontend/rules/layerDependency.ts`
- Create: `src/frontend/rules/noApisOnComponents.ts` + 5 similar wrappers
- Create: `tests/frontend/rules/layerDependency.test.ts`

All `Violation.file` values are normalized via `toRelative`. Except filtering compares `toRelative(v.from)` against the CWD-relative except patterns.

- [ ] **Step 1: Write the failing tests**

Create `tests/frontend/rules/layerDependency.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { checkLayerDependency } from '../../src/frontend/rules/layerDependency.js';

const FIXTURE_ROOT = 'tests/fixtures/project/src';
const baseConfig = { root: FIXTURE_ROOT, mode: 'enforce' as const, rules: {} };

describe('checkLayerDependency', () => {
  it('returns no violations when no forbidden imports exist', async () => {
    const violations = await checkLayerDependency(baseConfig, 'apis', 'pages', {});
    expect(violations).toEqual([]);
  });

  it('detects a violation when apis imports from components', async () => {
    const violations = await checkLayerDependency(baseConfig, 'apis', 'components', {});
    expect(violations.length).toBeGreaterThan(0);
    const badApi = violations.find(v => v.file.includes('badApi'));
    expect(badApi).toBeDefined();
    expect(badApi!.message).toMatch(/components/);
  });

  it('Violation.file is CWD-relative', async () => {
    const violations = await checkLayerDependency(baseConfig, 'apis', 'components', {});
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].file.startsWith('tests/fixtures/project/src')).toBe(true);
    expect(violations[0].file).not.toMatch(/^[A-Z]:\\/); // not Windows absolute
    expect(violations[0].file).not.toMatch(/^\//);       // not POSIX absolute
  });

  it('respects except patterns (CWD-relative)', async () => {
    const violations = await checkLayerDependency(
      baseConfig,
      'apis',
      'components',
      { except: ['tests/fixtures/project/src/apis/**'] }
    );
    expect(violations).toEqual([]);
  });

  it('detects components importing from pages', async () => {
    const violations = await checkLayerDependency(baseConfig, 'components', 'pages', {});
    expect(violations.some(v => v.file.includes('PageDependent'))).toBe(true);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- --reporter=verbose tests/frontend/rules/layerDependency.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/frontend/rules/layerDependency.ts`**

```typescript
import { projectFiles } from 'archunit';
import * as path from 'node:path';
import { matchesAny, toRelative } from '../../utils/glob.js';
import type { ArchConfig, BaseRuleOptions, Violation } from '../../types.js';

export async function checkLayerDependency(
  config: ArchConfig,
  fromLayer: string,
  toLayer: string,
  options: BaseRuleOptions
): Promise<Violation[]> {
  // tsConfigPath is accepted but not passed to archunit in v0.1.0 — archunit
  // auto-detects tsconfig.json from CWD. Future: pass config.tsConfigPath here.
  const fromPattern = path.posix.join(config.root.replace(/\\/g, '/'), fromLayer, '**');
  const toPattern   = path.posix.join(config.root.replace(/\\/g, '/'), toLayer, '**');

  const rule = projectFiles()
    .inFolder(fromPattern)
    .shouldNot()
    .dependOnFiles()
    .inFolder(toPattern);

  const raw = await rule.check({ allowEmptyTests: true });

  return raw
    .map(v => ({ rel: toRelative(v.from), to: toRelative(v.to), raw: v }))
    .filter(({ rel }) => !matchesAny(rel, options.except ?? []))
    .map(({ rel, to }) => ({
      file: rel,
      message: `imports from ${to}`,
    }));
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npm test -- --reporter=verbose tests/frontend/rules/layerDependency.test.ts
```

Expected: 5 tests PASS.

If the archunit API shape differs from `{ from, to }`, update line `toRelative(v.from)` / `toRelative(v.to)` to use the actual property names confirmed in Task 8A.

- [ ] **Step 5: Implement the six thin wrapper files**

`src/frontend/rules/noApisOnComponents.ts`:
```typescript
import { checkLayerDependency } from './layerDependency.js';
import type { ArchConfig, BaseRuleOptions, Violation } from '../../types.js';

export async function noApisOnComponents(config: ArchConfig, options: BaseRuleOptions): Promise<Violation[]> {
  return checkLayerDependency(config, 'apis', 'components', options);
}
```

`src/frontend/rules/noApisOnPages.ts`:
```typescript
import { checkLayerDependency } from './layerDependency.js';
import type { ArchConfig, BaseRuleOptions, Violation } from '../../types.js';

export async function noApisOnPages(config: ArchConfig, options: BaseRuleOptions): Promise<Violation[]> {
  return checkLayerDependency(config, 'apis', 'pages', options);
}
```

`src/frontend/rules/noComponentsOnPages.ts`:
```typescript
import { checkLayerDependency } from './layerDependency.js';
import type { ArchConfig, BaseRuleOptions, Violation } from '../../types.js';

export async function noComponentsOnPages(config: ArchConfig, options: BaseRuleOptions): Promise<Violation[]> {
  return checkLayerDependency(config, 'components', 'pages', options);
}
```

`src/frontend/rules/noHooksOnPages.ts`:
```typescript
import { checkLayerDependency } from './layerDependency.js';
import type { ArchConfig, BaseRuleOptions, Violation } from '../../types.js';

export async function noHooksOnPages(config: ArchConfig, options: BaseRuleOptions): Promise<Violation[]> {
  return checkLayerDependency(config, 'hooks', 'pages', options);
}
```

`src/frontend/rules/noTypesOnRuntime.ts`:
```typescript
import { checkLayerDependency } from './layerDependency.js';
import type { ArchConfig, BaseRuleOptions, Violation } from '../../types.js';

export async function noTypesOnRuntime(config: ArchConfig, options: BaseRuleOptions): Promise<Violation[]> {
  return (await Promise.all([
    checkLayerDependency(config, 'types', 'apis', options),
    checkLayerDependency(config, 'types', 'components', options),
    checkLayerDependency(config, 'types', 'pages', options),
  ])).flat();
}
```

`src/frontend/rules/noConstantsOnRuntime.ts`:
```typescript
import { checkLayerDependency } from './layerDependency.js';
import type { ArchConfig, BaseRuleOptions, Violation } from '../../types.js';

export async function noConstantsOnRuntime(config: ArchConfig, options: BaseRuleOptions): Promise<Violation[]> {
  return (await Promise.all([
    checkLayerDependency(config, 'constants', 'apis', options),
    checkLayerDependency(config, 'constants', 'components', options),
    checkLayerDependency(config, 'constants', 'pages', options),
  ])).flat();
}
```

- [ ] **Step 6: Run full test suite**

```bash
npm test
```

Expected: all tests passing so far.

---

## Task 9: `noCircularDependencies`

**Files:**
- Create: `src/frontend/rules/noCircularDependencies.ts`
- Create: `tests/frontend/rules/noCircularDependencies.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/frontend/rules/noCircularDependencies.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { noCircularDependencies } from '../../src/frontend/rules/noCircularDependencies.js';

const FIXTURE_ROOT = 'tests/fixtures/project/src';
const baseConfig = { root: FIXTURE_ROOT, mode: 'enforce' as const, rules: {} };

describe('noCircularDependencies', () => {
  it('detects circular imports', async () => {
    const violations = await noCircularDependencies(baseConfig, {});
    expect(violations.some(v => v.file.includes('circular'))).toBe(true);
  });

  it('Violation.file is CWD-relative', async () => {
    const violations = await noCircularDependencies(baseConfig, {});
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].file).not.toMatch(/^\//);
    expect(violations[0].file.startsWith('tests/')).toBe(true);
  });

  it('respects except patterns (CWD-relative)', async () => {
    const violations = await noCircularDependencies(baseConfig, {
      except: ['tests/fixtures/project/src/circular/**'],
    });
    expect(violations.every(v => !v.file.includes('circular'))).toBe(true);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- --reporter=verbose tests/frontend/rules/noCircularDependencies.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement `src/frontend/rules/noCircularDependencies.ts`**

```typescript
import { projectFiles } from 'archunit';
import * as path from 'node:path';
import { matchesAny, toRelative } from '../../utils/glob.js';
import type { ArchConfig, BaseRuleOptions, Violation } from '../../types.js';

export async function noCircularDependencies(
  config: ArchConfig,
  options: BaseRuleOptions
): Promise<Violation[]> {
  const srcPattern = path.posix.join(config.root.replace(/\\/g, '/'), '**');

  const rule = projectFiles()
    .inFolder(srcPattern)
    .should()
    .haveNoCycles();

  const raw = await rule.check({ allowEmptyTests: true });

  return raw
    .map(v => ({ rel: toRelative(v.from), to: toRelative(v.to) }))
    .filter(({ rel }) => !matchesAny(rel, options.except ?? []))
    .map(({ rel, to }) => ({
      file: rel,
      message: `part of circular dependency cycle with ${to}`,
    }));
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npm test -- --reporter=verbose tests/frontend/rules/noCircularDependencies.test.ts
```

Expected: 3 tests PASS.

---

## Task 10: `requireBarrelExports`

**Files:**
- Create: `src/frontend/rules/requireBarrelExports.ts`
- Create: `tests/frontend/rules/requireBarrelExports.test.ts`

Violation shape: `Violation.file` is the missing barrel path (e.g. `src/components/NoBarrel/index.ts`), message is `'barrel export missing'`. This makes except patterns work uniformly: `'src/components/NoBarrel/**'` matches `src/components/NoBarrel/index.ts`.

- [ ] **Step 1: Write the failing tests**

Create `tests/frontend/rules/requireBarrelExports.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { requireBarrelExports } from '../../src/frontend/rules/requireBarrelExports.js';

const FIXTURE_ROOT = 'tests/fixtures/project/src';
const baseConfig = { root: FIXTURE_ROOT, mode: 'enforce' as const, rules: {} };

describe('requireBarrelExports', () => {
  it('reports the missing index.ts path for a component directory without a barrel', async () => {
    const violations = await requireBarrelExports(baseConfig, {});
    expect(violations.some(v => v.file.includes('NoBarrel/index.ts'))).toBe(true);
    expect(violations[0].message).toBe('barrel export missing');
  });

  it('does not flag directories that have index.ts', async () => {
    const violations = await requireBarrelExports(baseConfig, {});
    expect(violations.every(v => !v.file.includes('Button'))).toBe(true);
  });

  it('Violation.file is CWD-relative', async () => {
    const violations = await requireBarrelExports(baseConfig, {});
    expect(violations.every(v => v.file.startsWith('tests/fixtures/'))).toBe(true);
    expect(violations.every(v => !v.file.startsWith('/'))).toBe(true);
  });

  it('respects except patterns matched against missing-file path', async () => {
    const violations = await requireBarrelExports(baseConfig, {
      except: ['tests/fixtures/project/src/components/NoBarrel/**'],
    });
    expect(violations.every(v => !v.file.includes('NoBarrel'))).toBe(true);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- --reporter=verbose tests/frontend/rules/requireBarrelExports.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement `src/frontend/rules/requireBarrelExports.ts`**

```typescript
import * as fs from 'node:fs';
import * as path from 'node:path';
import { matchesAny, toRelative } from '../../utils/glob.js';
import type { ArchConfig, BaseRuleOptions, Violation } from '../../types.js';

export async function requireBarrelExports(
  config: ArchConfig,
  options: BaseRuleOptions
): Promise<Violation[]> {
  const absComponentsDir = path.resolve(config.root, 'components');
  if (!fs.existsSync(absComponentsDir)) return [];

  const entries = fs.readdirSync(absComponentsDir, { withFileTypes: true });
  const violations: Violation[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const absDir = path.join(absComponentsDir, entry.name);
    const hasBarrel =
      fs.existsSync(path.join(absDir, 'index.ts')) ||
      fs.existsSync(path.join(absDir, 'index.tsx'));

    if (!hasBarrel) {
      const missingFile = toRelative(path.join(absDir, 'index.ts'));
      if (!matchesAny(missingFile, options.except ?? [])) {
        violations.push({ file: missingFile, message: 'barrel export missing' });
      }
    }
  }

  return violations;
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npm test -- --reporter=verbose tests/frontend/rules/requireBarrelExports.test.ts
```

Expected: 4 tests PASS.

---

## Task 11: `requirePathAlias`

**Files:**
- Create: `src/frontend/rules/requirePathAlias.ts`
- Create: `tests/frontend/rules/requirePathAlias.test.ts`

Flags any import specifier that starts with `..`. `glob` returns CWD-relative paths, so no `toRelative` needed for the file path — just normalize slashes.

- [ ] **Step 1: Write the failing tests**

Create `tests/frontend/rules/requirePathAlias.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { requirePathAlias } from '../../src/frontend/rules/requirePathAlias.js';

const FIXTURE_ROOT = 'tests/fixtures/project/src';
const baseConfig = { root: FIXTURE_ROOT, mode: 'enforce' as const, rules: {} };

describe('requirePathAlias', () => {
  it('detects relative cross-directory imports using ../', async () => {
    const violations = await requirePathAlias(baseConfig, {});
    expect(violations.some(v => v.file.includes('RelativeImporter'))).toBe(true);
  });

  it('does not flag same-directory ./foo imports', async () => {
    const violations = await requirePathAlias(baseConfig, {});
    // Button/index.ts uses './Button.js' — same directory, allowed
    expect(violations.every(v => !v.file.includes('Button/index'))).toBe(true);
  });

  it('Violation.file is CWD-relative', async () => {
    const violations = await requirePathAlias(baseConfig, {});
    expect(violations.every(v => v.file.startsWith('tests/fixtures/'))).toBe(true);
    expect(violations.every(v => !v.file.startsWith('/'))).toBe(true);
  });

  it('respects except patterns', async () => {
    const violations = await requirePathAlias(baseConfig, {
      except: ['tests/fixtures/project/src/components/RelativeImporter.ts'],
    });
    expect(violations.every(v => !v.file.includes('RelativeImporter'))).toBe(true);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- --reporter=verbose tests/frontend/rules/requirePathAlias.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement `src/frontend/rules/requirePathAlias.ts`**

```typescript
import * as fs from 'node:fs';
import { findFiles, matchesAny } from '../../utils/glob.js';
import type { ArchConfig, BaseRuleOptions, Violation } from '../../types.js';

const IMPORT_RE = /(?:^|\n)\s*(?:import|export)\s+(?:.*?\s+from\s+)?['"]([^'"]+)['"]/g;

export async function requirePathAlias(
  config: ArchConfig,
  options: BaseRuleOptions
): Promise<Violation[]> {
  const pattern = config.root.replace(/\\/g, '/') + '/**/*.{ts,tsx}';
  const files = await findFiles(pattern);
  const violations: Violation[] = [];

  for (const file of files) {
    if (matchesAny(file, options.except ?? [])) continue;

    const content = fs.readFileSync(file, 'utf8');
    IMPORT_RE.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = IMPORT_RE.exec(content)) !== null) {
      if (match[1].startsWith('..')) {
        violations.push({
          file,
          message: `uses relative cross-directory import '${match[1]}' — use @/ alias instead`,
        });
        break;
      }
    }
  }

  return violations;
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npm test -- --reporter=verbose tests/frontend/rules/requirePathAlias.test.ts
```

Expected: 4 tests PASS.

> Several fixture files use `../` (e.g. `badApi.ts`, `badHook.ts`, `badConstant.ts`, `badType.ts`, `PageDependent.tsx`). These are all intended violations for other rules. The `require-path-alias` test only checks presence of `RelativeImporter` in violations, not that it is the only violation — so this is correct.

---

## Task 12: `requireErrorHierarchy` and `errorsExtendAgError`

**Files:**
- Create: `src/frontend/rules/requireErrorHierarchy.ts`
- Create: `src/frontend/rules/errorsExtendAgError.ts`
- Create: `tests/frontend/rules/requireErrorHierarchy.test.ts`
- Create: `tests/frontend/rules/errorsExtendAgError.test.ts`

Both rules use `fs.readFileSync` + regex (Category B), not archunit. See Assumptions for rationale.

**Root class auto-detection:**
- Scan all `*.ts` files in `<root>/errors/` excluding `index.ts`
- Root class = the single file that contains `@australiangreens/ag-error` in its source AND has no relative (`./`) imports (meaning it doesn't import from another errors/ file)
- Throw `Error` if zero or multiple candidates

**`importsFromRelative(content)`** returns true if the file has any `from '.` import — the standard way error hierarchy files reference each other.

- [ ] **Step 1: Write the failing tests for `requireErrorHierarchy`**

Create `tests/frontend/rules/requireErrorHierarchy.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { requireErrorHierarchy } from '../../src/frontend/rules/requireErrorHierarchy.js';

const FIXTURE_ROOT = 'tests/fixtures/project/src';
const baseConfig = { root: FIXTURE_ROOT, mode: 'enforce' as const, rules: {} };

describe('requireErrorHierarchy', () => {
  it('returns no violations when all non-root error files import from errors/', async () => {
    const violations = await requireErrorHierarchy(baseConfig, {});
    expect(violations).toEqual([]);
  });

  it('returns empty when errors/ directory does not exist', async () => {
    const config = { ...baseConfig, root: 'tests/fixtures/project/src/hooks' };
    const violations = await requireErrorHierarchy(config, {});
    expect(violations).toEqual([]);
  });

  it('throws when no root error class can be auto-detected', async () => {
    const config = { ...baseConfig, root: 'tests/fixtures/bad-errors/src' };
    await expect(requireErrorHierarchy(config, {})).rejects.toThrow(
      'require-error-hierarchy: auto-detection found 0 root error class candidates'
    );
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- --reporter=verbose tests/frontend/rules/requireErrorHierarchy.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement `src/frontend/rules/requireErrorHierarchy.ts`**

```typescript
import * as fs from 'node:fs';
import * as path from 'node:path';
import { findFiles, matchesAny, toRelative } from '../../utils/glob.js';
import type { ArchConfig, RequireErrorHierarchyOptions, Violation } from '../../types.js';

function importsFromRelative(content: string): boolean {
  return /from\s+['"]\./m.test(content);
}

function importsFromAgError(content: string): boolean {
  return content.includes('@australiangreens/ag-error');
}

export async function requireErrorHierarchy(
  config: ArchConfig,
  options: RequireErrorHierarchyOptions
): Promise<Violation[]> {
  const absErrorsDir = path.resolve(config.root, 'errors');
  if (!fs.existsSync(absErrorsDir)) return [];

  const allFiles = await findFiles(
    path.posix.join(absErrorsDir.replace(/\\/g, '/'), '**/*.ts')
  );
  const nonIndexFiles = allFiles.filter(f => !f.endsWith('index.ts'));

  let rootFile: string;

  if (options.rootErrorClass) {
    rootFile = toRelative(path.join(absErrorsDir, options.rootErrorClass));
  } else {
    const candidates = nonIndexFiles.filter(f => {
      const content = fs.readFileSync(f, 'utf8');
      return importsFromAgError(content) && !importsFromRelative(content);
    });

    if (candidates.length === 0) {
      throw new Error(
        `require-error-hierarchy: auto-detection found 0 root error class candidates in ${toRelative(absErrorsDir)}`
      );
    }
    if (candidates.length > 1) {
      throw new Error(
        `require-error-hierarchy: auto-detection found ${candidates.length} root error class candidates: ${candidates.join(', ')}`
      );
    }
    rootFile = candidates[0];
  }

  const violations: Violation[] = [];

  for (const file of nonIndexFiles) {
    if (file === rootFile) continue;
    if (matchesAny(file, options.except ?? [])) continue;

    const content = fs.readFileSync(file, 'utf8');
    if (!importsFromRelative(content)) {
      violations.push({
        file,
        message: 'does not import from another src/errors/** file (not part of error hierarchy)',
      });
    }
  }

  return violations;
}
```

- [ ] **Step 4: Run `requireErrorHierarchy` tests — expect pass**

```bash
npm test -- --reporter=verbose tests/frontend/rules/requireErrorHierarchy.test.ts
```

Expected: 3 tests PASS.

- [ ] **Step 5: Write the failing tests for `errorsExtendAgError`**

Create `tests/frontend/rules/errorsExtendAgError.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { errorsExtendAgError } from '../../src/frontend/rules/errorsExtendAgError.js';

const FIXTURE_ROOT = 'tests/fixtures/project/src';
const baseConfig = { root: FIXTURE_ROOT, mode: 'enforce' as const, rules: {} };

describe('errorsExtendAgError', () => {
  it('returns no violations when root error class imports from ag-error', async () => {
    const violations = await errorsExtendAgError(baseConfig, {});
    expect(violations).toEqual([]);
  });

  it('returns empty when errors/ directory does not exist', async () => {
    const config = { ...baseConfig, root: 'tests/fixtures/project/src/hooks' };
    const violations = await errorsExtendAgError(config, {});
    expect(violations).toEqual([]);
  });
});
```

- [ ] **Step 6: Run to confirm failure**

```bash
npm test -- --reporter=verbose tests/frontend/rules/errorsExtendAgError.test.ts
```

Expected: FAIL.

- [ ] **Step 7: Implement `src/frontend/rules/errorsExtendAgError.ts`**

```typescript
import * as fs from 'node:fs';
import * as path from 'node:path';
import { findFiles, toRelative } from '../../utils/glob.js';
import type { ArchConfig, RequireErrorHierarchyOptions, Violation } from '../../types.js';

function importsFromRelative(content: string): boolean {
  return /from\s+['"]\./m.test(content);
}

export async function errorsExtendAgError(
  config: ArchConfig,
  options: RequireErrorHierarchyOptions
): Promise<Violation[]> {
  const absErrorsDir = path.resolve(config.root, 'errors');
  if (!fs.existsSync(absErrorsDir)) return [];

  const allFiles = await findFiles(
    path.posix.join(absErrorsDir.replace(/\\/g, '/'), '**/*.ts')
  );
  const nonIndexFiles = allFiles.filter(f => !f.endsWith('index.ts'));

  let rootFile: string;

  if (options.rootErrorClass) {
    rootFile = toRelative(path.join(absErrorsDir, options.rootErrorClass));
  } else {
    const candidates = nonIndexFiles.filter(f => {
      const content = fs.readFileSync(f, 'utf8');
      return content.includes('@australiangreens/ag-error') && !importsFromRelative(content);
    });

    if (candidates.length === 0) {
      throw new Error(
        `errors-extend-ag-error: auto-detection found 0 root error class candidates in ${toRelative(absErrorsDir)}`
      );
    }
    if (candidates.length > 1) {
      throw new Error(
        `errors-extend-ag-error: auto-detection found ${candidates.length} root error class candidates: ${candidates.join(', ')}`
      );
    }
    rootFile = candidates[0];
  }

  const content = fs.readFileSync(rootFile, 'utf8');
  if (!content.includes('@australiangreens/ag-error')) {
    return [{
      file: rootFile,
      message: 'root error class does not import from @australiangreens/ag-error',
    }];
  }

  return [];
}
```

> **Refactoring note:** `requireErrorHierarchy` and `errorsExtendAgError` duplicate the root-class detection logic. If maintaining both becomes friction, extract it to `src/frontend/rules/errorHierarchyUtils.ts`. Hold off until both are working.

- [ ] **Step 8: Run both tests**

```bash
npm test -- --reporter=verbose tests/frontend/rules/requireErrorHierarchy.test.ts tests/frontend/rules/errorsExtendAgError.test.ts
```

Expected: all tests PASS.

---

## Task 13: `requireTestTypeSuffix`

**Files:**
- Create: `src/frontend/rules/requireTestTypeSuffix.ts`
- Create: `tests/frontend/rules/requireTestTypeSuffix.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/frontend/rules/requireTestTypeSuffix.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { requireTestTypeSuffix } from '../../src/frontend/rules/requireTestTypeSuffix.js';

const FIXTURE_ROOT = 'tests/fixtures/project/src';
const baseConfig = { root: FIXTURE_ROOT, mode: 'enforce' as const, rules: {} };

describe('requireTestTypeSuffix', () => {
  it('detects test files missing a type suffix', async () => {
    const violations = await requireTestTypeSuffix(baseConfig, {});
    expect(violations.some(v => v.file.includes('badTest.test'))).toBe(true);
  });

  it('does not flag correctly-suffixed test files', async () => {
    const violations = await requireTestTypeSuffix(baseConfig, {});
    expect(violations.every(v => !v.file.includes('useFeature.unit.test'))).toBe(true);
  });

  it('respects custom allowedSuffixes', async () => {
    const violations = await requireTestTypeSuffix(baseConfig, {
      allowedSuffixes: ['unit', 'comp', 'int', 'e2e'],
    });
    expect(violations.some(v => v.file.includes('badTest.test'))).toBe(true);
  });

  it('Violation.file is CWD-relative', async () => {
    const violations = await requireTestTypeSuffix(baseConfig, {});
    expect(violations.every(v => v.file.startsWith('tests/fixtures/'))).toBe(true);
    expect(violations.every(v => !v.file.startsWith('/'))).toBe(true);
  });

  it('respects except patterns', async () => {
    const violations = await requireTestTypeSuffix(baseConfig, {
      except: ['tests/fixtures/project/src/hooks/badTest.test.ts'],
    });
    expect(violations.every(v => !v.file.includes('badTest'))).toBe(true);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- --reporter=verbose tests/frontend/rules/requireTestTypeSuffix.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement `src/frontend/rules/requireTestTypeSuffix.ts`**

```typescript
import * as path from 'node:path';
import { findFiles, matchesAny } from '../../utils/glob.js';
import type { ArchConfig, RequireTestTypeSuffixOptions, Violation } from '../../types.js';

const DEFAULT_SUFFIXES = ['unit', 'comp', 'int'];

export async function requireTestTypeSuffix(
  config: ArchConfig,
  options: RequireTestTypeSuffixOptions
): Promise<Violation[]> {
  const allowedSuffixes = options.allowedSuffixes ?? DEFAULT_SUFFIXES;
  const pattern = config.root.replace(/\\/g, '/') + '/**/*.{test,spec}.{ts,tsx,js,jsx}';
  const files = await findFiles(pattern);
  const violations: Violation[] = [];

  for (const file of files) {
    if (matchesAny(file, options.except ?? [])) continue;

    const basename = path.basename(file);
    const hasValidSuffix = allowedSuffixes.some(suffix =>
      new RegExp(`\\.${suffix}\\.(?:test|spec)\\.`).test(basename)
    );

    if (!hasValidSuffix) {
      violations.push({
        file,
        message: `test file must be named *.{${allowedSuffixes.join('|')}}.test.* — got '${basename}'`,
      });
    }
  }

  return violations;
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npm test -- --reporter=verbose tests/frontend/rules/requireTestTypeSuffix.test.ts
```

Expected: 5 tests PASS.

---

## Task 14: `requireHookPrefix`

**Files:**
- Create: `src/frontend/rules/requireHookPrefix.ts`
- Create: `tests/frontend/rules/requireHookPrefix.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/frontend/rules/requireHookPrefix.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { requireHookPrefix } from '../../src/frontend/rules/requireHookPrefix.js';

const FIXTURE_ROOT = 'tests/fixtures/project/src';
const baseConfig = { root: FIXTURE_ROOT, mode: 'enforce' as const, rules: {} };

describe('requireHookPrefix', () => {
  it('detects hook files not prefixed with use', async () => {
    const violations = await requireHookPrefix(baseConfig, {});
    expect(violations.some(v => v.file.includes('badHook'))).toBe(true);
  });

  it('does not flag files correctly prefixed with use', async () => {
    const violations = await requireHookPrefix(baseConfig, {});
    expect(violations.every(v => !v.file.includes('useUser'))).toBe(true);
  });

  it('does not flag test files inside hooks/', async () => {
    const violations = await requireHookPrefix(baseConfig, {});
    expect(violations.every(v => !v.file.includes('.test.'))).toBe(true);
    expect(violations.every(v => !v.file.includes('.spec.'))).toBe(true);
  });

  it('Violation.file is CWD-relative', async () => {
    const violations = await requireHookPrefix(baseConfig, {});
    expect(violations.every(v => v.file.startsWith('tests/fixtures/'))).toBe(true);
    expect(violations.every(v => !v.file.startsWith('/'))).toBe(true);
  });

  it('respects except patterns', async () => {
    const violations = await requireHookPrefix(baseConfig, {
      except: ['tests/fixtures/project/src/hooks/badHook.ts'],
    });
    expect(violations.every(v => !v.file.includes('badHook'))).toBe(true);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- --reporter=verbose tests/frontend/rules/requireHookPrefix.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement `src/frontend/rules/requireHookPrefix.ts`**

```typescript
import * as path from 'node:path';
import { findFiles, matchesAny } from '../../utils/glob.js';
import type { ArchConfig, BaseRuleOptions, Violation } from '../../types.js';

export async function requireHookPrefix(
  config: ArchConfig,
  options: BaseRuleOptions
): Promise<Violation[]> {
  const pattern = path.posix.join(config.root.replace(/\\/g, '/'), 'hooks', '**', '*.{ts,tsx}');
  const files = await findFiles(pattern);
  const violations: Violation[] = [];

  for (const file of files) {
    const basename = path.basename(file);
    if (/\.(test|spec)\./.test(basename)) continue;
    if (matchesAny(file, options.except ?? [])) continue;

    if (!basename.startsWith('use')) {
      violations.push({
        file,
        message: `hook file '${basename}' must start with 'use'`,
      });
    }
  }

  return violations;
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npm test -- --reporter=verbose tests/frontend/rules/requireHookPrefix.test.ts
```

Expected: 5 tests PASS.

---

## Task 15: `maxFileLines`

**Files:**
- Create: `src/frontend/rules/maxFileLines.ts`
- Create: `tests/frontend/rules/maxFileLines.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/frontend/rules/maxFileLines.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { maxFileLines } from '../../src/frontend/rules/maxFileLines.js';

const FIXTURE_ROOT = 'tests/fixtures/project/src';
const baseConfig = { root: FIXTURE_ROOT, mode: 'enforce' as const, rules: {} };

describe('maxFileLines', () => {
  it('detects a .tsx file exceeding the 400-line default', async () => {
    const violations = await maxFileLines(baseConfig, {});
    expect(violations.some(v => v.file.includes('LongPage.tsx'))).toBe(true);
  });

  it('does not flag files within the limit', async () => {
    const violations = await maxFileLines(baseConfig, {});
    expect(violations.every(v => !v.file.includes('HomePage.tsx'))).toBe(true);
  });

  it('respects custom tsx limit', async () => {
    // LongPage.tsx has 401 lines; limit 500 should not flag it
    const violations = await maxFileLines(baseConfig, { tsx: 500 });
    expect(violations.every(v => !v.file.includes('LongPage.tsx'))).toBe(true);
  });

  it('excludes test files', async () => {
    const violations = await maxFileLines(baseConfig, {});
    expect(violations.every(v => !v.file.includes('.test.'))).toBe(true);
    expect(violations.every(v => !v.file.includes('.spec.'))).toBe(true);
  });

  it('Violation.file is CWD-relative', async () => {
    const violations = await maxFileLines(baseConfig, {});
    expect(violations.every(v => v.file.startsWith('tests/fixtures/'))).toBe(true);
    expect(violations.every(v => !v.file.startsWith('/'))).toBe(true);
  });

  it('respects except patterns', async () => {
    const violations = await maxFileLines(baseConfig, {
      except: ['tests/fixtures/project/src/pages/LongPage.tsx'],
    });
    expect(violations.every(v => !v.file.includes('LongPage'))).toBe(true);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- --reporter=verbose tests/frontend/rules/maxFileLines.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement `src/frontend/rules/maxFileLines.ts`**

```typescript
import * as fs from 'node:fs';
import * as path from 'node:path';
import { findFiles, matchesAny } from '../../utils/glob.js';
import type { ArchConfig, MaxFileLinesOptions, Violation } from '../../types.js';

const DEFAULT_TSX_LIMIT = 400;
const DEFAULT_TS_LIMIT  = 300;

export async function maxFileLines(
  config: ArchConfig,
  options: MaxFileLinesOptions
): Promise<Violation[]> {
  const tsxLimit = options.tsx ?? DEFAULT_TSX_LIMIT;
  const tsLimit  = options.ts  ?? DEFAULT_TS_LIMIT;

  const pattern = config.root.replace(/\\/g, '/') + '/**/*.{ts,tsx}';
  const files = await findFiles(pattern);
  const violations: Violation[] = [];

  for (const file of files) {
    const basename = path.basename(file);
    if (/\.(test|spec)\./.test(basename)) continue;
    if (matchesAny(file, options.except ?? [])) continue;

    const content = fs.readFileSync(file, 'utf8');
    const lineCount = content.split('\n').length;
    const limit = file.endsWith('.tsx') ? tsxLimit : tsLimit;

    if (lineCount > limit) {
      violations.push({
        file,
        message: `exceeds ${limit} lines (${lineCount} actual)`,
      });
    }
  }

  return violations;
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npm test -- --reporter=verbose tests/frontend/rules/maxFileLines.test.ts
```

Expected: 6 tests PASS.

---

## Task 16: `evaluate.ts` — Rule Dispatcher

**Files:**
- Create: `src/evaluate.ts`
- Create: `tests/evaluate.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/evaluate.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { evaluate } from '../src/evaluate.js';

const FIXTURE_ROOT = 'tests/fixtures/project/src';
const baseConfig = { root: FIXTURE_ROOT, mode: 'enforce' as const, rules: {} };

describe('evaluate', () => {
  it('dispatches no-apis-depend-on-components and returns violations', async () => {
    const violations = await evaluate('no-apis-depend-on-components', baseConfig, {});
    expect(Array.isArray(violations)).toBe(true);
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].file).not.toMatch(/^\//);
  });

  it('dispatches max-file-lines and returns violations', async () => {
    const violations = await evaluate('max-file-lines', baseConfig, {});
    expect(Array.isArray(violations)).toBe(true);
    expect(violations.some(v => v.file.includes('LongPage'))).toBe(true);
  });

  it('throws for unknown rule names', async () => {
    await expect(evaluate('unknown-rule', baseConfig, {})).rejects.toThrow(
      "Unknown rule: 'unknown-rule'"
    );
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- --reporter=verbose tests/evaluate.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement `src/evaluate.ts`**

```typescript
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
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npm test -- --reporter=verbose tests/evaluate.test.ts
```

Expected: 3 tests PASS.

- [ ] **Step 5: Run full test suite**

```bash
npm test
```

Expected: all tests pass.

---

## Task 17: `runArchRules.ts`

**Files:**
- Create: `src/runArchRules.ts`

`runArchRules` registers Vitest `describe`/`it` blocks at module evaluation time. It cannot be unit-tested without mocking Vitest globals. Implement from the spec and verify via the smoke test in Task 19.

- [ ] **Step 1: Implement `src/runArchRules.ts`**

```typescript
import { describe, it } from 'vitest';
import { normalise }        from './utils/normalise.js';
import { evaluate }         from './evaluate.js';
import { formatViolations } from './format.js';
import type { ArchConfig }  from './types.js';

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

---

## Task 18: `preset.ts` and `index.ts`

**Files:**
- Create: `src/frontend/preset.ts`
- Create: `src/index.ts`

- [ ] **Step 1: Implement `src/frontend/preset.ts`**

```typescript
import type { RulesConfig } from '../types.js';

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
    'max-file-lines':                        ['warn', { tsx: 400, ts: 300 }],
  } satisfies RulesConfig,
} as const;
```

- [ ] **Step 2: Implement `src/index.ts`**

```typescript
export { defineArchConfig } from './defineArchConfig.js';
export { runArchRules }     from './runArchRules.js';
export { agFrontendPreset } from './frontend/preset.js';
export type {
  ArchConfig,
  RulesConfig,
  RuleConfig,
  Violation,
  BaseRuleOptions,
  MaxFileLinesOptions,
  RequireErrorHierarchyOptions,
  RequireTestTypeSuffixOptions,
} from './types.js';
```

- [ ] **Step 3: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit --project tsconfig.json
```

Expected: no errors.

- [ ] **Step 4: Run full test suite**

```bash
npm test
```

Expected: all tests pass.

---

## Task 19: Build and Smoke Test

- [ ] **Step 1: Build the package**

```bash
npm run build
```

Expected: `dist/index.js` and `dist/index.d.ts` created with no errors.

- [ ] **Step 2: Verify dist exports**

```bash
node -e "import('./dist/index.js').then(m => console.log(Object.keys(m)))"
```

Expected output includes: `defineArchConfig`, `runArchRules`, `agFrontendPreset`.

- [ ] **Step 3: Write a smoke-test arch check**

Create `smoke-test/arch.check.ts` (not `.test.ts` — not picked up by vitest.config):

```typescript
import { agFrontendPreset, defineArchConfig, runArchRules } from '../dist/index.js';

runArchRules(defineArchConfig({
  root: 'tests/fixtures/project/src',
  mode: 'report',
  rules: {
    ...agFrontendPreset.rules,
  },
}));
```

- [ ] **Step 4: Run the smoke test**

```bash
npx vitest run --reporter=verbose smoke-test/arch.check.ts
```

Expected: Vitest runs an `Architecture` describe block with 14 `it` tests. Some tests log `[arch] ...` warnings. None fail (mode is `report`).

- [ ] **Step 5: Verify enforce mode fails correctly**

Edit `arch.check.ts`: change `mode` to `'enforce'`. Run again.

Expected: tests with `error`-severity violations (e.g. `no-apis-depend-on-components`) now fail with `[arch] Rule '...' has N violations`.

Revert `mode` to `'report'`.

- [ ] **Step 6: Remove smoke test**

```bash
rm -rf smoke-test/
```

- [ ] **Step 7: Final full test run and build**

```bash
npm test && npm run build
```

Expected: all tests pass, clean build.

---

## Post-Implementation: Publishing

1. Authenticate: `npm login --registry=https://npm.pkg.github.com`
2. Publish: `npm publish`
3. Consuming projects: `npm install --save-dev @australiangreens/ag-arch-rules`
4. Each project adds `arch.check.ts` + `"arch:check"` script per spec section 5.
