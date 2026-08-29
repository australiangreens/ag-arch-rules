# Rule Reference

Rules are grouped by applicability. Common rules apply to any project type; frontend and backend rules apply to the respective preset.

---

## Config: `sliceDirs`

`ArchConfig.sliceDirs` (default: `[]`) names directories under `root` whose immediate subdirectories are treated as independent slices — each one gets its own layer structure checked, in addition to the top-level layout under `root`.

```ts
defineArchConfig({
  root: 'src',
  sliceDirs: ['features'], // src/features/selfroster is a layer root
  // ...
})
```

Without `sliceDirs`, layer rules only see the top-level directories directly under `root` (`src/apis`, `src/components`, ...). Code moved into `src/features/<name>/apis/` is invisible to those rules unless `sliceDirs` includes `'features'` — the rules pass, but check nothing inside the slice.

Rules that respect `sliceDirs`: `no-apis-depend-on-components`, `no-apis-depend-on-pages`, `no-components-depend-on-pages`, `no-hooks-depend-on-pages`, `no-types-depend-on-runtime-layers`, `no-constants-depend-on-runtime-layers`, `require-hook-prefix`.

Convention: only the entry file (`index.ts`) belongs directly under a slice directory (e.g. `src/features/index.ts`). Anything else goes inside a specific slice (`src/features/<name>/`) or one of the existing top-level layers (`src/components/`, `src/hooks/`, `src/lib/`, ...) — `no-cross-feature-imports` and `require-feature-public-entry` don't check files sitting directly at the slice-dir root, so that's an unenforced gap, not a sanctioned place for shared code.

---

## Common Rules

These rules are included in both `agFrontendPreset` and `agBackendNodePreset`.

### `no-circular-dependencies`

No module may (transitively) import itself. Circular dependencies prevent tree-shaking, cause hard-to-diagnose initialisation errors, and indicate that module boundaries are wrong.

```ts
// src/circular/a.ts — VIOLATION
import { b } from './b';

// src/circular/b.ts — VIOLATION
import { a } from './a';
```

### `no-types-depend-on-runtime-layers`

Type definition files (`src/types/`) must not import from runtime layers. Types should be pure structural contracts with no runtime dependencies — if a type file pulls in a service or component, it has become something other than a type definition.

Runtime layers checked automatically based on what exists in the project: `apis`, `components`, `pages` (frontend); `endpoints`, `models`, `middlewares` (backend).

```ts
// src/types/UserType.ts — VIOLATION
import { fetchUser } from '../apis/userApi';      // frontend
import { UserModel } from '../models/db/User';    // backend
```

### `no-constants-depend-on-runtime-layers`

Constant definition files (`src/constants/`) must not import from runtime layers. Constants are static values; importing a component or service to derive a "constant" means the value is not actually constant.

### `require-barrel-exports`

Immediate subdirectories of the configured directories must each have an `index.ts` barrel that re-exports their public surface. Barrel files give consumers a stable import point and allow internal reorganisation without breaking callers.

Defaults to checking `components/` subdirectories (frontend). Configure via options for other contexts:

```ts
// Backend: check endpoint and repository directories
'require-barrel-exports': ['error', { directories: ['endpoints', 'models/db'] }]
```

```
src/components/Button/
  Button.tsx        ✓
  index.ts          ✗ missing — VIOLATION
```

### `require-error-hierarchy`

The `src/errors/` directory must contain a root error class file (one that does not extend another local error class). This root class acts as an error hierarchy base, making it possible to `catch` any application error in one place.

### `errors-extend-ag-error`

All error classes in `src/errors/` must extend from `@australiangreens/ag-error`. This ensures every application error participates in the shared Greens error hierarchy and carries consistent metadata.

```ts
// src/errors/UserError.ts — VIOLATION
export class UserError extends Error {}

// Correct
import { AgError } from '@australiangreens/ag-error';
export class UserError extends AgError {}
```

### `require-test-type-suffix`

Test files must include a type suffix before `.test.` or `.spec.` to communicate the kind of test at a glance. The default allowed suffixes are `unit`, `comp`, and `int`.

```
UserService.test.ts        ✗ VIOLATION — no type suffix
UserService.unit.test.ts   ✓
UserService.comp.test.ts   ✓
UserService.int.test.ts    ✓
```

Configure custom suffixes via options:

```ts
'require-test-type-suffix': ['warn', { allowedSuffixes: ['unit', 'comp', 'int', 'e2e'] }],
```

