# AI Context Init Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an interactive `ag-arch-rules init` CLI command that generates AI tool context files (Cursor `.mdc`, `CLAUDE.md`, `GEMINI.md`) in the consuming project.

**Architecture:** A `src/bin/init.ts` entry point orchestrates two `@clack/prompts` multi-select prompts, then delegates to per-tool generator modules. Generators for Claude and Gemini share a `upsertSentinelSection` utility that creates or replaces a fenced block in an existing markdown file without disturbing surrounding content. Cursor generates standalone `.mdc` files that are always overwritten. Rule content is authored as static template strings, one file per rule set, so the content can be tuned for an AI audience independently of `docs/RULES.md`.

**Tech Stack:** TypeScript, Node.js `fs`, `@clack/prompts` (interactive CLI), `tsup` (build). No new test dependencies.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `tsup.config.ts` | Create | Two-entry tsup config: library bundle + bin bundle with shebang |
| `package.json` | Modify | Add `bin` entry, `@clack/prompts` dep, update build script |
| `src/bin/templates/common.ts` | Create | AI-focused content for common rules |
| `src/bin/templates/frontend.ts` | Create | AI-focused content for frontend rules |
| `src/bin/templates/backend-node.ts` | Create | AI-focused content for backend Node rules |
| `src/bin/templates/cdk.ts` | Create | AI-focused content for CDK rules |
| `src/bin/generators/shared.ts` | Create | `upsertSentinelSection` + `buildMarkdownContent` |
| `src/bin/generators/cursor.ts` | Create | Writes `.cursor/rules/*.mdc` files |
| `src/bin/generators/claude.ts` | Create | Writes/updates `CLAUDE.md` sentinel section |
| `src/bin/generators/gemini.ts` | Create | Writes/updates `GEMINI.md` sentinel section |
| `src/bin/init.ts` | Create | CLI entry point — prompts and delegates to generators |
| `tests/bin/generators/shared.test.ts` | Create | Unit tests for sentinel utility |
| `tests/bin/generators/cursor.test.ts` | Create | Unit tests for Cursor generator |
| `tests/bin/generators/claude.test.ts` | Create | Unit tests for Claude generator |
| `tests/bin/generators/gemini.test.ts` | Create | Unit tests for Gemini generator |

---

## Task 1: Build infrastructure

