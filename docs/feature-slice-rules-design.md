# Feature slice rules — design

**Status**: Design, not implemented
**Date**: 2026-08-10
**Driver**: `volunteer-frontend` adopting a feature module pattern
(`docs/superpowers/specs/2026-08-10-portal-feature-modules-design.md` in
that repo)

## Problem

`agFrontendPreset` is **horizontal**. Every layer rule asserts a
dependency direction between top-level directories under `config.root`:
`apis` must not depend on `components`, `components` must not depend on
`pages`, and so on.

A growing pattern in AG frontends is **vertical**: a feature module owns
its own layers.

```
src/
├── apis/          ← horizontal layers (the preset understands these)
├── components/
├── pages/
├── hooks/
└── features/
    └── selfroster/
        ├── index.ts     ← the module's only public export
        ├── apis/        ← vertical slice (the preset is blind to these)
        ├── components/
        ├── pages/
        └── hooks/
```

The package needs to enforce layer direction *within* each slice, and
slice isolation *between* slices.

## Current behaviour: silent blindness

This is the part that matters most, because the failure mode is a false
pass rather than an error.

`checkLayerDependency` builds its archunit patterns from `config.root`
plus a single layer name:

```ts
// src/common/utils/layerDependency.ts:33-34
const fromPattern = rootRelToTs + '/' + fromLayer + '/**';
const toPattern   = rootRelToTs + '/' + toLayer + '/**';
```

`src/features/selfroster/apis/client.ts` does not match `src/apis/**`.

So under a feature module layout:

- `no-apis-depend-on-components`
- `no-apis-depend-on-pages`
- `no-components-depend-on-pages`
- `no-hooks-depend-on-pages`

all match zero files inside feature modules and return zero violations.
`rule.check({ allowEmptyTests: true })` (`layerDependency.ts:43`) means
an empty match set is not an error, so **the rules pass green while
checking nothing**.

`noTypesOnRuntime` and `noConstantsOnRuntime` compound it — they filter
to layers that exist as direct children of `config.root`
(`noTypesOnRuntime.ts:15-17`), so a slice's `types/` is never considered.

Two more rules are blind for the same reason:

- `requireHookPrefix` globs `path.posix.join(config.root, 'hooks', '**')`
  (`requireHookPrefix.ts:9`).
- `requireBarrelExports` resolves `directories` against `config.root`
  and defaults to `['components']`.

As a codebase migrates code into `src/features/`, arch coverage shrinks
monotonically while the report stays clean. A consumer would reasonably
conclude they were protected.

## Rules that are already fine

Content- or whole-tree-based, indifferent to layout:

- `no-circular-dependencies` (madge over the tree)
- `max-file-lines`
- `require-test-type-suffix`
- `require-error-hierarchy`
- `errors-extend-ag-error`
- `require-path-alias`

`require-path-alias` has a useful interaction: banning `../`
cross-directory imports means a slice-internal import is written
`@/features/selfroster/components/X`. Cross-feature imports become
textually greppable instead of hiding behind `../../`.

## Prior art inside the package

`noEndpointsDependOnEndpoints`
(`src/backend-node/rules/noEndpointsDependOnEndpoints.ts`) is already a
slice-isolation rule. It:

- derives a feature key from path depth beneath a slice directory
  (`featureKey`, lines 13-23)
- resolves import specifiers through path aliases and `src/`
  (`resolveToAbsolute`, lines 25-46)
- flags imports whose target feature differs from the source feature
  (line 98)
- supports `featureRootDepth`, `allowIntraFeature`, `allowTargetGlobs`,
  `pathAliases`

The only thing binding it to backends is line 52:

```ts
const endpointsDir = path.resolve(config.root, 'endpoints');
```

The concept is proven and tested. It is one hardcoded directory name away
from serving frontends.

---

# Step 1 — Multi-root layer checks

**Priority: high. This is the fix for the silent blindness.**

Give `checkLayerDependency` a set of roots rather than one, and run the
layer assertion within each independently.

```ts
export async function checkLayerDependency(
  config: ArchConfig,
  fromLayer: string,
  toLayer: string,
  options: BaseRuleOptions
): Promise<Violation[]> {
  const roots = resolveLayerRoots(config);   // new
  const results = await Promise.all(
    roots.map(root => checkLayerDependencyInRoot(root, fromLayer, toLayer, ...))
  );
  return results.flat();
}
```

`resolveLayerRoots(config)` returns `config.root` plus each immediate
subdirectory of each configured slice directory:

```ts
export type ArchConfig = {
  root: string;
  /**
   * Directories under root whose immediate subdirectories are treated
   * as independent slices, each with its own layer structure.
   * Example: ['features'] → src/features/selfroster is a layer root.
   * Default: [] (current behaviour).
   */
  sliceDirs?: string[];
  // ...
};
```

Properties:

- **Backwards compatible.** `sliceDirs` defaults to `[]`, so existing
  consumers see identical behaviour.
- **No new rule names.** All four frontend layer rules plus
  `no-types-depend-on-runtime-layers` and
  `no-constants-depend-on-runtime-layers` become slice-aware for free.
