# CDK Architectural Fitness Functions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 14 CDK architectural fitness function rules and an `agCdkPreset` that CDK-based backend microservices can import as a dev dependency and run as Vitest tests.

**Architecture:** Rules are async functions `(config: ArchConfig, options: BaseRuleOptions) => Promise<Violation[]>` that analyse file content and directory structure using Node's `fs` module and the existing `findFiles`/`matchesAny`/`toRelative` utilities from `src/utils/glob.ts`. Rules are registered in `src/evaluate.ts`, typed in `src/types.ts`, grouped into a preset at `src/cdk/preset.ts`, and exported from `src/index.ts`.

**Tech Stack:** TypeScript, Vitest, Node.js `fs` module, `glob`, `micromatch` (all already present in the package).

---

## File Map

**Create:**
- `src/cdk/preset.ts`
- `src/cdk/rules/requireCustomNodejsConstruct.ts`
- `src/cdk/rules/requireNodeRuntime22.ts`
- `src/cdk/rules/requireEsbuildSourceMaps.ts`
- `src/cdk/rules/requirePayPerRequestBilling.ts`
- `src/cdk/rules/requireDynamoRemovalPolicy.ts`
- `src/cdk/rules/noHardcodedSecretValues.ts`
- `src/cdk/rules/requireSecretsManagerGrants.ts`
- `src/cdk/rules/requireApiAuthentication.ts`
- `src/cdk/rules/noLambdaImportsFromInfra.ts`
- `src/cdk/rules/requireLambdaHandlerExport.ts`
- `src/cdk/rules/requireCdkJson.ts`
- `src/cdk/rules/requireBinDirectory.ts`
- `src/cdk/rules/requireInfraDirectory.ts`
- `src/cdk/rules/requireEnvLocalExample.ts`
- `tests/cdk/rules/requireCustomNodejsConstruct.test.ts`
- `tests/cdk/rules/requireNodeRuntime22.test.ts`
- `tests/cdk/rules/requireEsbuildSourceMaps.test.ts`
- `tests/cdk/rules/requirePayPerRequestBilling.test.ts`
- `tests/cdk/rules/requireDynamoRemovalPolicy.test.ts`
- `tests/cdk/rules/noHardcodedSecretValues.test.ts`
- `tests/cdk/rules/requireSecretsManagerGrants.test.ts`
- `tests/cdk/rules/requireApiAuthentication.test.ts`
- `tests/cdk/rules/noLambdaImportsFromInfra.test.ts`
- `tests/cdk/rules/requireLambdaHandlerExport.test.ts`
- `tests/cdk/rules/requireCdkJson.test.ts`
- `tests/cdk/rules/requireBinDirectory.test.ts`
- `tests/cdk/rules/requireInfraDirectory.test.ts`
- `tests/cdk/rules/requireEnvLocalExample.test.ts`
- `tests/fixtures/cdk-rules/conformant/cdk.json`
- `tests/fixtures/cdk-rules/conformant/.env.local.example`
- `tests/fixtures/cdk-rules/conformant/bin/app.ts`
- `tests/fixtures/cdk-rules/conformant/infra/constructs/AgNodejsFunction.ts`
- `tests/fixtures/cdk-rules/conformant/infra/api.ts`
- `tests/fixtures/cdk-rules/conformant/infra/dynamoDb.ts`
- `tests/fixtures/cdk-rules/conformant/infra/secrets.ts`
- `tests/fixtures/cdk-rules/conformant/infra/lambdaFunctions.ts`
- `tests/fixtures/cdk-rules/conformant/lambda/myFunction/index.ts`
- `tests/fixtures/cdk-rules/conformant/lambda/shared/helper.ts`
- `tests/fixtures/cdk-rules/no-constructs/infra/api.ts`
- `tests/fixtures/cdk-rules/infra-violations/infra/constructs/MyFn.ts`
- `tests/fixtures/cdk-rules/infra-violations/infra/api.ts`
- `tests/fixtures/cdk-rules/infra-violations/infra/dynamoDb.ts`
- `tests/fixtures/cdk-rules/infra-violations/infra/secrets.ts`
- `tests/fixtures/cdk-rules/infra-violations/infra/lambdaFunctions.ts`
- `tests/fixtures/cdk-rules/lambda-violations/lambda/badFunction/index.ts`
- `tests/fixtures/cdk-rules/lambda-violations/lambda/shared/helper.ts`

**Modify:**
- `src/types.ts` — add 14 CDK rule keys to `RulesConfig`
- `src/evaluate.ts` — import and register all 14 CDK rules
- `src/index.ts` — export `agCdkPreset`

---

## Task 1: Create test fixtures

**Files:**
- Create: all `tests/fixtures/cdk-rules/**` files listed in the file map above