**Files:**
- Create: `tsup.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Create `tsup.config.ts`**

Replace the inline build args with a config file that handles both the library bundle and the bin bundle. The bin bundle needs a shebang injected at the top.

```typescript
// tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts', 'src/config.ts'],
    format: ['esm'],
    dts: true,
    outDir: 'dist',
  },
  {
    entry: { 'bin/init': 'src/bin/init.ts' },
    format: ['esm'],
    dts: false,
    outDir: 'dist',
    banner: {
      js: '#!/usr/bin/env node',
    },
  },
]);
```

- [ ] **Step 2: Update `package.json`**

Add the `bin` entry pointing at the compiled binary, add `@clack/prompts` as a production dependency, and simplify the build script to use the config file:

```json
{
  "name": "@australiangreens/ag-arch-rules",
  "version": "0.9.1",
  "type": "module",
  "bin": {
    "ag-arch-rules": "./dist/bin/init.js"
  },
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./config": {
      "import": "./dist/config.js",
      "types": "./dist/config.d.ts"
    }
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "tsup",
    "test": "vitest run"
  },
  "peerDependencies": {
    "vitest": ">=1.0.0"
  },
  "dependencies": {
    "@clack/prompts": "^0.9.0",
    "archunit": "^2.1.0",
    "glob": "^11.0.0",
    "madge": "^8.0.0",
    "micromatch": "^4.0.0"
  },
  "devDependencies": {
    "@types/madge": "^5.0.3",
    "@types/micromatch": "^4.0.0",
    "@types/node": "^25.6.0",
    "tsup": "^8.0.0",
    "typescript": "^5.0.0",
    "vitest": "^3.0.0"
  },
  "packageManager": "pnpm@10.30.3"
}
```

- [ ] **Step 3: Install the new dependency**

```bash
pnpm install
```

Expected: `@clack/prompts` appears in `pnpm-lock.yaml`.

- [ ] **Step 4: Verify the build still works**

We cannot build yet (the bin entry doesn't exist), but verify the library bundle builds cleanly:

```bash
pnpm exec tsup src/index.ts src/config.ts --format esm --dts
```

Expected: `dist/index.js`, `dist/index.d.ts`, `dist/config.js`, `dist/config.d.ts` regenerated with no errors.

- [ ] **Step 5: Commit**

```bash
git add tsup.config.ts package.json pnpm-lock.yaml
git commit -m "feat: add tsup.config.ts, bin entry, and @clack/prompts dependency"
```

---

## Task 2: Content templates

**Files:**
- Create: `src/bin/templates/common.ts`
- Create: `src/bin/templates/frontend.ts`
- Create: `src/bin/templates/backend-node.ts`
- Create: `src/bin/templates/cdk.ts`

These files export plain string constants. Content is written for an AI audience: concise, imperative, example-focused. No tests needed — they are data, not logic.

- [ ] **Step 1: Create `src/bin/templates/common.ts`**

```typescript
export const COMMON_RULES = `\
## Common Rules

These rules apply to all project types.

**no-circular-dependencies** — modules must not (transitively) import each other in a cycle. If A imports B and B imports A, both violate this rule. Extract shared logic into a third module.

**no-types-depend-on-runtime-layers** — files in \`src/types/\` must not import from runtime layers (\`apis\`, \`components\`, \`pages\`, \`endpoints\`, \`models\`, \`middlewares\`). Types are structural contracts only.

**no-constants-depend-on-runtime-layers** — files in \`src/constants/\` must not import from runtime layers. Constants are static values; any value that requires a service or component to derive is not a constant.

**require-barrel-exports** — every immediate subdirectory of \`src/components/\` (and other configured directories) must have an \`index.ts\` that re-exports its public API. Always create \`index.ts\` when adding a new subdirectory.

**require-error-hierarchy** — \`src/errors/\` must contain at least one root error class (one that does not extend another local error class). This is the catch-all base for the application's error hierarchy.

**errors-extend-ag-error** — all classes in \`src/errors/\` must extend \`AgError\` from \`@australiangreens/ag-error\`, not the built-in \`Error\`.

\`\`\`ts
// VIOLATION
export class MyError extends Error {}

// Correct
import { AgError } from '@australiangreens/ag-error';
export class MyError extends AgError {}
\`\`\`

**require-test-type-suffix** — test files must include a type suffix before \`.test.\` or \`.spec.\`: \`unit\`, \`comp\`, or \`int\`. Use \`MyService.unit.test.ts\`, not \`MyService.test.ts\`.

**max-file-lines** — source files (excluding tests) must not exceed 400 lines for \`.tsx\` or 300 lines for \`.ts\`. Split files before they hit the limit.`;
```

- [ ] **Step 2: Create `src/bin/templates/frontend.ts`**

```typescript
export const FRONTEND_RULES = `\
## Frontend Rules

**no-apis-depend-on-components** — \`src/apis/\` must not import from \`src/components/\`. APIs are data-fetching abstractions; they must not depend on UI.

**no-apis-depend-on-pages** — \`src/apis/\` must not import from \`src/pages/\`. Pages are top-level route containers; nothing lower should depend on them.

**no-components-depend-on-pages** — \`src/components/\` must not import from \`src/pages/\`. A reusable component that references a specific page cannot be reused elsewhere.

\`\`\`tsx
// VIOLATION — src/components/Header.tsx
import { DashboardPage } from '../pages/DashboardPage';
\`\`\`

**no-hooks-depend-on-pages** — \`src/hooks/\` must not import from \`src/pages/\`. Hooks encapsulate reusable logic; depending on a specific page makes them non-reusable.

**require-path-alias** — files must not use \`../\` relative imports that cross directory boundaries. Use the \`@/\` path alias instead.

\`\`\`ts
// VIOLATION
import { fetchUser } from '../../apis/userApi';

// Correct
import { fetchUser } from '@/apis/userApi';
\`\`\`

**require-hook-prefix** — custom hook files in \`src/hooks/\` must start with \`use\` (e.g. \`useUser.ts\`). This matches the React hooks naming convention.`;
```

- [ ] **Step 3: Create `src/bin/templates/backend-node.ts`**

```typescript
export const BACKEND_NODE_RULES = `\
## Backend Node Rules

**no-endpoints-depend-on-endpoints** — router modules must not import from other endpoint features. Each feature must be self-contained. The root \`endpoints/index.ts\` aggregator is exempt.

\`\`\`ts
// VIOLATION — src/endpoints/lists/index.ts
import groupsRouter from '../groups';
\`\`\`

**no-models-depend-on-endpoints** — \`src/models/\` must not import from \`src/endpoints/\`. The data layer must remain agnostic of HTTP concerns.

**no-middleware-depends-on-models** — \`src/middlewares/\` should not import from domain model layers (\`src/models/domain/\`, \`src/models/db/\`). Middleware handles cross-cutting concerns (auth, error formatting); it must not reach into business logic.

**require-validation-schema** — every endpoint directory that contains an \`index.ts\` router must also contain a \`validationSchemas.ts\` file. Request validation must be explicit and auditable for every endpoint.

\`\`\`
src/endpoints/reports/
  index.ts              ✓
  validationSchemas.ts  ✗ VIOLATION — missing
\`\`\`

**restrict-db-client-to-approved-zones** — only files matching the configured approved globs (default: \`src/models/db/**\`) may import DB client modules. Endpoints must not import the DB client directly.`;
```

- [ ] **Step 4: Create `src/bin/templates/cdk.ts`**

```typescript
export const CDK_RULES = `\
## CDK Rules

### Infrastructure

**require-custom-nodejs-construct** — \`infra/constructs/\` must contain a \`NodejsFunction\` wrapper construct with shared runtime defaults. Do not use CDK's \`NodejsFunction\` directly in stacks; always go through the project's wrapper.

**require-node-runtime-22** — all Lambda functions must use \`Runtime.NODEJS_22_X\`. Older runtimes are not permitted.

**require-esbuild-source-maps** — all \`NodejsFunction\` bundling configs must enable source maps (\`sourceMap: true\`).

**require-pay-per-request-billing** — all DynamoDB tables must use \`BillingMode.PAY_PER_REQUEST\`. Provisioned capacity is not permitted.

**require-dynamo-removal-policy** — all DynamoDB tables must declare an explicit \`removalPolicy\`. Do not rely on the CDK default.

**no-hardcoded-secret-values** — infra files must not contain hardcoded string literals for keys matching \`SECRET\`, \`API_KEY\`, \`PASSWORD\`, or \`TOKEN\`. Read sensitive values from \`process.env.*\` at synthesis time.

\`\`\`ts
// VIOLATION
SOME_API_KEY: 'abc123'

// Correct
SOME_API_KEY: process.env.SOME_API_KEY ?? ''
\`\`\`

**require-secrets-manager-grants** — if Secrets Manager secrets are used, the consuming Lambda execution role must be granted read access via \`.grantRead()\`.

**require-api-authentication** — all API Gateway routes must have an authorizer configured. Unauthenticated routes are not permitted without an explicit exception.

### Lambda handlers

**no-lambda-imports-from-infra** — lambda handler code must not import from \`infra/\`. Keep lambda business logic and CDK infrastructure code strictly separate.

**require-lambda-handler-export** — every lambda handler file must export a \`handler\` function as a named export.

\`\`\`ts
// Correct
export const handler = async (event: APIGatewayProxyEvent) => { ... };
\`\`\`

### Project structure

**require-cdk-json** — the project root must contain a \`cdk.json\` file.

**require-bin-directory** — the project root must contain a \`bin/\` directory (CDK app entry points live here).

**require-infra-directory** — the project root must contain an \`infra/\` directory (constructs and stacks live here).

**require-env-local-example** — the project root must contain \`.env.local.example\` documenting required environment variables for local development.`;
```

- [ ] **Step 5: Commit**

```bash
git add src/bin/templates/
git commit -m "feat: add AI-focused rule content templates"
```

---

## Task 3: Shared sentinel utility

**Files:**
- Create: `src/bin/generators/shared.ts`
- Create: `tests/bin/generators/shared.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/bin/generators/shared.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { upsertSentinelSection, buildMarkdownContent } from '../../../src/bin/generators/shared.js';

