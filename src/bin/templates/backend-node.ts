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