- **Confined.** One utility plus one config field.

`noTypesOnRuntime` / `noConstantsOnRuntime` need a matching change: the
`fs.existsSync(path.resolve(config.root, layer))` filter must be applied
per resolved root rather than against `config.root` alone.

`requireHookPrefix` needs the same treatment for its `hooks` glob.

### Also available today, no code change

`requireBarrelExports` already accepts a `directories` option
(`types.ts:20-24`) resolved against `config.root`. Consumers adopting
feature modules can enforce "every module has a barrel" immediately:

```ts
'require-barrel-exports': ['error', { directories: ['features', 'components'] }]
```

This is worth documenting in `RULES.md` as the recommended setting for
slice-based projects.

---

# Step 2 — Generalise cross-slice isolation

Extract the body of `noEndpointsDependOnEndpoints` into a shared
implementation parameterised by slice directory:

```ts
// src/common/utils/crossSliceImports.ts
export async function checkCrossSliceImports(
  config: ArchConfig,
  options: CrossSliceOptions & { sliceDir: string }
): Promise<Violation[]>
```

Both rules become thin wrappers:

```ts
// backend — unchanged behaviour
export const noEndpointsDependOnEndpoints = (config, options) =>
  checkCrossSliceImports(config, { ...options, sliceDir: 'endpoints' });

// frontend — new
export const noCrossFeatureImports = (config, options) =>
  checkCrossSliceImports(config, { ...options, sliceDir: 'features' });
```

New rule name: `no-cross-feature-imports`, registered in `evaluate.ts`,
typed in `types.ts`, added to `agFrontendPreset` at `'error'`.

The existing message text is slice-agnostic enough to reuse with a
substituted noun:

> `cross-feature endpoint import 'X' from feature 'Y' is not allowed`

becomes

> `cross-slice import 'X' from 'Y' is not allowed`

No behaviour change for existing backend consumers.

---

# Step 3 — Public entry enforcement

**This is the genuinely new rule.** Nothing in the package expresses it
today.

`require-feature-public-entry`: an import originating outside
`<sliceDir>/<x>/` that resolves *into* `<sliceDir>/<x>/` must resolve to
`<sliceDir>/<x>/index.ts` exactly, not to a deeper path.

```
✓ import { selfrosterModule } from '@/features/selfroster';
✗ import BoothCard from '@/features/selfroster/components/BoothCard';
```

Step 2 stops slices importing *each other*. Step 3 stops the rest of the
application reaching *into* a slice. Both are needed: without Step 3, a
module's internals are public by accident and the boundary is a naming
convention.

Options:

```ts
export type RequireFeaturePublicEntryOptions = BaseRuleOptions & {
  /** Slice directories to guard. Default: ['features'] */
  sliceDirs?: string[];
  /** Accepted entry basenames. Default: ['index.ts', 'index.tsx'] */
  entryFiles?: string[];
  /** Path aliases resolving to config.root. Default: ['@/'] */
  pathAliases?: string[];
};
```

Implementation reuses `resolveToAbsolute` from Step 2's shared utility.
The check is: resolve the import; if it lands under
`<sliceDir>/<x>/` and the source file does not, require the resolved path
to be one of `entryFiles` directly under `<sliceDir>/<x>/`.

---

# Sequencing

| Step | Scope | Blocking |
|---|---|---|
| 1 | Multi-root layer checks + `sliceDirs` config | Yes — without it, adopting feature modules silently reduces coverage |
| 2 | Extract `checkCrossSliceImports`, add `no-cross-feature-imports` | No |
| 3 | `require-feature-public-entry` | No |

Step 1 should ship before any consumer moves substantial code into
`src/features/`. Steps 2 and 3 can follow; until then the boundary rests
on ESLint `no-restricted-imports` and code review in the consuming repo.

# Follow-on work

- `RULES.md`: document `sliceDirs`, the new rules, and the recommended
  `require-barrel-exports` setting for slice-based projects.
- `src/bin/templates/frontend.ts`: extend the generated agent context so
  Claude, Cursor and Gemini learn the slice conventions alongside the
  layer conventions.
- Consider whether `agFrontendPreset` should ship a companion
  `agFrontendSlicePreset`, or whether the slice rules belong in the base
  preset with `sliceDirs: []` making them inert.

# Test fixtures

`tests/fixtures/` already carries a `backend-rules` tree exercising
feature isolation (`src/endpoints/feature-a`, `feature-b`). Steps 2–3
need a parallel `frontend-slices` fixture:

```
tests/fixtures/frontend-slices/src/
├── components/Shared.tsx
├── features/
│   ├── alpha/
│   │   ├── index.ts
│   │   ├── apis/client.ts
│   │   ├── components/Widget.tsx
│   │   └── pages/AlphaPage.tsx
│   └── beta/
│       ├── index.ts
│       └── components/DeepImporter.tsx   ← imports alpha internals
└── pages/HostPage.tsx                    ← imports alpha internals
```

Covering: intra-slice layer violation (Step 1), cross-slice import
(Step 2), and external deep import (Step 3).