### `max-file-lines`

Source files (excluding test files) must not exceed a configurable line limit. Large files are hard to review, navigate, and test in isolation. The defaults are 400 lines for `.tsx` files and 300 lines for `.ts` files.

Configure limits via options:

```ts
'max-file-lines': ['warn', { tsx: 500, ts: 400 }],
```

### `require-feature-public-entry`

Code outside a feature slice must import from that slice's public entry file (`index.ts`), not reach past it into the slice's internals. This is what makes the entry file actually mean something — without it, a slice's boundary is a naming convention, not an enforced one. On the frontend, complementary to `no-cross-feature-imports` (below): that rule stops one slice importing another; this one stops the rest of the application (or a slice's own root-level barrel) reaching into any slice. On the backend, it plays the same role for `endpoints/<feature>/`.

```ts
// src/pages/HostPage.tsx — VIOLATION
import BoothCard from '../features/selfroster/components/BoothCard';

// src/pages/HostPage.tsx — OK
import { selfrosterModule } from '../features/selfroster/index.js';
```

Entry-file matching strips extensions before comparing, so a NodeNext-style `.js` specifier (e.g. `'../features/selfroster/index.js'`, resolving to the `.ts` source) is correctly recognised as the public entry — matching this repo's own import convention.

Config options — the default slice directory differs by preset: `agFrontendPreset` relies on `config.sliceDirs ?? ['features']`, `agBackendNodePreset` sets `sliceDirs: ['endpoints']` explicitly.

```ts
'require-feature-public-entry': ['error', {
  sliceDirs: ['features'],               // frontend default: config.sliceDirs ?? ['features']
                                          // backend default (agBackendNodePreset): ['endpoints']
  entryFiles: ['index.ts', 'index.tsx'], // default
  pathAliases: ['@/'],                   // alias prefixes resolved from config.root
}],
```

---

## Frontend Rules

These rules are included in `agFrontendPreset` and apply to React/TypeScript frontend projects.

### `no-apis-depend-on-components`

API modules (`src/apis/`) must not import from the components layer. APIs are data-fetching abstractions; pulling in UI components inverts the dependency direction and entangles network logic with rendering.

```ts
// src/apis/userApi.ts — VIOLATION
import { Avatar } from '../components/Avatar';
```

### `no-apis-depend-on-pages`

API modules must not import from the pages layer. Pages are top-level route containers; no lower layer should depend on them.

### `no-components-depend-on-pages`

Shared components (`src/components/`) must not import from the pages layer. A reusable component that reaches up into a specific page creates a circular-style coupling that prevents reuse.

```tsx
// src/components/Header.tsx — VIOLATION
import { DashboardPage } from '../pages/DashboardPage';
```

### `no-hooks-depend-on-pages`

Custom hooks (`src/hooks/`) must not import from the pages layer. Hooks encapsulate reusable logic; depending on a page makes them specific to that page and un-reusable elsewhere.

### `require-path-alias`

Source files must not use `../` relative imports that cross directory boundaries. Use a TypeScript path alias (e.g. `@/`) instead. Deep relative paths are fragile and make files hard to move.

```ts
// src/components/Card/Card.tsx — VIOLATION
import { fetchUser } from '../../apis/userApi';

// Correct
import { fetchUser } from '@/apis/userApi';
```

### `require-hook-prefix`

Custom hook files in `src/hooks/` must start with `use` (e.g. `useUser.ts`). This matches the React hooks convention and makes hooks instantly recognisable in imports and directory listings.

```
hooks/authHelper.ts   ✗ VIOLATION
hooks/useAuth.ts      ✓
```

### `no-cross-feature-imports`

A file inside one feature slice (e.g. `src/features/selfroster/`) must not import from another feature slice's internals. Each feature should be self-contained; cross-feature imports create coupling that breaks independent testability and obscures a slice's boundary. Shares its implementation with `no-endpoints-depend-on-endpoints` (see below) via `checkCrossSliceImports`.

```ts
// src/features/booking/components/Widget.tsx — VIOLATION
import { SomeInternal } from '../../selfroster/components/SomeInternal';
```

Config options:

```ts
'no-cross-feature-imports': ['error', {
  sliceDir: 'features',     // default: config.sliceDirs?.[0] ?? 'features'
  featureRootDepth: 1,      // default
  pathAliases: ['@/'],      // alias prefixes resolved from config.root
  allowIntraFeature: true,  // default
  allowTargetGlobs: ['src/features/shared/**'],
}],
```

