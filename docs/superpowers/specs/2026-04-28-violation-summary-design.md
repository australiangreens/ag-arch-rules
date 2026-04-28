---
title: Violation Summary Block
date: 2026-04-28
status: approved
---

## Overview

Add a consolidated violation summary printed after all architectural fitness function tests complete. The summary lists only rules that detected at least one violation, with a count per rule. This makes it easy to understand the distribution of violations at a glance without scrolling through individual test output.

## Architecture

A `violationCounts` map (`Record<string, number>`) is declared in closure scope inside `runArchRules`. Each `it()` test writes its violation count into the map after `evaluate()` returns. An `afterAll` block reads the map, filters to entries where `count > 0`, and prints a formatted table via `console.warn`.

## Change Scope

`src/runArchRules.ts` only. No changes to `types.ts`, `evaluate.ts`, `format.ts`, rule implementations, or any consumer-facing API.

## Output Format

```
[arch] Violation summary:
  no-apis-depend-on-components   12
  no-types-depend-on-runtime      3
  require-barrel-exports          1
```

Rule names are left-aligned; counts are right-aligned, padded to align with the longest name. If no rules have violations the summary block is suppressed entirely.

## Edge Cases

- **`'off'` rules:** Skipped before `it()` registration — never entered into the map. Correct by design.
- **`'warn'`-severity rules in enforce mode:** Still accumulate counts (they log but don't throw). The summary reflects all violations regardless of severity, which is the desired behaviour.
- **Report mode vs enforce mode:** Summary appears in both modes. In report mode all violations are warnings; in enforce mode violations cause test failures. The summary is useful in both contexts.

## Testing

No new test file required. The existing test run (all 14 rules) will exercise the `afterAll` path. Manual verification: introduce a known violation in a consumer project and confirm the summary block appears with the correct count.
