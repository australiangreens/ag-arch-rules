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
