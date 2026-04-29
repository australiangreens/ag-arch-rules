# CDK Architectural Fitness Functions — Design Spec

**Date:** 2026-04-29  
**Status:** Approved

## Context

This spec defines a new `agCdkPreset` and associated rules for the `ag-arch-rules` package. The rules target AWS CDK-based backend API microservices — specifically projects that use Lambda functions, API Gateway, and optionally DynamoDB and Secrets Manager.

### Reference projects (canonical)

- `greens-callhub-middleware`
- `htv-backend`
- `greens-superset-middleware`

`volunteer-backend` was reviewed but contains experimental patterns not shared by the canonical three and should not drive rule design.

### How rules are consumed

Each CDK project installs `ag-arch-rules` as a dev dependency and runs rules as Vitest tests against itself, using the same `arch.check.ts` + `arch.vitest.config.ts` pattern as the existing frontend and backend-node presets.

---

## Rule Organisation

Rules live under `src/cdk/rules/`. The preset lives at `src/cdk/preset.ts`. Both are exported from `src/index.ts`.

Rule naming follows the existing kebab-case convention (e.g. `require-custom-nodejs-construct`).

---

## Tier 1 — Infrastructure Code Rules (`error`)

These rules analyse files under `infra/`. All fire at `error` severity in the preset.

### `require-custom-nodejs-construct`

`infra/constructs/` must exist and contain at least one TypeScript file that references `NodejsFunction`. Every canonical project wraps CDK's `NodejsFunction` in a project-specific construct to enforce consistent defaults. This rule checks for the presence and content of that wrapper.

### `require-node-runtime-22`

The custom construct must reference `NODEJS_22_X` (or a higher constant). Two older canonical projects use Node 20.x; this rule intentionally flags them as violations to drive migration. Projects that cannot migrate immediately may set the rule to `warn`.

### `require-esbuild-source-maps`

The construct's bundling configuration must include `sourceMap: true`. All canonical projects enable this. Source maps are required for meaningful Lambda error traces in CloudWatch.

### `require-pay-per-request-billing`

Any `new Table(` in `infra/` code must be accompanied by `PAY_PER_REQUEST` billing mode. On-demand billing is the established pattern; provisioned throughput requires explicit justification and a rule override.

### `require-dynamo-removal-policy`

If DynamoDB tables are present, both `RemovalPolicy.RETAIN` and `RemovalPolicy.DESTROY` must appear in `infra/` code. This enforces the conditional removal policy pattern (DESTROY for sandbox/local, RETAIN for prod/dev). Projects with no DynamoDB tables do not trigger this rule.

### `no-hardcoded-secret-values`

Lambda environment variable definitions in `infra/` code must not assign string literals to variables whose names match `*SECRET*`, `*_API_KEY*`, `*PASSWORD*`, or `*TOKEN*`. Such values must be read from `process.env.*` or a variable (i.e. resolved at synthesis time from the environment, not hardcoded in source). This prevents credentials appearing in version control via the CDK stack definition.

`*KEY*` alone is intentionally excluded from the pattern — it is too broad and would produce false positives for names like `SORT_KEY` or `OBJECT_KEY`. If a legitimate variable name triggers a false positive, it can be suppressed via the `except` option on the rule config.

### `require-secrets-manager-grants`

If `secretsmanager` is imported or referenced in `infra/` code, `.grantRead(` must also appear. This ensures every Secrets Manager usage is paired with an explicit IAM grant. Projects that do not use Secrets Manager at all do not trigger this rule.

### `require-api-authentication`

At least one of the following patterns must appear in `infra/` code: `addApiKey`, `UsagePlan`, `TokenAuthorizer`, `RequestAuthorizer`, `authorizationType: AuthorizationType.CUSTOM`. The check is an OR — any single pattern satisfies it.

Projects that deliberately serve an unauthenticated API (e.g. a fully public read-only data endpoint) should set this rule to `'off'` in their local config:

```typescript
{
  ...agCdkPreset,
  rules: {
    ...agCdkPreset.rules,
    'require-api-authentication': 'off',
  },
}
```

---

## Tier 2 — Lambda Handler Code Rules (`warn`)

These rules analyse files under `lambda/`. Both fire at `warn` severity in the preset.

### `no-lambda-imports-from-infra`

Files under `lambda/` must not import from `infra/`. Lambda handler code runs at request time inside AWS Lambda; importing CDK synthesis-time constructs would silently bundle unused CDK code and couple two separate concerns.

### `require-lambda-handler-export`

Every TypeScript file matching `lambda/*/index.ts` or `lambda/*.ts` must export a `handler` symbol. Files nested deeper than one subdirectory (e.g. `lambda/myFn/utils/helpers.ts`) are excluded — these are shared utilities, not entry points. This guards against misconfigured entry points that would register with API Gateway but silently fail at invocation.

---

## Tier 3 — Project Structure Rules (`warn`)

These rules check for the presence of required files and directories. All fire at `warn` severity in the preset.

### `require-cdk-json`

`cdk.json` must exist at project root. Its absence means CDK cannot synthesise the stack.

### `require-bin-directory`

`bin/` must exist at project root. This is the conventional CDK app entry-point directory.

### `require-infra-directory`

`infra/` must exist at project root. Its presence signals the infra-as-code separation between CDK construct code and Lambda handler code.

### `require-env-local-example`

`.env.local.example` must exist at project root. All canonical projects ship this file to document the environment variables required for local development. Its absence leaves new developers without a reproducible local setup.

---

## Preset Definition

```typescript
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
  },
} as const;
```

---

## File Structure

```
src/
└── cdk/
    ├── preset.ts
    └── rules/
        ├── requireCustomNodejsConstruct.ts
        ├── requireNodeRuntime22.ts
        ├── requireEsbuildSourceMaps.ts
        ├── requirePayPerRequestBilling.ts
        ├── requireDynamoRemovalPolicy.ts
        ├── noHardcodedSecretValues.ts
        ├── requireSecretsManagerGrants.ts
        ├── requireApiAuthentication.ts
        ├── noLambdaImportsFromInfra.ts
        ├── requireLambdaHandlerExport.ts
        ├── requireCdkJson.ts
        ├── requireBinDirectory.ts
        ├── requireInfraDirectory.ts
        └── requireEnvLocalExample.ts
```

Each rule file exports a single async function with the signature:

```typescript
(config: ArchConfig, options: BaseRuleOptions) => Promise<Violation[]>
```

Consistent with all existing rule implementations.

---

## Testing

Each rule gets a test file under `src/cdk/rules/__tests__/` following the existing pattern: fixture directories under `test/fixtures/cdk/` simulate conformant and non-conformant CDK projects, and each test asserts zero violations for conformant fixtures and the expected violation messages for non-conformant ones.

---

## Types

`RulesConfig` in `src/types.ts` is extended with the 14 new CDK rule keys, each typed as `RuleConfig` (or `RuleConfig<SomeOptions>` where options are needed).

`src/index.ts` exports `agCdkPreset` alongside the existing presets.