describe('upsertSentinelSection', () => {
  it('appends sentinel block when file is empty', () => {
    const result = upsertSentinelSection('', 'section content');
    expect(result).toContain('<!-- ag-arch-rules: begin -->');
    expect(result).toContain('section content');
    expect(result).toContain('<!-- ag-arch-rules: end -->');
  });

  it('appends sentinel block when file has no existing sentinel', () => {
    const result = upsertSentinelSection('# My File\n\nExisting content.\n', 'section content');
    expect(result).toContain('# My File');
    expect(result).toContain('Existing content.');
    expect(result).toContain('<!-- ag-arch-rules: begin -->');
    expect(result).toContain('section content');
  });

  it('replaces section between sentinels on re-run', () => {
    const existing = [
      '# My File',
      '',
      '<!-- ag-arch-rules: begin -->',
      'old content',
      '<!-- ag-arch-rules: end -->',
      '',
      'After sentinel.',
    ].join('\n');

    const result = upsertSentinelSection(existing, 'new content');
    expect(result).toContain('new content');
    expect(result).not.toContain('old content');
    expect(result).toContain('After sentinel.');
    expect(result).toContain('# My File');
  });

  it('preserves content before and after the sentinel block', () => {
    const existing = [
      'Before content.',
      '',
      '<!-- ag-arch-rules: begin -->',
      'old',
      '<!-- ag-arch-rules: end -->',
      '',
      'After content.',
    ].join('\n');

    const result = upsertSentinelSection(existing, 'new');
    expect(result.indexOf('Before content.')).toBeLessThan(result.indexOf('ag-arch-rules: begin'));
    expect(result.indexOf('After content.')).toBeGreaterThan(result.indexOf('ag-arch-rules: end'));
  });
});

