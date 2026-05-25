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