---

## Node Backend Rules

These rules are included in `agBackendNodePreset` and apply to NodeJS/ExpressJS backend projects.

### `no-endpoints-depend-on-endpoints`

Router modules must not import from other endpoint features. Each feature should be self-contained; cross-feature endpoint imports create coupling that breaks independent testability and obscures routing contracts.

The root `endpoints/index.ts` aggregator (which legitimately imports all subrouters) is excluded from this check.

```ts
// src/endpoints/lists/index.ts — VIOLATION
import groupsRouter from '../groups';
```

Config options:

```ts
'no-endpoints-depend-on-endpoints': ['error', {
  featureRootDepth: 1,      // default
  pathAliases: ['@/'],      // alias prefixes resolved from config.root
  allowIntraFeature: true,  // default
  allowTargetGlobs: ['src/endpoints/shared/**'],
}],
```

### `no-models-depend-on-endpoints`

Model and data-access modules (`src/models/`) must not import from the endpoints layer (`src/endpoints/`). The data layer must remain agnostic of HTTP concerns so it stays reusable and independently testable.

```ts
// src/models/db/List/index.ts — VIOLATION
import { parseListId } from '../../endpoints/lists/utils';
```

### `no-middleware-depends-on-models`

Middleware modules (`src/middlewares/`) should not import from domain model layers. Middleware handles cross-cutting concerns (authentication, error formatting); reaching into domain/data logic couples it to business behavior.

```ts
// src/middlewares/authHandler/index.ts — VIOLATION
import { User } from '../../models/db/User';
```

Use options to distinguish domain-model zones from infra adapters:

```ts
'no-middleware-depends-on-models': ['warn', {
  forbiddenModelGlobs: ['src/models/domain/**', 'src/models/db/**'],
  allowedModelGlobs: ['src/models/infra/**'],
}],
```

### `require-validation-schema`

Every endpoint directory that contains an `index.ts` router must also contain a `validationSchemas.ts` file. This enforces explicit, auditable request validation for every endpoint.

```
src/endpoints/lists/
  index.ts              ✓
  validationSchemas.ts  ✓

src/endpoints/reports/
  index.ts              ✓
  validationSchemas.ts  ✗ VIOLATION
```

`except` patterns for this rule are matched against the missing schema file path (for example `src/endpoints/reports/validationSchemas.ts`), not `index.ts`.

### `restrict-db-client-to-approved-zones`

Only approved paths may import DB client modules. This replaces endpoint-only DB checks by enforcing project-wide DB client boundaries.

```ts
// src/endpoints/lists/index.ts — VIOLATION (outside approved zones)
import db from '../models/db/knexClient';

// src/models/db/ListRepository.ts — allowed when importer matches allowedImporterGlobs
import db from './knexClient';
```

Config options:

```ts
'restrict-db-client-to-approved-zones': ['error', {
  allowedImporterGlobs: ['src/models/db/**/*.ts', 'src/scripts/db/**/*.ts'],
  dbModuleSpecifiers: ['knex', 'knexClient'],
  dbSpecifierRegexes: ['[/\\\\]dbClient$'],
  includeRequire: true, // default
}],
```

---

## CDK Rules

These rules are included in `agCdkPreset` and apply to AWS CDK projects. The preset assumes the standard project layout: `bin/` for the CDK app entry point, `infra/` for construct code, and `lambda/` for handler code.

### `require-custom-nodejs-construct`

The `infra/constructs/` directory must exist and contain at least one file that wraps `NodejsFunction`. A project-specific subclass centralises shared runtime defaults (runtime version, bundling config, environment variables) so they cannot drift across individual Lambda definitions.

```
infra/constructs/           ✗ missing — VIOLATION
infra/constructs/AppFn.ts   ✓ (must reference NodejsFunction)
```

### `require-node-runtime-22`

`NodejsFunction` wrapper constructs in `infra/constructs/` must specify Node.js 22 or higher (`Runtime.NODEJS_22_X`, `NODEJS_LATEST`, or any later version). Older runtimes are approaching or past end-of-life and lack current security patches.

```ts
// infra/constructs/AppFn.ts — VIOLATION
runtime: Runtime.NODEJS_18_X

// Correct
runtime: Runtime.NODEJS_22_X
```

### `require-esbuild-source-maps`

`NodejsFunction` constructs must set `sourceMap: true` in their bundling config. Without source maps, CloudWatch error traces point to minified esbuild output rather than the original TypeScript source, making debugging impractical.

