# Rule Reference

Rules are grouped by applicability. Common rules apply to any project type; frontend and backend rules apply to the respective preset.

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

---

## Node Backend Rules

These rules are included in `agBackendNodePreset` and apply to NodeJS/ExpressJS backend projects.

### `no-endpoints-depend-on-endpoints`

Router modules (`src/endpoints/*/`) must not import from sibling endpoint directories. Each endpoint should be self-contained; cross-endpoint imports create coupling that breaks independent testability and obscures the routing contract.

The root `endpoints/index.ts` aggregator (which legitimately imports all subrouters) is excluded from this check.

```ts
// src/endpoints/lists/index.ts — VIOLATION
import groupsRouter from '../groups';
```

### `no-models-depend-on-endpoints`

Model and data-access modules (`src/models/`) must not import from the endpoints layer (`src/endpoints/`). The data layer must remain agnostic of HTTP concerns so it stays reusable and independently testable.

```ts
// src/models/db/List/index.ts — VIOLATION
import { parseListId } from '../../endpoints/lists/utils';
```

### `no-middleware-depends-on-models`

Middleware modules (`src/middlewares/`) must not import from the models layer (`src/models/`). Middleware handles cross-cutting concerns (authentication, error formatting); reaching into the data layer couples it to business logic.

```ts
// src/middlewares/authHandler/index.ts — VIOLATION
import { User } from '../../models/db/User';
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

### `no-direct-db-client-in-endpoints`

Endpoint files (`src/endpoints/**`) must not import the database client (`knexClient`) or the `knex` package directly. All database access must go through the models layer, keeping HTTP handlers free of query logic.

```ts
// src/endpoints/lists/index.ts — VIOLATION
import db from '../../models/db/knexClient';
import knex from 'knex';
```