describe('buildMarkdownContent', () => {
  it('always includes the version header', () => {
    const result = buildMarkdownContent([], '1.2.3');
    expect(result).toContain('ag-arch-rules v1.2.3');
  });

  it('always includes common rules', () => {
    const result = buildMarkdownContent([], '1.0.0');
    expect(result).toContain('Common Rules');
  });

  it('includes frontend rules when frontend preset is selected', () => {
    const result = buildMarkdownContent(['frontend'], '1.0.0');
    expect(result).toContain('Frontend Rules');
  });

  it('includes backend-node rules when backend-node preset is selected', () => {
    const result = buildMarkdownContent(['backend-node'], '1.0.0');
    expect(result).toContain('Backend Node Rules');
  });

  it('includes cdk rules when cdk preset is selected', () => {
    const result = buildMarkdownContent(['cdk'], '1.0.0');
    expect(result).toContain('CDK Rules');
  });

  it('excludes frontend rules when not selected', () => {
    const result = buildMarkdownContent(['cdk'], '1.0.0');
    expect(result).not.toContain('Frontend Rules');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test tests/bin/generators/shared.test.ts
```

Expected: FAIL — `Cannot find module '../../../src/bin/generators/shared.js'`

- [ ] **Step 3: Create `src/bin/generators/shared.ts`**

```typescript
import { COMMON_RULES } from '../templates/common.js';
import { FRONTEND_RULES } from '../templates/frontend.js';
import { BACKEND_NODE_RULES } from '../templates/backend-node.js';
import { CDK_RULES } from '../templates/cdk.js';

const SENTINEL_BEGIN = '<!-- ag-arch-rules: begin -->';
const SENTINEL_END = '<!-- ag-arch-rules: end -->';

const PRESET_CONTENT: Record<string, string> = {
  frontend: FRONTEND_RULES,
  'backend-node': BACKEND_NODE_RULES,
  cdk: CDK_RULES,
};

export function upsertSentinelSection(existingContent: string, newSection: string): string {
  const block = `${SENTINEL_BEGIN}\n${newSection}\n${SENTINEL_END}`;
  const beginIdx = existingContent.indexOf(SENTINEL_BEGIN);
  const endIdx = existingContent.indexOf(SENTINEL_END);

  if (beginIdx !== -1 && endIdx !== -1) {
    return (
      existingContent.slice(0, beginIdx) +
      block +
      existingContent.slice(endIdx + SENTINEL_END.length)
    );
  }

  const separator = existingContent.length > 0
    ? (existingContent.endsWith('\n\n') ? '' : existingContent.endsWith('\n') ? '\n' : '\n\n')
    : '';
  return `${existingContent}${separator}${block}\n`;
}

export function buildMarkdownContent(selectedPresets: string[], version: string): string {
  const header = `<!-- Generated by ag-arch-rules v${version} — re-run \`ag-arch-rules init\` to update. -->`;
  const sections = [header, COMMON_RULES];
  for (const preset of selectedPresets) {
    const content = PRESET_CONTENT[preset];
    if (content) sections.push(content);
  }
  return sections.join('\n\n');
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test tests/bin/generators/shared.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/bin/generators/shared.ts tests/bin/generators/shared.test.ts
git commit -m "feat: add upsertSentinelSection and buildMarkdownContent utilities"
```

---

## Task 4: Cursor generator

**Files:**
- Create: `src/bin/generators/cursor.ts`
- Create: `tests/bin/generators/cursor.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/bin/generators/cursor.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { generateCursor } from '../../../src/bin/generators/cursor.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ag-arch-cursor-'));
});

describe('generateCursor', () => {
  it('creates .cursor/rules/ directory if absent', () => {
    generateCursor(tmpDir, [], '1.0.0');
    expect(fs.existsSync(path.join(tmpDir, '.cursor', 'rules'))).toBe(true);
  });

  it('always writes the common .mdc file', () => {
    generateCursor(tmpDir, [], '1.0.0');
    const file = path.join(tmpDir, '.cursor', 'rules', 'ag-arch-rules-common.mdc');
    expect(fs.existsSync(file)).toBe(true);
  });

  it('common .mdc has alwaysApply: true frontmatter', () => {
    generateCursor(tmpDir, [], '1.0.0');
    const content = fs.readFileSync(
      path.join(tmpDir, '.cursor', 'rules', 'ag-arch-rules-common.mdc'),
      'utf8',
    );
    expect(content).toContain('alwaysApply: true');
  });

  it('writes a preset .mdc for each selected preset', () => {
    generateCursor(tmpDir, ['frontend', 'cdk'], '1.0.0');
    expect(fs.existsSync(path.join(tmpDir, '.cursor', 'rules', 'ag-arch-rules-frontend.mdc'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.cursor', 'rules', 'ag-arch-rules-cdk.mdc'))).toBe(true);
  });

  it('does not write .mdc for unselected presets', () => {
    generateCursor(tmpDir, ['frontend'], '1.0.0');
    expect(fs.existsSync(path.join(tmpDir, '.cursor', 'rules', 'ag-arch-rules-backend-node.mdc'))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, '.cursor', 'rules', 'ag-arch-rules-cdk.mdc'))).toBe(false);
  });

  it('preset .mdc has alwaysApply: false and a globs entry', () => {
    generateCursor(tmpDir, ['frontend'], '1.0.0');
    const content = fs.readFileSync(
      path.join(tmpDir, '.cursor', 'rules', 'ag-arch-rules-frontend.mdc'),
      'utf8',
    );
    expect(content).toContain('alwaysApply: false');
    expect(content).toContain('globs:');
  });

  it('includes the version in the generated file header', () => {
    generateCursor(tmpDir, [], '2.3.4');
    const content = fs.readFileSync(
      path.join(tmpDir, '.cursor', 'rules', 'ag-arch-rules-common.mdc'),
      'utf8',
    );
    expect(content).toContain('v2.3.4');
  });

  it('returns the list of files written', () => {
    const written = generateCursor(tmpDir, ['frontend'], '1.0.0');
    expect(written).toContain('.cursor/rules/ag-arch-rules-common.mdc');
    expect(written).toContain('.cursor/rules/ag-arch-rules-frontend.mdc');
  });

  it('overwrites existing .mdc files on re-run', () => {
    const rulesDir = path.join(tmpDir, '.cursor', 'rules');
    fs.mkdirSync(rulesDir, { recursive: true });
    const file = path.join(rulesDir, 'ag-arch-rules-common.mdc');
    fs.writeFileSync(file, 'old content');

    generateCursor(tmpDir, [], '1.0.0');

    const content = fs.readFileSync(file, 'utf8');
    expect(content).not.toBe('old content');
    expect(content).toContain('ag-arch-rules');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test tests/bin/generators/cursor.test.ts
```

Expected: FAIL — `Cannot find module '../../../src/bin/generators/cursor.js'`

- [ ] **Step 3: Create `src/bin/generators/cursor.ts`**

```typescript
import * as fs from 'node:fs';
import * as path from 'node:path';
import { COMMON_RULES } from '../templates/common.js';
import { FRONTEND_RULES } from '../templates/frontend.js';
import { BACKEND_NODE_RULES } from '../templates/backend-node.js';
import { CDK_RULES } from '../templates/cdk.js';

interface PresetConfig {
  description: string;
  globs: string;
  content: string;
}

const PRESET_CONFIGS: Record<string, PresetConfig> = {
  frontend: {
    description: 'AG architectural rules — frontend layer constraints for React/TypeScript',
    globs: 'src/components/**,src/pages/**,src/hooks/**,src/apis/**,src/types/**,src/constants/**',
    content: FRONTEND_RULES,
  },
  'backend-node': {
    description: 'AG architectural rules — backend Node layer constraints for Express/TypeScript',
    globs: 'src/endpoints/**,src/models/**,src/middlewares/**,src/types/**,src/constants/**',
    content: BACKEND_NODE_RULES,
  },
  cdk: {
    description: 'AG architectural rules — CDK infrastructure constraints',
    globs: 'infra/**,bin/**',
    content: CDK_RULES,
  },
};

function buildMdc(
  description: string,
  globs: string | null,
  alwaysApply: boolean,
  content: string,
  version: string,
): string {
  const globLine = globs ? `globs: ${globs}\n` : '';
  return [
    '---',
    `description: ${description}`,
    `${globLine}alwaysApply: ${alwaysApply}`,
    '---',
    '',
    `<!-- Generated by ag-arch-rules v${version} — re-run \`ag-arch-rules init\` to update. -->`,
    '',
    content,
    '',
  ].join('\n');
}

export function generateCursor(
  projectRoot: string,
  selectedPresets: string[],
  version: string,
): string[] {
  const rulesDir = path.join(projectRoot, '.cursor', 'rules');
  fs.mkdirSync(rulesDir, { recursive: true });

  const written: string[] = [];

  const commonPath = path.join(rulesDir, 'ag-arch-rules-common.mdc');
  fs.writeFileSync(
    commonPath,
    buildMdc(
      'AG architectural rules — common rules for all TypeScript projects',
      null,
      true,
      COMMON_RULES,
      version,
    ),
  );
  written.push('.cursor/rules/ag-arch-rules-common.mdc');

  for (const preset of selectedPresets) {
    const config = PRESET_CONFIGS[preset];
    if (!config) continue;
    const filePath = path.join(rulesDir, `ag-arch-rules-${preset}.mdc`);
    fs.writeFileSync(filePath, buildMdc(config.description, config.globs, false, config.content, version));
    written.push(`.cursor/rules/ag-arch-rules-${preset}.mdc`);
  }

  return written;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test tests/bin/generators/cursor.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/bin/generators/cursor.ts tests/bin/generators/cursor.test.ts
git commit -m "feat: add Cursor .mdc generator"
```

---

## Task 5: Claude generator

**Files:**
- Create: `src/bin/generators/claude.ts`
- Create: `tests/bin/generators/claude.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/bin/generators/claude.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { generateClaude } from '../../../src/bin/generators/claude.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ag-arch-claude-'));
});

describe('generateClaude', () => {
  it('creates CLAUDE.md when it does not exist', () => {
    generateClaude(tmpDir, [], '1.0.0');
    expect(fs.existsSync(path.join(tmpDir, 'CLAUDE.md'))).toBe(true);
  });

  it('written file contains sentinel comments', () => {
    generateClaude(tmpDir, [], '1.0.0');
    const content = fs.readFileSync(path.join(tmpDir, 'CLAUDE.md'), 'utf8');
    expect(content).toContain('<!-- ag-arch-rules: begin -->');
    expect(content).toContain('<!-- ag-arch-rules: end -->');
  });

  it('written file contains common rules', () => {
    generateClaude(tmpDir, [], '1.0.0');
    const content = fs.readFileSync(path.join(tmpDir, 'CLAUDE.md'), 'utf8');
    expect(content).toContain('Common Rules');
  });

  it('preserves existing content outside the sentinel block', () => {
    const claudePath = path.join(tmpDir, 'CLAUDE.md');
    fs.writeFileSync(claudePath, '# My Project\n\nExisting docs.\n');

    generateClaude(tmpDir, [], '1.0.0');

    const content = fs.readFileSync(claudePath, 'utf8');
    expect(content).toContain('# My Project');
    expect(content).toContain('Existing docs.');
  });

  it('replaces the sentinel section on re-run without duplicating it', () => {
    generateClaude(tmpDir, [], '1.0.0');
    generateClaude(tmpDir, ['frontend'], '1.0.0');

    const content = fs.readFileSync(path.join(tmpDir, 'CLAUDE.md'), 'utf8');
    const beginCount = (content.match(/<!-- ag-arch-rules: begin -->/g) ?? []).length;
    expect(beginCount).toBe(1);
    expect(content).toContain('Frontend Rules');
  });

  it('includes preset-specific content when a preset is selected', () => {
    generateClaude(tmpDir, ['backend-node'], '1.0.0');
    const content = fs.readFileSync(path.join(tmpDir, 'CLAUDE.md'), 'utf8');
    expect(content).toContain('Backend Node Rules');
  });

  it('includes the version in the generated content', () => {
    generateClaude(tmpDir, [], '3.1.4');
    const content = fs.readFileSync(path.join(tmpDir, 'CLAUDE.md'), 'utf8');
    expect(content).toContain('v3.1.4');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test tests/bin/generators/claude.test.ts
```

Expected: FAIL — `Cannot find module '../../../src/bin/generators/claude.js'`

- [ ] **Step 3: Create `src/bin/generators/claude.ts`**

```typescript
import * as fs from 'node:fs';
import * as path from 'node:path';
import { upsertSentinelSection, buildMarkdownContent } from './shared.js';

export function generateClaude(
  projectRoot: string,
  selectedPresets: string[],
  version: string,
): void {
  const claudePath = path.join(projectRoot, 'CLAUDE.md');
  const existing = fs.existsSync(claudePath) ? fs.readFileSync(claudePath, 'utf8') : '';
  const section = buildMarkdownContent(selectedPresets, version);
  const updated = upsertSentinelSection(existing, section);
  fs.writeFileSync(claudePath, updated);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test tests/bin/generators/claude.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/bin/generators/claude.ts tests/bin/generators/claude.test.ts
git commit -m "feat: add Claude Code CLAUDE.md generator"
```

---

## Task 6: Gemini generator

**Files:**
- Create: `src/bin/generators/gemini.ts`
- Create: `tests/bin/generators/gemini.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/bin/generators/gemini.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { generateGemini } from '../../../src/bin/generators/gemini.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ag-arch-gemini-'));
});

describe('generateGemini', () => {
  it('creates GEMINI.md when it does not exist', () => {
    generateGemini(tmpDir, [], '1.0.0');
    expect(fs.existsSync(path.join(tmpDir, 'GEMINI.md'))).toBe(true);
  });

  it('written file contains sentinel comments', () => {
    generateGemini(tmpDir, [], '1.0.0');
    const content = fs.readFileSync(path.join(tmpDir, 'GEMINI.md'), 'utf8');
    expect(content).toContain('<!-- ag-arch-rules: begin -->');
    expect(content).toContain('<!-- ag-arch-rules: end -->');
  });

  it('written file contains common rules', () => {
    generateGemini(tmpDir, [], '1.0.0');
    const content = fs.readFileSync(path.join(tmpDir, 'GEMINI.md'), 'utf8');
    expect(content).toContain('Common Rules');
  });

  it('preserves existing content outside the sentinel block', () => {
    const geminiPath = path.join(tmpDir, 'GEMINI.md');
    fs.writeFileSync(geminiPath, '# Gemini Config\n\nExisting settings.\n');

    generateGemini(tmpDir, [], '1.0.0');

    const content = fs.readFileSync(geminiPath, 'utf8');
    expect(content).toContain('# Gemini Config');
    expect(content).toContain('Existing settings.');
  });

  it('replaces the sentinel section on re-run without duplicating it', () => {
    generateGemini(tmpDir, [], '1.0.0');
    generateGemini(tmpDir, ['cdk'], '1.0.0');

    const content = fs.readFileSync(path.join(tmpDir, 'GEMINI.md'), 'utf8');
    const beginCount = (content.match(/<!-- ag-arch-rules: begin -->/g) ?? []).length;
    expect(beginCount).toBe(1);
    expect(content).toContain('CDK Rules');
  });

  it('includes preset-specific content when a preset is selected', () => {
    generateGemini(tmpDir, ['frontend'], '1.0.0');
    const content = fs.readFileSync(path.join(tmpDir, 'GEMINI.md'), 'utf8');
    expect(content).toContain('Frontend Rules');
  });

  it('includes the version in the generated content', () => {
    generateGemini(tmpDir, [], '2.0.0');
    const content = fs.readFileSync(path.join(tmpDir, 'GEMINI.md'), 'utf8');
    expect(content).toContain('v2.0.0');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test tests/bin/generators/gemini.test.ts
```

Expected: FAIL — `Cannot find module '../../../src/bin/generators/gemini.js'`

- [ ] **Step 3: Create `src/bin/generators/gemini.ts`**

```typescript
import * as fs from 'node:fs';
import * as path from 'node:path';
import { upsertSentinelSection, buildMarkdownContent } from './shared.js';

export function generateGemini(
  projectRoot: string,
  selectedPresets: string[],
  version: string,
): void {
  const geminiPath = path.join(projectRoot, 'GEMINI.md');
  const existing = fs.existsSync(geminiPath) ? fs.readFileSync(geminiPath, 'utf8') : '';
  const section = buildMarkdownContent(selectedPresets, version);
  const updated = upsertSentinelSection(existing, section);
  fs.writeFileSync(geminiPath, updated);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test tests/bin/generators/gemini.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Run full test suite to check for regressions**

```bash
pnpm test
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/bin/generators/gemini.ts tests/bin/generators/gemini.test.ts
git commit -m "feat: add Gemini GEMINI.md generator"
```

---

## Task 7: Init entry point

**Files:**
- Create: `src/bin/init.ts`

The entry point uses `@clack/prompts` for interactive input. It cannot be meaningfully unit-tested without mocking the entire prompt library, so we verify it via a build + smoke test instead.

- [ ] **Step 1: Create `src/bin/init.ts`**

```typescript
import { multiselect, intro, outro, isCancel, cancel } from '@clack/prompts';
import { generateCursor } from './generators/cursor.js';
import { generateClaude } from './generators/claude.js';
import { generateGemini } from './generators/gemini.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

function getVersion(): string {
  const __filename = fileURLToPath(import.meta.url);
  const pkgPath = path.join(dirname(__filename), '../../package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as { version: string };
  return pkg.version;
}

async function main(): Promise<void> {
  intro('ag-arch-rules init');

  const tools = await multiselect({
    message: 'Which AI tools should we generate context files for?',
    options: [
      { value: 'cursor', label: 'Cursor' },
      { value: 'claude', label: 'Claude Code' },
      { value: 'gemini', label: 'Gemini' },
    ],
  });

  if (isCancel(tools)) {
    cancel('Cancelled.');
    process.exit(0);
  }

  const presets = await multiselect({
    message: 'Which rule sets apply to this project?',
    options: [
      { value: 'frontend', label: 'Frontend (React/TypeScript)' },
      { value: 'backend-node', label: 'Backend Node (Express/TypeScript)' },
      { value: 'cdk', label: 'CDK (AWS CDK infrastructure)' },
    ],
    required: false,
  });

  if (isCancel(presets)) {
    cancel('Cancelled.');
    process.exit(0);
  }

  const projectRoot = process.cwd();
  const version = getVersion();
  const written: string[] = [];

  if ((tools as string[]).includes('cursor')) {
    const files = generateCursor(projectRoot, presets as string[], version);
    written.push(...files);
  }
  if ((tools as string[]).includes('claude')) {
    generateClaude(projectRoot, presets as string[], version);
    written.push('CLAUDE.md');
  }
  if ((tools as string[]).includes('gemini')) {
    generateGemini(projectRoot, presets as string[], version);
    written.push('GEMINI.md');
  }

  for (const file of written) {
    console.log(`  ✓ ${file}`);
  }

  outro('Done! Commit the generated files so your team benefits immediately.');
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Build the full project**

```bash
pnpm build
```

Expected: no errors. Verify `dist/bin/init.js` exists:

```bash
ls dist/bin/
```

Expected: `init.js` present.

- [ ] **Step 3: Verify the shebang is present**

```bash
head -1 dist/bin/init.js
```

Expected: `#!/usr/bin/env node`

- [ ] **Step 4: Smoke test — run the binary non-interactively to confirm it starts**

Pipe empty input so the prompts exit immediately (the process will cancel at the first prompt, which is correct behaviour):

```bash
echo "" | node dist/bin/init.js 2>&1 | head -5
```

Expected: the intro line `ag-arch-rules init` appears and the process exits without a crash (exit code may be non-zero due to the empty prompt input — that is acceptable).

- [ ] **Step 5: Run full test suite one final time**

```bash
pnpm test
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/bin/init.ts dist/
git commit -m "feat: add ag-arch-rules init CLI entry point"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| `ag-arch-rules init` CLI invocation via `bin` entry | Task 1 |
| `@clack/prompts` interactive prompts | Task 7 |
| Multi-select: which tools | Task 7 |
| Multi-select: which rule sets (Common always included) | Tasks 3, 7 |
| Cursor: `.mdc` files with `alwaysApply`/`globs` frontmatter | Task 4 |
| Cursor: one file per selected preset + common | Task 4 |
| Cursor: overwrites on re-run | Task 4 |
| Claude: sentinel section in `CLAUDE.md` | Task 5 |
| Claude: preserves content outside sentinels | Task 5 |
| Gemini: sentinel section in `GEMINI.md` | Task 6 |
| Gemini: preserves content outside sentinels | Task 6 |
| Version in generated file headers | Tasks 4, 5, 6 |
| Content tuned for AI audience, not verbatim `RULES.md` | Task 2 |
| `tsup.config.ts` with shebang banner | Task 1 |

All spec requirements covered.

**Placeholder scan:** No TBD, TODO, or vague steps present.

**Type consistency:** `generateCursor`, `generateClaude`, `generateGemini` all use `(projectRoot: string, selectedPresets: string[], version: string)` signatures consistently. `upsertSentinelSection(existingContent: string, newSection: string): string` and `buildMarkdownContent(selectedPresets: string[], version: string): string` used consistently in Tasks 5 and 6.
