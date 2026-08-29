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

**require-hook-prefix** — custom hook files in \`src/hooks/\` must start with \`use\` (e.g. \`useUser.ts\`). This matches the React hooks naming convention.

## Feature Slices

If this project organises code into vertical feature modules (e.g. \`src/features/selfroster/\` owning its own \`apis/\`, \`components/\`, \`pages/\`) instead of — or alongside — the horizontal layers above, configure \`sliceDirs: ['features']\` in \`archConfig\`. This makes the layer rules above run *within* each slice too, and enables two more rules:

**no-cross-feature-imports** — a file inside one feature slice must not import from another feature slice's internals. Each feature should be self-contained.

\`\`\`tsx
// VIOLATION — src/features/booking/components/Widget.tsx
import { SomeInternal } from '../../selfroster/components/SomeInternal';
\`\`\`

**require-feature-public-entry** — code outside a feature slice must import from that slice's \`index.ts\`, not reach past it into the slice's internals.

\`\`\`tsx
// VIOLATION — src/pages/HostPage.tsx
import BoothCard from '../features/selfroster/components/BoothCard';

// Correct
import { selfrosterModule } from '../features/selfroster';
\`\`\`

Without \`sliceDirs\` configured, both rules default to guarding \`features/\` anyway, but the layer rules above stay blind to code inside it — set \`sliceDirs\` for full coverage.

Convention: only \`index.ts\` belongs directly under \`src/features/\`. Anything else goes inside a specific slice (\`src/features/<name>/\`) or one of the existing top-level layers — files sitting directly at \`src/features/\` root aren't checked by either rule above, so that's an unenforced gap, not a sanctioned place for shared code.`;
