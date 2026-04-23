# Rule Reference

## `no-apis-depend-on-components`

API modules (`src/apis/`) must not import from the components layer. APIs are data-fetching abstractions; pulling in UI components inverts the dependency direction and entangles network logic with rendering.

```ts
// src/apis/userApi.ts — VIOLATION
import { Avatar } from '../components/Avatar';
```

## `no-apis-depend-on-pages`

API modules must not import from the pages layer. Pages are top-level route containers; no lower layer should depend on them.

## `no-components-depend-on-pages`

Shared components (`src/components/`) must not import from the pages layer. A reusable component that reaches up into a specific page creates a circular-style coupling that prevents reuse.

```tsx
// src/components/Header.tsx — VIOLATION
import { DashboardPage } from '../pages/DashboardPage';
```

## `no-hooks-depend-on-pages`

Custom hooks (`src/hooks/`) must not import from the pages layer. Hooks encapsulate reusable logic; depending on a page makes them specific to that page and un-reusable elsewhere.

## `no-types-depend-on-runtime-layers`

Type definition files (`src/types/`) must not import from runtime layers (APIs, components, hooks, pages). Types should be pure structural contracts with no runtime dependencies — if a type file pulls in a hook or API, it has become something other than a type definition.

```ts
// src/types/UserType.ts — VIOLATION
import { fetchUser } from '../apis/userApi';
```

## `no-constants-depend-on-runtime-layers`

Constant definition files (`src/constants/`) must not import from runtime layers. Constants are static values; importing a component or hook to derive a "constant" means the value is not actually constant.

## `no-circular-dependencies`

No module may (transitively) import itself. Circular dependencies prevent tree-shaking, cause hard-to-diagnose initialisation errors, and indicate that module boundaries are wrong.

```ts
// src/circular/a.ts — VIOLATION
import { b } from './b';

// src/circular/b.ts — VIOLATION
import { a } from './a';
```

## `require-barrel-exports`

Every directory under `src/` that contains source files must have an `index.ts` barrel that re-exports its public surface. Barrel files give consumers a stable import point and allow internal reorganisation without breaking callers.

```
src/components/Button/
  Button.tsx        ✓
  index.ts          ✗ missing — VIOLATION
```

## `require-path-alias`

Source files must not use `../` relative imports that cross directory boundaries. Use a TypeScript path alias (e.g. `@/`) instead. Deep relative paths are fragile and make files hard to move.

```ts
// src/components/Card/Card.tsx — VIOLATION
import { fetchUser } from '../../apis/userApi';

// Correct
import { fetchUser } from '@/apis/userApi';
```

## `require-error-hierarchy`

The `src/errors/` directory must contain a root error class file (one that does not extend another local error class). This root class acts as an error hierarchy base, making it possible to `catch` any application error in one place.

## `errors-extend-ag-error`

All error classes in `src/errors/` must extend from `@australiangreens/ag-error`. This ensures every application error participates in the shared Greens error hierarchy and carries consistent metadata.

```ts
// src/errors/UserError.ts — VIOLATION
export class UserError extends Error {}

// Correct
import { AgError } from '@australiangreens/ag-error';
export class UserError extends AgError {}
```

## `require-test-type-suffix`

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

## `require-hook-prefix`

Custom hook files in `src/hooks/` must start with `use` (e.g. `useUser.ts`). This matches the React hooks convention and makes hooks instantly recognisable in imports and directory listings.

```
hooks/authHelper.ts   ✗ VIOLATION
hooks/useAuth.ts      ✓
```

## `max-file-lines`

Source files (excluding test files) must not exceed a configurable line limit. Large files are hard to review, navigate, and test in isolation. The defaults are 400 lines for `.tsx` files and 300 lines for `.ts` files.

Configure limits via options:

```ts
'max-file-lines': ['warn', { tsx: 500, ts: 400 }],
```