These fixtures simulate CDK project directories. They are plain TypeScript files whose content triggers (or doesn't trigger) regex patterns — they do not need to be compilable CDK code.

- [ ] **Step 1: Create conformant fixture files**

```
tests/fixtures/cdk-rules/conformant/cdk.json
```
Content:
```json
{ "app": "npx ts-node bin/app.ts" }
```

```
tests/fixtures/cdk-rules/conformant/.env.local.example
```
Content:
```
AWS_SECRET_NAME=my-secret
ENV=local
```

```
tests/fixtures/cdk-rules/conformant/bin/app.ts
```
Content:
```typescript
#!/usr/bin/env node
import 'source-map-support/register';
```

```
tests/fixtures/cdk-rules/conformant/infra/constructs/AgNodejsFunction.ts
```
Content:
```typescript
import { NodejsFunction, NodejsFunctionProps } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export class AgNodejsFunction extends NodejsFunction {
  constructor(scope: Construct, id: string, props?: NodejsFunctionProps) {
    super(scope, id, {
      runtime: Runtime.NODEJS_22_X,
      bundling: {
        sourceMap: true,
        target: 'es2020',
      },
      ...props,
    });
  }
}
```

```
tests/fixtures/cdk-rules/conformant/infra/api.ts
```
Content:
```typescript
import { UsagePlan } from 'aws-cdk-lib/aws-apigateway';

export function createApi(scope: any) {
  const plan = new UsagePlan(scope, 'UsagePlan', {
    throttle: { rateLimit: 100, burstLimit: 200 },
  });
  return plan;
}
```

```
tests/fixtures/cdk-rules/conformant/infra/dynamoDb.ts
```
Content:
```typescript
import { Table, BillingMode } from 'aws-cdk-lib/aws-dynamodb';
import { RemovalPolicy } from 'aws-cdk-lib';

const isProd = process.env.ENV === 'prod';

export function createTable(scope: any) {
  return new Table(scope, 'MyTable', {
    billingMode: BillingMode.PAY_PER_REQUEST,
    removalPolicy: isProd ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
  });
}
```

```
tests/fixtures/cdk-rules/conformant/infra/secrets.ts
```
Content:
```typescript
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

export function importSecrets(scope: any, lambda: any, secretName: string) {
  const secret = secretsmanager.Secret.fromSecretNameV2(scope, 'AppSecret', secretName);
  secret.grantRead(lambda);
}
```

```
tests/fixtures/cdk-rules/conformant/infra/lambdaFunctions.ts
```
Content:
```typescript
import { AgNodejsFunction } from './constructs/AgNodejsFunction';

export function createLambdas(scope: any) {
  return new AgNodejsFunction(scope, 'MyFunction', {
    environment: {
      MY_SECRET: process.env.MY_SECRET ?? '',
      MY_API_KEY: process.env.MY_API_KEY ?? '',
    },
  });
}
```

```
tests/fixtures/cdk-rules/conformant/lambda/myFunction/index.ts
```
Content:
```typescript
import { helper } from '../shared/helper';

export const handler = async (event: unknown) => {
  return { statusCode: 200, body: helper() };
};
```

```
tests/fixtures/cdk-rules/conformant/lambda/shared/helper.ts
```
Content:
```typescript
export function helper(): string {
  return 'ok';
}
```

- [ ] **Step 2: Create no-constructs fixture**

```
tests/fixtures/cdk-rules/no-constructs/infra/api.ts
```
Content:
```typescript
export function createApi() {
  // No constructs directory exists in this project
}
```

- [ ] **Step 3: Create infra-violations fixture**

```
tests/fixtures/cdk-rules/infra-violations/infra/constructs/MyFn.ts
```
Content:
```typescript
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';

export class MyFn extends NodejsFunction {
  constructor(scope: any, id: string, props: any) {
    super(scope, id, {
      runtime: Runtime.NODEJS_20_X,
      bundling: {
        target: 'es2020',
      },
      ...props,
    });
  }
}
```

```
tests/fixtures/cdk-rules/infra-violations/infra/api.ts
```
Content:
```typescript
export function createApi(scope: any) {
  // No API key, usage plan, or custom authorizer configured
  return {};
}
```

```
tests/fixtures/cdk-rules/infra-violations/infra/dynamoDb.ts
```
Content:
```typescript
import { Table, BillingMode } from 'aws-cdk-lib/aws-dynamodb';
import { RemovalPolicy } from 'aws-cdk-lib';

export function createTable(scope: any) {
  return new Table(scope, 'MyTable', {
    billingMode: BillingMode.PROVISIONED,
    removalPolicy: RemovalPolicy.RETAIN,
  });
}
```

```
tests/fixtures/cdk-rules/infra-violations/infra/secrets.ts
```
Content:
```typescript
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

export function importSecrets(scope: any, secretName: string) {
  const secret = secretsmanager.Secret.fromSecretNameV2(scope, 'AppSecret', secretName);
  // No grantRead call
}
```

```
tests/fixtures/cdk-rules/infra-violations/infra/lambdaFunctions.ts
```
Content:
```typescript
import { MyFn } from './constructs/MyFn';

export function createLambdas(scope: any) {
  return new MyFn(scope, 'MyFunction', {
    environment: {
      MY_SECRET: 'actual-hardcoded-secret',
      MY_API_KEY: 'hardcoded-key-value',
    },
  });
}
```

- [ ] **Step 4: Create lambda-violations fixture**

```
tests/fixtures/cdk-rules/lambda-violations/lambda/badFunction/index.ts
```
Content:
```typescript
import { AgNodejsFunction } from '../../infra/constructs/AgNodejsFunction';

export const setup = () => {
  return new AgNodejsFunction({} as any, 'id', {});
};
```

```
tests/fixtures/cdk-rules/lambda-violations/lambda/shared/helper.ts
```
Content:
```typescript
export function helper(): string {
  return 'ok';
}
```

- [ ] **Step 5: Commit fixtures**

```bash
git add tests/fixtures/cdk-rules
git commit -m "test: add CDK rule test fixtures"
```

---

## Task 2: Extend types.ts with CDK rule keys

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: Add CDK rule keys to RulesConfig**

Open `src/types.ts` and append the following block immediately before the closing `};` of the `RulesConfig` type (after the existing `// Backend Node rules` block):

```typescript
  // CDK rules
  'require-custom-nodejs-construct'?: RuleConfig;
  'require-node-runtime-22'?:         RuleConfig;
  'require-esbuild-source-maps'?:     RuleConfig;
  'require-pay-per-request-billing'?: RuleConfig;
  'require-dynamo-removal-policy'?:   RuleConfig;
  'no-hardcoded-secret-values'?:      RuleConfig;
  'require-secrets-manager-grants'?:  RuleConfig;
  'require-api-authentication'?:      RuleConfig;
  'no-lambda-imports-from-infra'?:    RuleConfig;
  'require-lambda-handler-export'?:   RuleConfig;
  'require-cdk-json'?:                RuleConfig;
  'require-bin-directory'?:           RuleConfig;
  'require-infra-directory'?:         RuleConfig;
  'require-env-local-example'?:       RuleConfig;
```

- [ ] **Step 2: Run tests to confirm nothing broke**

```bash
pnpm test
```

Expected: all existing tests still pass.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add CDK rule keys to RulesConfig"
```

---

## Task 3: Tier 3 — structural rules (requireCdkJson, requireBinDirectory, requireInfraDirectory, requireEnvLocalExample)

**Files:**
- Create: `src/cdk/rules/requireCdkJson.ts`
- Create: `src/cdk/rules/requireBinDirectory.ts`
- Create: `src/cdk/rules/requireInfraDirectory.ts`
- Create: `src/cdk/rules/requireEnvLocalExample.ts`
- Create: `tests/cdk/rules/requireCdkJson.test.ts`
- Create: `tests/cdk/rules/requireBinDirectory.test.ts`
- Create: `tests/cdk/rules/requireInfraDirectory.test.ts`
- Create: `tests/cdk/rules/requireEnvLocalExample.test.ts`

All four rules follow the identical pattern: check whether a required file or directory exists at `config.root`; return one violation if absent, empty array if present.

- [ ] **Step 1: Write failing tests for all four rules**

`tests/cdk/rules/requireCdkJson.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { requireCdkJson } from '../../../src/cdk/rules/requireCdkJson.js';

const CONFORMANT = 'tests/fixtures/cdk-rules/conformant';
const VIOLATIONS = 'tests/fixtures/cdk-rules/infra-violations';
const base = { mode: 'enforce' as const, rules: {} };

describe('requireCdkJson', () => {
  it('returns no violations for a conformant project', async () => {
    const violations = await requireCdkJson({ ...base, root: CONFORMANT }, {});
    expect(violations).toHaveLength(0);
  });

  it('reports a violation when cdk.json is missing', async () => {
    const violations = await requireCdkJson({ ...base, root: VIOLATIONS }, {});
    expect(violations).toHaveLength(1);
    expect(violations[0].file).toBe('cdk.json');
  });
});
```

`tests/cdk/rules/requireBinDirectory.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { requireBinDirectory } from '../../../src/cdk/rules/requireBinDirectory.js';

const CONFORMANT = 'tests/fixtures/cdk-rules/conformant';
const VIOLATIONS = 'tests/fixtures/cdk-rules/infra-violations';
const base = { mode: 'enforce' as const, rules: {} };

describe('requireBinDirectory', () => {
  it('returns no violations for a conformant project', async () => {
    const violations = await requireBinDirectory({ ...base, root: CONFORMANT }, {});
    expect(violations).toHaveLength(0);
  });

  it('reports a violation when bin/ is missing', async () => {
    const violations = await requireBinDirectory({ ...base, root: VIOLATIONS }, {});
    expect(violations).toHaveLength(1);
    expect(violations[0].file).toBe('bin');
  });
});
```

`tests/cdk/rules/requireInfraDirectory.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { requireInfraDirectory } from '../../../src/cdk/rules/requireInfraDirectory.js';

const CONFORMANT = 'tests/fixtures/cdk-rules/conformant';
const VIOLATIONS = 'tests/fixtures/cdk-rules/lambda-violations';
const base = { mode: 'enforce' as const, rules: {} };

describe('requireInfraDirectory', () => {
  it('returns no violations for a conformant project', async () => {
    const violations = await requireInfraDirectory({ ...base, root: CONFORMANT }, {});
    expect(violations).toHaveLength(0);
  });

  it('reports a violation when infra/ is missing', async () => {
    const violations = await requireInfraDirectory({ ...base, root: VIOLATIONS }, {});
    expect(violations).toHaveLength(1);
    expect(violations[0].file).toBe('infra');
  });
});
```

`tests/cdk/rules/requireEnvLocalExample.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { requireEnvLocalExample } from '../../../src/cdk/rules/requireEnvLocalExample.js';

const CONFORMANT = 'tests/fixtures/cdk-rules/conformant';
const VIOLATIONS = 'tests/fixtures/cdk-rules/infra-violations';
const base = { mode: 'enforce' as const, rules: {} };

describe('requireEnvLocalExample', () => {
  it('returns no violations for a conformant project', async () => {
    const violations = await requireEnvLocalExample({ ...base, root: CONFORMANT }, {});
    expect(violations).toHaveLength(0);
  });

  it('reports a violation when .env.local.example is missing', async () => {
    const violations = await requireEnvLocalExample({ ...base, root: VIOLATIONS }, {});
    expect(violations).toHaveLength(1);
    expect(violations[0].file).toBe('.env.local.example');
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm vitest run tests/cdk/rules/requireCdkJson.test.ts tests/cdk/rules/requireBinDirectory.test.ts tests/cdk/rules/requireInfraDirectory.test.ts tests/cdk/rules/requireEnvLocalExample.test.ts
```

Expected: all four test files fail with "Cannot find module" errors.

- [ ] **Step 3: Implement all four rules**

`src/cdk/rules/requireCdkJson.ts`:
```typescript
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ArchConfig, BaseRuleOptions, Violation } from '../../types.js';

export async function requireCdkJson(
  config: ArchConfig,
  _options: BaseRuleOptions
): Promise<Violation[]> {
  if (fs.existsSync(path.resolve(config.root, 'cdk.json'))) return [];
  return [{ file: 'cdk.json', message: 'cdk.json is missing — this does not appear to be a CDK project' }];
}
```

`src/cdk/rules/requireBinDirectory.ts`:
```typescript
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ArchConfig, BaseRuleOptions, Violation } from '../../types.js';

export async function requireBinDirectory(
  config: ArchConfig,
  _options: BaseRuleOptions
): Promise<Violation[]> {
  if (fs.existsSync(path.resolve(config.root, 'bin'))) return [];
  return [{ file: 'bin', message: 'bin/ directory is missing — CDK app entry point must be defined in bin/' }];
}
```

`src/cdk/rules/requireInfraDirectory.ts`:
```typescript
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ArchConfig, BaseRuleOptions, Violation } from '../../types.js';

export async function requireInfraDirectory(
  config: ArchConfig,
  _options: BaseRuleOptions
): Promise<Violation[]> {
  if (fs.existsSync(path.resolve(config.root, 'infra'))) return [];
  return [{ file: 'infra', message: 'infra/ directory is missing — CDK infrastructure code must live separately from Lambda handler code' }];
}
```

`src/cdk/rules/requireEnvLocalExample.ts`:
```typescript
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ArchConfig, BaseRuleOptions, Violation } from '../../types.js';

export async function requireEnvLocalExample(
  config: ArchConfig,
  _options: BaseRuleOptions
): Promise<Violation[]> {
  if (fs.existsSync(path.resolve(config.root, '.env.local.example'))) return [];
  return [{ file: '.env.local.example', message: '.env.local.example is missing — local development environment variables must be documented for new contributors' }];
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm vitest run tests/cdk/rules/requireCdkJson.test.ts tests/cdk/rules/requireBinDirectory.test.ts tests/cdk/rules/requireInfraDirectory.test.ts tests/cdk/rules/requireEnvLocalExample.test.ts
```

Expected: 8 tests pass (2 per rule).

- [ ] **Step 5: Commit**

```bash
git add src/cdk/rules/requireCdkJson.ts src/cdk/rules/requireBinDirectory.ts src/cdk/rules/requireInfraDirectory.ts src/cdk/rules/requireEnvLocalExample.ts tests/cdk/rules/requireCdkJson.test.ts tests/cdk/rules/requireBinDirectory.test.ts tests/cdk/rules/requireInfraDirectory.test.ts tests/cdk/rules/requireEnvLocalExample.test.ts
git commit -m "feat: implement Tier 3 CDK structural rules"
```

---

## Task 4: requireCustomNodejsConstruct

**Files:**
- Create: `src/cdk/rules/requireCustomNodejsConstruct.ts`
- Create: `tests/cdk/rules/requireCustomNodejsConstruct.test.ts`

- [ ] **Step 1: Write failing test**

`tests/cdk/rules/requireCustomNodejsConstruct.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { requireCustomNodejsConstruct } from '../../../src/cdk/rules/requireCustomNodejsConstruct.js';

const CONFORMANT   = 'tests/fixtures/cdk-rules/conformant';
const NO_CONSTRUCTS = 'tests/fixtures/cdk-rules/no-constructs';
const base = { mode: 'enforce' as const, rules: {} };

describe('requireCustomNodejsConstruct', () => {
  it('returns no violations for a conformant project', async () => {
    const violations = await requireCustomNodejsConstruct({ ...base, root: CONFORMANT }, {});
    expect(violations).toHaveLength(0);
  });

  it('reports a violation when infra/constructs/ is missing', async () => {
    const violations = await requireCustomNodejsConstruct({ ...base, root: NO_CONSTRUCTS }, {});
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toMatch(/constructs/);
  });

  it('returns no violations when infra/ is absent entirely', async () => {
    // lambda-violations has no infra/ — the rule returns [] without crashing (infra/ absence is caught by requireInfraDirectory)
    const violations = await requireCustomNodejsConstruct({ ...base, root: 'tests/fixtures/cdk-rules/lambda-violations' }, {});
    expect(violations).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm vitest run tests/cdk/rules/requireCustomNodejsConstruct.test.ts
```

Expected: FAIL with "Cannot find module".

- [ ] **Step 3: Implement the rule**

`src/cdk/rules/requireCustomNodejsConstruct.ts`:
```typescript
import * as fs from 'node:fs';
import * as path from 'node:path';
import { findFiles, toRelative } from '../../utils/glob.js';
import type { ArchConfig, BaseRuleOptions, Violation } from '../../types.js';

export async function requireCustomNodejsConstruct(
  config: ArchConfig,
  _options: BaseRuleOptions
): Promise<Violation[]> {
  const infraDir = path.resolve(config.root, 'infra');
  if (!fs.existsSync(infraDir)) return [];

  const constructsDir = path.resolve(infraDir, 'constructs');
  if (!fs.existsSync(constructsDir)) {
    return [{
      file: toRelative(constructsDir),
      message: 'infra/constructs/ directory is missing — each CDK project must define a custom NodejsFunction wrapper construct with shared defaults',
    }];
  }

  const pattern = path.posix.join(constructsDir.replace(/\\/g, '/'), '**/*.ts');
  const files = await findFiles(pattern);

  const hasWrapper = files.some(file => {
    const content = fs.readFileSync(file, 'utf8');
    return /NodejsFunction/.test(content);
  });

  if (!hasWrapper) {
    return [{
      file: toRelative(constructsDir),
      message: 'infra/constructs/ contains no NodejsFunction wrapper — define a project-specific subclass with shared runtime defaults',
    }];
  }

  return [];
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
pnpm vitest run tests/cdk/rules/requireCustomNodejsConstruct.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/cdk/rules/requireCustomNodejsConstruct.ts tests/cdk/rules/requireCustomNodejsConstruct.test.ts
git commit -m "feat: implement requireCustomNodejsConstruct rule"
```

---

## Task 5: requireNodeRuntime22

**Files:**
- Create: `src/cdk/rules/requireNodeRuntime22.ts`
- Create: `tests/cdk/rules/requireNodeRuntime22.test.ts`

- [ ] **Step 1: Write failing test**

`tests/cdk/rules/requireNodeRuntime22.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { requireNodeRuntime22 } from '../../../src/cdk/rules/requireNodeRuntime22.js';

const CONFORMANT  = 'tests/fixtures/cdk-rules/conformant';
const VIOLATIONS  = 'tests/fixtures/cdk-rules/infra-violations';
const base = { mode: 'enforce' as const, rules: {} };

describe('requireNodeRuntime22', () => {
  it('returns no violations for a conformant project', async () => {
    const violations = await requireNodeRuntime22({ ...base, root: CONFORMANT }, {});
    expect(violations).toHaveLength(0);
  });

  it('reports a violation when the construct uses NODEJS_20_X', async () => {
    const violations = await requireNodeRuntime22({ ...base, root: VIOLATIONS }, {});
    expect(violations.some(v => v.file.includes('constructs/MyFn.ts'))).toBe(true);
    expect(violations[0].message).toMatch(/22/);
  });

  it('returns no violations when infra/constructs/ is absent', async () => {
    const violations = await requireNodeRuntime22({ ...base, root: 'tests/fixtures/cdk-rules/no-constructs' }, {});
    expect(violations).toHaveLength(0);
  });

  it('respects except globs', async () => {
    const violations = await requireNodeRuntime22({ ...base, root: VIOLATIONS }, {
      except: ['tests/fixtures/cdk-rules/infra-violations/infra/constructs/MyFn.ts'],
    });
    expect(violations).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm vitest run tests/cdk/rules/requireNodeRuntime22.test.ts
```

Expected: FAIL with "Cannot find module".

- [ ] **Step 3: Implement the rule**

`src/cdk/rules/requireNodeRuntime22.ts`:
```typescript
import * as fs from 'node:fs';
import * as path from 'node:path';
import { findFiles, matchesAny, toRelative } from '../../utils/glob.js';
import type { ArchConfig, BaseRuleOptions, Violation } from '../../types.js';

// Matches NODEJS_22_X through NODEJS_99_X, plus NODEJS_LATEST
const VALID_RUNTIME_RE = /NODEJS_(?:2[2-9]|[3-9]\d)_X|NODEJS_LATEST/;

export async function requireNodeRuntime22(
  config: ArchConfig,
  options: BaseRuleOptions
): Promise<Violation[]> {
  const constructsDir = path.resolve(config.root, 'infra', 'constructs');
  if (!fs.existsSync(constructsDir)) return [];

  const pattern = path.posix.join(constructsDir.replace(/\\/g, '/'), '**/*.ts');
  const files = await findFiles(pattern);
  const violations: Violation[] = [];

  for (const file of files) {
    const relFile = toRelative(file);
    if (matchesAny(relFile, options.except ?? [])) continue;

    const content = fs.readFileSync(file, 'utf8');
    if (!content.includes('NodejsFunction')) continue;

    if (!VALID_RUNTIME_RE.test(content)) {
      violations.push({
        file: relFile,
        message: 'Lambda runtime must be Node.js 22.x or higher — update to Runtime.NODEJS_22_X',
      });
    }
  }

  return violations;
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
pnpm vitest run tests/cdk/rules/requireNodeRuntime22.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/cdk/rules/requireNodeRuntime22.ts tests/cdk/rules/requireNodeRuntime22.test.ts
git commit -m "feat: implement requireNodeRuntime22 rule"
```

---

## Task 6: requireEsbuildSourceMaps

**Files:**
- Create: `src/cdk/rules/requireEsbuildSourceMaps.ts`
- Create: `tests/cdk/rules/requireEsbuildSourceMaps.test.ts`

- [ ] **Step 1: Write failing test**

`tests/cdk/rules/requireEsbuildSourceMaps.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { requireEsbuildSourceMaps } from '../../../src/cdk/rules/requireEsbuildSourceMaps.js';

const CONFORMANT = 'tests/fixtures/cdk-rules/conformant';
const VIOLATIONS = 'tests/fixtures/cdk-rules/infra-violations';
const base = { mode: 'enforce' as const, rules: {} };

describe('requireEsbuildSourceMaps', () => {
  it('returns no violations for a conformant project', async () => {
    const violations = await requireEsbuildSourceMaps({ ...base, root: CONFORMANT }, {});
    expect(violations).toHaveLength(0);
  });

  it('reports a violation when sourceMap is absent from the construct', async () => {
    const violations = await requireEsbuildSourceMaps({ ...base, root: VIOLATIONS }, {});
    expect(violations.some(v => v.file.includes('constructs/MyFn.ts'))).toBe(true);
    expect(violations[0].message).toMatch(/sourceMap/);
  });

  it('returns no violations when infra/constructs/ is absent', async () => {
    const violations = await requireEsbuildSourceMaps({ ...base, root: 'tests/fixtures/cdk-rules/no-constructs' }, {});
    expect(violations).toHaveLength(0);
  });

  it('respects except globs', async () => {
    const violations = await requireEsbuildSourceMaps({ ...base, root: VIOLATIONS }, {
      except: ['tests/fixtures/cdk-rules/infra-violations/infra/constructs/MyFn.ts'],
    });
    expect(violations).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm vitest run tests/cdk/rules/requireEsbuildSourceMaps.test.ts
```

Expected: FAIL with "Cannot find module".

- [ ] **Step 3: Implement the rule**

`src/cdk/rules/requireEsbuildSourceMaps.ts`:
```typescript
import * as fs from 'node:fs';
import * as path from 'node:path';
import { findFiles, matchesAny, toRelative } from '../../utils/glob.js';
import type { ArchConfig, BaseRuleOptions, Violation } from '../../types.js';

const SOURCE_MAP_RE = /sourceMap\s*:\s*true/;

export async function requireEsbuildSourceMaps(
  config: ArchConfig,
  options: BaseRuleOptions
): Promise<Violation[]> {
  const constructsDir = path.resolve(config.root, 'infra', 'constructs');
  if (!fs.existsSync(constructsDir)) return [];

  const pattern = path.posix.join(constructsDir.replace(/\\/g, '/'), '**/*.ts');
  const files = await findFiles(pattern);
  const violations: Violation[] = [];

  for (const file of files) {
    const relFile = toRelative(file);
    if (matchesAny(relFile, options.except ?? [])) continue;

    const content = fs.readFileSync(file, 'utf8');
    if (!content.includes('NodejsFunction')) continue;

    if (!SOURCE_MAP_RE.test(content)) {
      violations.push({
        file: relFile,
        message: 'bundling config must include sourceMap: true — source maps are required for meaningful Lambda error traces in CloudWatch',
      });
    }
  }

  return violations;
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
pnpm vitest run tests/cdk/rules/requireEsbuildSourceMaps.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/cdk/rules/requireEsbuildSourceMaps.ts tests/cdk/rules/requireEsbuildSourceMaps.test.ts
git commit -m "feat: implement requireEsbuildSourceMaps rule"
```

---

## Task 7: requirePayPerRequestBilling

**Files:**
- Create: `src/cdk/rules/requirePayPerRequestBilling.ts`
- Create: `tests/cdk/rules/requirePayPerRequestBilling.test.ts`

Rule logic: scan all `infra/**/*.ts` files. For each file that contains `new Table(`, verify it also contains `PAY_PER_REQUEST`. A violation is reported per file where a table is defined without the correct billing mode.

- [ ] **Step 1: Write failing test**

`tests/cdk/rules/requirePayPerRequestBilling.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { requirePayPerRequestBilling } from '../../../src/cdk/rules/requirePayPerRequestBilling.js';

const CONFORMANT = 'tests/fixtures/cdk-rules/conformant';
const VIOLATIONS = 'tests/fixtures/cdk-rules/infra-violations';
const base = { mode: 'enforce' as const, rules: {} };

describe('requirePayPerRequestBilling', () => {
  it('returns no violations for a conformant project', async () => {
    const violations = await requirePayPerRequestBilling({ ...base, root: CONFORMANT }, {});
    expect(violations).toHaveLength(0);
  });

  it('reports a violation when a table uses PROVISIONED billing', async () => {
    const violations = await requirePayPerRequestBilling({ ...base, root: VIOLATIONS }, {});
    expect(violations.some(v => v.file.includes('dynamoDb.ts'))).toBe(true);
    expect(violations[0].message).toMatch(/PAY_PER_REQUEST/);
  });

  it('returns no violations when infra/ is absent', async () => {
    const violations = await requirePayPerRequestBilling({ ...base, root: 'tests/fixtures/cdk-rules/lambda-violations' }, {});
    expect(violations).toHaveLength(0);
  });

  it('respects except globs', async () => {
    const violations = await requirePayPerRequestBilling({ ...base, root: VIOLATIONS }, {
      except: ['tests/fixtures/cdk-rules/infra-violations/infra/dynamoDb.ts'],
    });
    expect(violations).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm vitest run tests/cdk/rules/requirePayPerRequestBilling.test.ts
```

Expected: FAIL with "Cannot find module".

- [ ] **Step 3: Implement the rule**

`src/cdk/rules/requirePayPerRequestBilling.ts`:
```typescript
import * as fs from 'node:fs';
import * as path from 'node:path';
import { findFiles, matchesAny, toRelative } from '../../utils/glob.js';
import type { ArchConfig, BaseRuleOptions, Violation } from '../../types.js';

export async function requirePayPerRequestBilling(
  config: ArchConfig,
  options: BaseRuleOptions
): Promise<Violation[]> {
  const infraDir = path.resolve(config.root, 'infra');
  if (!fs.existsSync(infraDir)) return [];

  const pattern = path.posix.join(infraDir.replace(/\\/g, '/'), '**/*.ts');
  const files = await findFiles(pattern);
  const violations: Violation[] = [];

  for (const file of files) {
    const relFile = toRelative(file);
    if (matchesAny(relFile, options.except ?? [])) continue;

    const content = fs.readFileSync(file, 'utf8');
    if (!content.includes('new Table(')) continue;

    if (!content.includes('PAY_PER_REQUEST')) {
      violations.push({
        file: relFile,
        message: 'DynamoDB table must use PAY_PER_REQUEST billing mode — provisioned throughput requires explicit justification and a rule override',
      });
    }
  }

  return violations;
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
pnpm vitest run tests/cdk/rules/requirePayPerRequestBilling.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/cdk/rules/requirePayPerRequestBilling.ts tests/cdk/rules/requirePayPerRequestBilling.test.ts
git commit -m "feat: implement requirePayPerRequestBilling rule"
```

---

## Task 8: requireDynamoRemovalPolicy

**Files:**
- Create: `src/cdk/rules/requireDynamoRemovalPolicy.ts`
- Create: `tests/cdk/rules/requireDynamoRemovalPolicy.test.ts`

Rule logic: if any `infra/**/*.ts` file contains `new Table(`, then the combined content of all `infra/**/*.ts` files must include both `RemovalPolicy.RETAIN` and `RemovalPolicy.DESTROY`. This is a project-wide check, not per-file, because the removal policy may be set in a different file from the table definition.

- [ ] **Step 1: Write failing test**

`tests/cdk/rules/requireDynamoRemovalPolicy.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { requireDynamoRemovalPolicy } from '../../../src/cdk/rules/requireDynamoRemovalPolicy.js';

const CONFORMANT = 'tests/fixtures/cdk-rules/conformant';
const VIOLATIONS = 'tests/fixtures/cdk-rules/infra-violations';
const base = { mode: 'enforce' as const, rules: {} };

describe('requireDynamoRemovalPolicy', () => {
  it('returns no violations for a conformant project', async () => {
    const violations = await requireDynamoRemovalPolicy({ ...base, root: CONFORMANT }, {});
    expect(violations).toHaveLength(0);
  });

  it('reports a violation when only RETAIN is present (no conditional DESTROY)', async () => {
    const violations = await requireDynamoRemovalPolicy({ ...base, root: VIOLATIONS }, {});
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toMatch(/DESTROY/);
  });

  it('returns no violations when no DynamoDB tables are defined', async () => {
    const violations = await requireDynamoRemovalPolicy({ ...base, root: 'tests/fixtures/cdk-rules/no-constructs' }, {});
    expect(violations).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm vitest run tests/cdk/rules/requireDynamoRemovalPolicy.test.ts
```

Expected: FAIL with "Cannot find module".

- [ ] **Step 3: Implement the rule**

`src/cdk/rules/requireDynamoRemovalPolicy.ts`:
```typescript
import * as fs from 'node:fs';
import * as path from 'node:path';
import { findFiles, toRelative } from '../../utils/glob.js';
import type { ArchConfig, BaseRuleOptions, Violation } from '../../types.js';

export async function requireDynamoRemovalPolicy(
  config: ArchConfig,
  _options: BaseRuleOptions
): Promise<Violation[]> {
  const infraDir = path.resolve(config.root, 'infra');
  if (!fs.existsSync(infraDir)) return [];

  const pattern = path.posix.join(infraDir.replace(/\\/g, '/'), '**/*.ts');
  const files = await findFiles(pattern);

  const allContent = files.map(f => fs.readFileSync(f, 'utf8')).join('\n');

  if (!allContent.includes('new Table(')) return [];

  const hasRetain  = allContent.includes('RemovalPolicy.RETAIN');
  const hasDestroy = allContent.includes('RemovalPolicy.DESTROY');

  if (hasRetain && hasDestroy) return [];

  const missing = [
    ...(!hasRetain  ? ['RemovalPolicy.RETAIN']  : []),
    ...(!hasDestroy ? ['RemovalPolicy.DESTROY'] : []),
  ];

  return [{
    file: toRelative(infraDir),
    message: `DynamoDB tables must have a conditional removal policy — both RemovalPolicy.RETAIN and RemovalPolicy.DESTROY must appear in infra/ code. Missing: ${missing.join(', ')}`,
  }];
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
pnpm vitest run tests/cdk/rules/requireDynamoRemovalPolicy.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/cdk/rules/requireDynamoRemovalPolicy.ts tests/cdk/rules/requireDynamoRemovalPolicy.test.ts
git commit -m "feat: implement requireDynamoRemovalPolicy rule"
```

---

## Task 9: noHardcodedSecretValues

**Files:**
- Create: `src/cdk/rules/noHardcodedSecretValues.ts`
- Create: `tests/cdk/rules/noHardcodedSecretValues.test.ts`

Rule logic: in each `infra/**/*.ts` file, find key-value patterns where the key name contains `SECRET`, `_API_KEY`, `PASSWORD`, or `TOKEN`, and the value is a bare string literal (3+ characters). Reports a violation per matching line.

- [ ] **Step 1: Write failing test**

`tests/cdk/rules/noHardcodedSecretValues.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { noHardcodedSecretValues } from '../../../src/cdk/rules/noHardcodedSecretValues.js';

const CONFORMANT = 'tests/fixtures/cdk-rules/conformant';
const VIOLATIONS = 'tests/fixtures/cdk-rules/infra-violations';
const base = { mode: 'enforce' as const, rules: {} };

describe('noHardcodedSecretValues', () => {
  it('returns no violations for a conformant project', async () => {
    const violations = await noHardcodedSecretValues({ ...base, root: CONFORMANT }, {});
    expect(violations).toHaveLength(0);
  });

  it('reports violations for hardcoded MY_SECRET and MY_API_KEY values', async () => {
    const violations = await noHardcodedSecretValues({ ...base, root: VIOLATIONS }, {});
    expect(violations.some(v => v.file.includes('lambdaFunctions.ts'))).toBe(true);
    expect(violations.some(v => v.message.includes('MY_SECRET'))).toBe(true);
    expect(violations.some(v => v.message.includes('MY_API_KEY'))).toBe(true);
  });

  it('respects except globs', async () => {
    const violations = await noHardcodedSecretValues({ ...base, root: VIOLATIONS }, {
      except: ['tests/fixtures/cdk-rules/infra-violations/infra/lambdaFunctions.ts'],
    });
    expect(violations).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm vitest run tests/cdk/rules/noHardcodedSecretValues.test.ts
```

Expected: FAIL with "Cannot find module".

- [ ] **Step 3: Implement the rule**

`src/cdk/rules/noHardcodedSecretValues.ts`:
```typescript
import * as fs from 'node:fs';
import * as path from 'node:path';
import { findFiles, matchesAny, toRelative } from '../../utils/glob.js';
import type { ArchConfig, BaseRuleOptions, Violation } from '../../types.js';

// Matches: SOME_SECRET: 'value', SOME_API_KEY: "value", etc.
// Excludes values that are process.env references or empty strings.
const SENSITIVE_KEY_RE = /\b(\w*(?:SECRET|_API_KEY|PASSWORD|TOKEN)\w*)\s*:\s*['"]([^'"]{3,})['"]/g;

export async function noHardcodedSecretValues(
  config: ArchConfig,
  options: BaseRuleOptions
): Promise<Violation[]> {
  const infraDir = path.resolve(config.root, 'infra');
  if (!fs.existsSync(infraDir)) return [];

  const pattern = path.posix.join(infraDir.replace(/\\/g, '/'), '**/*.ts');
  const files = await findFiles(pattern);
  const violations: Violation[] = [];

  for (const file of files) {
    const relFile = toRelative(file);
    if (matchesAny(relFile, options.except ?? [])) continue;

    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let match: RegExpExecArray | null;
      SENSITIVE_KEY_RE.lastIndex = 0;

      while ((match = SENSITIVE_KEY_RE.exec(line)) !== null) {
        const [, keyName] = match;
        violations.push({
          file: relFile,
          line: i + 1,
          message: `${keyName} must not be a hardcoded string literal — read from process.env.* at synthesis time instead`,
        });
      }
    }
  }

  return violations;
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
pnpm vitest run tests/cdk/rules/noHardcodedSecretValues.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/cdk/rules/noHardcodedSecretValues.ts tests/cdk/rules/noHardcodedSecretValues.test.ts
git commit -m "feat: implement noHardcodedSecretValues rule"
```

---

## Task 10: requireSecretsManagerGrants

**Files:**
- Create: `src/cdk/rules/requireSecretsManagerGrants.ts`
- Create: `tests/cdk/rules/requireSecretsManagerGrants.test.ts`

Rule logic: if any `infra/**/*.ts` file references `secretsmanager` (indicating Secrets Manager usage), the combined content of all `infra/**/*.ts` files must contain `.grantRead(`. This is a project-wide check.

- [ ] **Step 1: Write failing test**

`tests/cdk/rules/requireSecretsManagerGrants.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { requireSecretsManagerGrants } from '../../../src/cdk/rules/requireSecretsManagerGrants.js';

const CONFORMANT = 'tests/fixtures/cdk-rules/conformant';
const VIOLATIONS = 'tests/fixtures/cdk-rules/infra-violations';
const base = { mode: 'enforce' as const, rules: {} };

describe('requireSecretsManagerGrants', () => {
  it('returns no violations for a conformant project', async () => {
    const violations = await requireSecretsManagerGrants({ ...base, root: CONFORMANT }, {});
    expect(violations).toHaveLength(0);
  });

  it('reports a violation when secretsmanager is used without grantRead', async () => {
    const violations = await requireSecretsManagerGrants({ ...base, root: VIOLATIONS }, {});
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toMatch(/grantRead/);
  });

  it('returns no violations when secretsmanager is not used', async () => {
    const violations = await requireSecretsManagerGrants({ ...base, root: 'tests/fixtures/cdk-rules/no-constructs' }, {});
    expect(violations).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm vitest run tests/cdk/rules/requireSecretsManagerGrants.test.ts
```

Expected: FAIL with "Cannot find module".

- [ ] **Step 3: Implement the rule**

`src/cdk/rules/requireSecretsManagerGrants.ts`:
```typescript
import * as fs from 'node:fs';
import * as path from 'node:path';
import { findFiles, toRelative } from '../../utils/glob.js';
import type { ArchConfig, BaseRuleOptions, Violation } from '../../types.js';

export async function requireSecretsManagerGrants(
  config: ArchConfig,
  _options: BaseRuleOptions
): Promise<Violation[]> {
  const infraDir = path.resolve(config.root, 'infra');
  if (!fs.existsSync(infraDir)) return [];

  const pattern = path.posix.join(infraDir.replace(/\\/g, '/'), '**/*.ts');
  const files = await findFiles(pattern);

  const allContent = files.map(f => fs.readFileSync(f, 'utf8')).join('\n');

  if (!allContent.includes('secretsmanager')) return [];
  if (allContent.includes('.grantRead(')) return [];

  return [{
    file: toRelative(infraDir),
    message: 'Secrets Manager is used but no .grantRead() call was found — every secret must be explicitly granted to the Lambda functions that need it',
  }];
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
pnpm vitest run tests/cdk/rules/requireSecretsManagerGrants.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/cdk/rules/requireSecretsManagerGrants.ts tests/cdk/rules/requireSecretsManagerGrants.test.ts
git commit -m "feat: implement requireSecretsManagerGrants rule"
```

---

## Task 11: requireApiAuthentication

**Files:**
- Create: `src/cdk/rules/requireApiAuthentication.ts`
- Create: `tests/cdk/rules/requireApiAuthentication.test.ts`

Rule logic: check the combined content of all `infra/**/*.ts` files for any of the recognised authentication patterns. A single match is sufficient to satisfy the rule.

- [ ] **Step 1: Write failing test**

`tests/cdk/rules/requireApiAuthentication.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { requireApiAuthentication } from '../../../src/cdk/rules/requireApiAuthentication.js';

const CONFORMANT = 'tests/fixtures/cdk-rules/conformant';
const VIOLATIONS = 'tests/fixtures/cdk-rules/infra-violations';
const base = { mode: 'enforce' as const, rules: {} };

describe('requireApiAuthentication', () => {
  it('returns no violations for a conformant project', async () => {
    const violations = await requireApiAuthentication({ ...base, root: CONFORMANT }, {});
    expect(violations).toHaveLength(0);
  });

  it('reports a violation when no auth pattern is present', async () => {
    const violations = await requireApiAuthentication({ ...base, root: VIOLATIONS }, {});
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toMatch(/authentication/);
  });

  it('returns no violations when infra/ is absent', async () => {
    const violations = await requireApiAuthentication({ ...base, root: 'tests/fixtures/cdk-rules/lambda-violations' }, {});
    expect(violations).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm vitest run tests/cdk/rules/requireApiAuthentication.test.ts
```

Expected: FAIL with "Cannot find module".

- [ ] **Step 3: Implement the rule**

`src/cdk/rules/requireApiAuthentication.ts`:
```typescript
import * as fs from 'node:fs';
import * as path from 'node:path';
import { findFiles, toRelative } from '../../utils/glob.js';
import type { ArchConfig, BaseRuleOptions, Violation } from '../../types.js';

const AUTH_PATTERNS: RegExp[] = [
  /addApiKey\s*\(/,
  /new\s+UsagePlan\s*\(/,
  /new\s+TokenAuthorizer\s*\(/,
  /new\s+RequestAuthorizer\s*\(/,
  /authorizationType\s*:\s*AuthorizationType\.CUSTOM/,
];

export async function requireApiAuthentication(
  config: ArchConfig,
  _options: BaseRuleOptions
): Promise<Violation[]> {
  const infraDir = path.resolve(config.root, 'infra');
  if (!fs.existsSync(infraDir)) return [];

  const pattern = path.posix.join(infraDir.replace(/\\/g, '/'), '**/*.ts');
  const files = await findFiles(pattern);
  const allContent = files.map(f => fs.readFileSync(f, 'utf8')).join('\n');

  const hasAuth = AUTH_PATTERNS.some(re => re.test(allContent));
  if (hasAuth) return [];

  return [{
    file: toRelative(infraDir),
    message: 'API Gateway has no authentication configured — add an API key, usage plan, or custom Lambda authorizer. Set this rule to "off" if an unauthenticated API is intentional.',
  }];
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
pnpm vitest run tests/cdk/rules/requireApiAuthentication.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/cdk/rules/requireApiAuthentication.ts tests/cdk/rules/requireApiAuthentication.test.ts
git commit -m "feat: implement requireApiAuthentication rule"
```

---

## Task 12: Tier 2 — Lambda handler rules (noLambdaImportsFromInfra, requireLambdaHandlerExport)

**Files:**
- Create: `src/cdk/rules/noLambdaImportsFromInfra.ts`
- Create: `src/cdk/rules/requireLambdaHandlerExport.ts`
- Create: `tests/cdk/rules/noLambdaImportsFromInfra.test.ts`
- Create: `tests/cdk/rules/requireLambdaHandlerExport.test.ts`

- [ ] **Step 1: Write failing tests for both rules**

`tests/cdk/rules/noLambdaImportsFromInfra.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { noLambdaImportsFromInfra } from '../../../src/cdk/rules/noLambdaImportsFromInfra.js';

const CONFORMANT = 'tests/fixtures/cdk-rules/conformant';
const VIOLATIONS = 'tests/fixtures/cdk-rules/lambda-violations';
const base = { mode: 'enforce' as const, rules: {} };

describe('noLambdaImportsFromInfra', () => {
  it('returns no violations for a conformant project', async () => {
    const violations = await noLambdaImportsFromInfra({ ...base, root: CONFORMANT }, {});
    expect(violations).toHaveLength(0);
  });

  it('reports a violation when a lambda file imports from infra/', async () => {
    const violations = await noLambdaImportsFromInfra({ ...base, root: VIOLATIONS }, {});
    expect(violations.some(v => v.file.includes('badFunction/index.ts'))).toBe(true);
    expect(violations[0].message).toMatch(/infra/);
  });

  it('returns no violations when lambda/ is absent', async () => {
    const violations = await noLambdaImportsFromInfra({ ...base, root: 'tests/fixtures/cdk-rules/no-constructs' }, {});
    expect(violations).toHaveLength(0);
  });

  it('respects except globs', async () => {
    const violations = await noLambdaImportsFromInfra({ ...base, root: VIOLATIONS }, {
      except: ['tests/fixtures/cdk-rules/lambda-violations/lambda/badFunction/index.ts'],
    });
    expect(violations).toHaveLength(0);
  });
});
```

`tests/cdk/rules/requireLambdaHandlerExport.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { requireLambdaHandlerExport } from '../../../src/cdk/rules/requireLambdaHandlerExport.js';

const CONFORMANT = 'tests/fixtures/cdk-rules/conformant';
const VIOLATIONS = 'tests/fixtures/cdk-rules/lambda-violations';
const base = { mode: 'enforce' as const, rules: {} };

describe('requireLambdaHandlerExport', () => {
  it('returns no violations for a conformant project', async () => {
    const violations = await requireLambdaHandlerExport({ ...base, root: CONFORMANT }, {});
    expect(violations).toHaveLength(0);
  });

  it('reports a violation when an entry-point file does not export handler', async () => {
    const violations = await requireLambdaHandlerExport({ ...base, root: VIOLATIONS }, {});
    expect(violations.some(v => v.file.includes('badFunction/index.ts'))).toBe(true);
    expect(violations[0].message).toMatch(/handler/);
  });

  it('does not flag shared utility files nested deeper than one directory', async () => {
    const violations = await requireLambdaHandlerExport({ ...base, root: CONFORMANT }, {});
    expect(violations.every(v => !v.file.includes('shared/helper.ts'))).toBe(true);
  });

  it('respects except globs', async () => {
    const violations = await requireLambdaHandlerExport({ ...base, root: VIOLATIONS }, {
      except: ['tests/fixtures/cdk-rules/lambda-violations/lambda/badFunction/index.ts'],
    });
    expect(violations).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm vitest run tests/cdk/rules/noLambdaImportsFromInfra.test.ts tests/cdk/rules/requireLambdaHandlerExport.test.ts
```

Expected: FAIL with "Cannot find module".

- [ ] **Step 3: Implement noLambdaImportsFromInfra**

`src/cdk/rules/noLambdaImportsFromInfra.ts`:
```typescript
import * as fs from 'node:fs';
import * as path from 'node:path';
import { findFiles, matchesAny, toRelative } from '../../utils/glob.js';
import type { ArchConfig, BaseRuleOptions, Violation } from '../../types.js';

const INFRA_IMPORT_RE = /from\s+['"][^'"]*infra\/[^'"]*['"]/;

export async function noLambdaImportsFromInfra(
  config: ArchConfig,
  options: BaseRuleOptions
): Promise<Violation[]> {
  const lambdaDir = path.resolve(config.root, 'lambda');
  if (!fs.existsSync(lambdaDir)) return [];

  const pattern = path.posix.join(lambdaDir.replace(/\\/g, '/'), '**/*.ts');
  const files = await findFiles(pattern);
  const violations: Violation[] = [];

  for (const file of files) {
    const relFile = toRelative(file);
    if (matchesAny(relFile, options.except ?? [])) continue;

    const content = fs.readFileSync(file, 'utf8');
    if (INFRA_IMPORT_RE.test(content)) {
      violations.push({
        file: relFile,
        message: 'Lambda handler must not import from infra/ — handler code runs at request time and must not depend on CDK synthesis-time constructs',
      });
    }
  }

  return violations;
}
```

- [ ] **Step 4: Implement requireLambdaHandlerExport**

`src/cdk/rules/requireLambdaHandlerExport.ts`:
```typescript
import * as fs from 'node:fs';
import * as path from 'node:path';
import { findFiles, matchesAny, toRelative } from '../../utils/glob.js';
import type { ArchConfig, BaseRuleOptions, Violation } from '../../types.js';

// Matches: export const handler, export async function handler, export function handler
const HANDLER_EXPORT_RE = /export\s+(?:const\s+handler|async\s+function\s+handler|function\s+handler)\b/;
// Matches: export { handler } or export { handler as default }
const HANDLER_REEXPORT_RE = /export\s*\{[^}]*\bhandler\b[^}]*\}/;

export async function requireLambdaHandlerExport(
  config: ArchConfig,
  options: BaseRuleOptions
): Promise<Violation[]> {
  const lambdaDir = path.resolve(config.root, 'lambda');
  if (!fs.existsSync(lambdaDir)) return [];

  // Only check entry-point files: lambda/*/index.ts and lambda/*.ts (one level deep)
  const directPattern  = path.posix.join(lambdaDir.replace(/\\/g, '/'), '*.ts');
  const indexPattern   = path.posix.join(lambdaDir.replace(/\\/g, '/'), '*/index.ts');
  const directFiles    = await findFiles(directPattern);
  const indexFiles     = await findFiles(indexPattern);
  const entryPoints    = [...directFiles, ...indexFiles];

  const violations: Violation[] = [];

  for (const file of entryPoints) {
    const relFile = toRelative(file);
    if (matchesAny(relFile, options.except ?? [])) continue;

    const content = fs.readFileSync(file, 'utf8');
    if (!HANDLER_EXPORT_RE.test(content) && !HANDLER_REEXPORT_RE.test(content)) {
      violations.push({
        file: relFile,
        message: 'Lambda entry point must export a handler function — AWS Lambda will silently fail if no handler export is found',
      });
    }
  }

  return violations;
}
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
pnpm vitest run tests/cdk/rules/noLambdaImportsFromInfra.test.ts tests/cdk/rules/requireLambdaHandlerExport.test.ts
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/cdk/rules/noLambdaImportsFromInfra.ts src/cdk/rules/requireLambdaHandlerExport.ts tests/cdk/rules/noLambdaImportsFromInfra.test.ts tests/cdk/rules/requireLambdaHandlerExport.test.ts
git commit -m "feat: implement Tier 2 CDK lambda handler rules"
```

---

## Task 13: Wire up — evaluate.ts, preset.ts, index.ts

**Files:**
- Create: `src/cdk/preset.ts`
- Modify: `src/evaluate.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Create the preset**

`src/cdk/preset.ts`:
```typescript
import type { RulesConfig } from '../types.js';

export const agCdkPreset = {
  rules: {
    // Tier 1 — infrastructure code
    'require-custom-nodejs-construct': 'error',
    'require-node-runtime-22':         'error',
    'require-esbuild-source-maps':     'error',
    'require-pay-per-request-billing': 'error',
    'require-dynamo-removal-policy':   'error',
    'no-hardcoded-secret-values':      'error',
    'require-secrets-manager-grants':  'error',
    'require-api-authentication':      'error',

    // Tier 2 — lambda handler code
    'no-lambda-imports-from-infra':    'warn',
    'require-lambda-handler-export':   'warn',

    // Tier 3 — project structure
    'require-cdk-json':                'warn',
    'require-bin-directory':           'warn',
    'require-infra-directory':         'warn',
    'require-env-local-example':       'warn',
  } satisfies RulesConfig,
} as const;
```

- [ ] **Step 2: Register all CDK rules in evaluate.ts**

Open `src/evaluate.ts`. Add the following imports immediately after the `// Backend Node rules` import block:

```typescript
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
```

Then add the following entries to the `RULES` record immediately after the `// Backend Node` entries:

```typescript
  // CDK
  'require-custom-nodejs-construct': requireCustomNodejsConstruct,
  'require-node-runtime-22':         requireNodeRuntime22,
  'require-esbuild-source-maps':     requireEsbuildSourceMaps,
  'require-pay-per-request-billing': requirePayPerRequestBilling,
  'require-dynamo-removal-policy':   requireDynamoRemovalPolicy,
  'no-hardcoded-secret-values':      noHardcodedSecretValues,
  'require-secrets-manager-grants':  requireSecretsManagerGrants,
  'require-api-authentication':      requireApiAuthentication,
  'no-lambda-imports-from-infra':    noLambdaImportsFromInfra,
  'require-lambda-handler-export':   requireLambdaHandlerExport,
  'require-cdk-json':                requireCdkJson,
  'require-bin-directory':           requireBinDirectory,
  'require-infra-directory':         requireInfraDirectory,
  'require-env-local-example':       requireEnvLocalExample,
```

- [ ] **Step 3: Export agCdkPreset from index.ts**

Open `src/index.ts` and add the following line after the `agBackendNodePreset` export:

```typescript
export { agCdkPreset }             from './cdk/preset.js';
```

- [ ] **Step 4: Run the full test suite**

```bash
pnpm test
```

Expected: all tests pass (existing tests unaffected, all 14 CDK rule tests pass).

- [ ] **Step 5: Commit**

```bash
git add src/cdk/preset.ts src/evaluate.ts src/index.ts
git commit -m "feat: register CDK rules in evaluate.ts and export agCdkPreset"
```

---

## Task 14: Final verification

- [ ] **Step 1: Run the full test suite one more time**

```bash
pnpm test
```

Expected: all tests pass, no regressions.

- [ ] **Step 2: Build the package to confirm TypeScript compiles cleanly**

```bash
pnpm build
```

Expected: build succeeds with no TypeScript errors. Output appears in `dist/`.

- [ ] **Step 3: Spot-check the built output exports agCdkPreset**

```bash
node --input-type=module --eval "import { agCdkPreset } from './dist/index.js'; console.log(Object.keys(agCdkPreset.rules).length);"
```

Expected: prints `14`.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: CDK architectural fitness functions complete — 14 rules, agCdkPreset"
```