```ts
// infra/constructs/AppFn.ts — VIOLATION (no sourceMap)
bundling: { minify: true }

// Correct
bundling: { minify: true, sourceMap: true }
```

### `require-pay-per-request-billing`

Every DynamoDB `Table` defined in `infra/` must use `PAY_PER_REQUEST` billing mode. Provisioned throughput requires capacity planning and can incur unexpected costs; on-demand billing is the safe default for most workloads. Override this rule explicitly if provisioned capacity is justified.

```ts
// infra/stacks/AppStack.ts — VIOLATION
new Table(this, 'MyTable', { ... });  // no billingMode

// Correct
new Table(this, 'MyTable', { billingMode: BillingMode.PAY_PER_REQUEST, ... });
```

### `require-dynamo-removal-policy`

When DynamoDB tables are present, the `infra/` code must include both `RemovalPolicy.RETAIN` and `RemovalPolicy.DESTROY`, indicating that a conditional removal policy is in place. A table that always retains data can block stack teardown; one that always destroys data is dangerous in production. The expected pattern is a condition (e.g. based on environment) that selects the appropriate policy.

```ts
// Correct — conditional policy
removalPolicy: isProd ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY
```

### `no-hardcoded-secret-values`

Property names matching `*SECRET*`, `*_API_KEY*`, `*PASSWORD*`, or `*TOKEN*` must not be assigned string literal values in `infra/` files. Hardcoded secrets are committed to version control and baked into synthesis output. Read values from `process.env.*` at synthesis time and inject them via Secrets Manager or environment variables.

```ts
// infra/stacks/AppStack.ts — VIOLATION
{ STRIPE_API_KEY: 'sk_live_abc123' }

// Correct
{ STRIPE_API_KEY: process.env.STRIPE_API_KEY! }
```

### `require-secrets-manager-grants`

When `secretsmanager` is referenced in `infra/` code, at least one `.grantRead()` call must also be present. Secrets Manager access is controlled by IAM; a secret that is created or referenced but never granted to a Lambda will cause runtime permission errors.

```ts
// Correct
const secret = Secret.fromSecretNameV2(this, 'ApiKey', 'my-api-key');
secret.grantRead(myFunction);
```

### `require-api-authentication`

API Gateway constructs in `infra/` must have authentication configured. Accepted patterns are: an API key with usage plan, a custom Lambda `TokenAuthorizer`, a `RequestAuthorizer`, or `authorizationType: AuthorizationType.CUSTOM`. If an unauthenticated API is intentional, set this rule to `"off"` explicitly.

```ts
// Correct — API key + usage plan
const key = api.addApiKey('ApiKey');
const plan = new UsagePlan(this, 'Plan', { ... });
plan.addApiKey(key);
```

---

### `no-lambda-imports-from-infra`

Lambda handler files in `lambda/` must not import from `infra/`. Handler code runs at AWS request time; CDK construct code runs at synthesis time. Importing constructs into a handler creates a runtime dependency on synthesis-only modules and will cause deployment failures.

```ts
// lambda/myHandler/index.ts — VIOLATION
import { AppFn } from '../../infra/constructs/AppFn';
```

### `require-lambda-handler-export`

Lambda entry-point files (`lambda/*.ts` and `lambda/*/index.ts`) must export a `handler` function. AWS Lambda invokes the export named `handler` by convention; a missing or differently named export causes silent failures at invocation time.

```ts
// lambda/myHandler/index.ts — VIOLATION (no handler export)
export async function processEvent(event: APIGatewayEvent) { ... }

// Correct
export async function handler(event: APIGatewayEvent) { ... }
```

---

### `require-cdk-json`

A `cdk.json` file must exist at the project root. Its absence indicates the project has not been initialised as a CDK app and the CDK CLI will refuse to run.

### `require-bin-directory`

A `bin/` directory must exist at the project root. The CDK app entry point (the file that instantiates stacks) belongs in `bin/` by CDK convention and is referenced by `cdk.json`.

### `require-infra-directory`

An `infra/` directory must exist at the project root. Infrastructure construct code must be separated from Lambda handler code so that synthesis-time and runtime dependencies cannot be mixed.

### `require-env-local-example`

A `.env.local.example` file must exist at the project root. CDK synthesis depends on environment variables (account IDs, region, API keys passed at synth time); this file documents the required variables so new contributors can set up their local environment without reverse-engineering the stack code.
