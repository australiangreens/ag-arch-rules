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
