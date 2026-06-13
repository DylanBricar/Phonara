# Plan 011: Establish a frontend unit-test baseline (Vitest) and a one-command test script

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 104a551..HEAD -- package.json vite.config.ts`
> If either changed since this plan was written, re-read them before editing.

## Why this matters

The frontend has **zero unit tests** and no unit-test runner — only two trivial
Playwright checks (`tests/app.spec.ts`: "server responds 200" and "page has
`<html>`"). There is also no `test` npm script, so there is no one-command way to
know the frontend logic is sound. This plan installs Vitest, wires a `test`
script, and adds a small set of real unit tests over pure utility functions to
prove the harness works end-to-end. It is deliberately a **baseline**, not full
coverage: the goal is a working `bun run test` that other plans (and future
contributors) can extend and that CI can gate on. The Rust side already has
`#[cfg(test)]` modules across ~10 files; this plan also documents the
`cargo test` entry point alongside the new frontend one.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none (other plans benefit from this landing first, but it does
  not block them)
- **Category**: tests
- **Planned at**: commit `104a551`, 2026-06-13

## Current state

- `package.json` scripts have `test:playwright` but no `test`. Vitest is not a
  dependency.
- Build tooling is Vite 6 (`vite.config.ts` at root) + bun. TypeScript path alias
  `@/` → `./src/` is configured in `tsconfig.json` and `vite.config.ts`.
- Good first test targets — **pure functions, no Tauri/DOM dependency**:
  - `src/lib/utils/format.ts` — `formatModelSize(sizeMb)` returns strings like
    `"487 MB"`, `"1.6 GB"`, `"Unknown size"` for null/zero/negative. Excerpt:
    ```ts
    export const formatModelSize = (sizeMb: number | null | undefined): string => {
      if (!sizeMb || !Number.isFinite(sizeMb) || sizeMb <= 0) return "Unknown size";
      // ... MB vs GB formatting
    };
    ```
  - `src/lib/utils/keyboard.ts` — keyboard/shortcut formatting helpers (pure).
  - `src/utils/dateFormat.ts` — date formatting (pure).
- These are chosen because they need no mocking of `@tauri-apps/api`, Zustand, or
  the DOM — so the baseline harness can be proven without building a mock layer.

## Commands you will need

| Purpose    | Command            | Expected on success |
|------------|--------------------|---------------------|
| Install    | `bun install`      | exit 0              |
| Unit tests | `bun run test`     | all tests pass, exit 0 |
| Typecheck  | `bunx tsc --noEmit`| exit 0              |
| Rust tests | `cd src-tauri && cargo test` | builds + passes (existing tests) |

## Scope

**In scope** (create/modify only these):
- `package.json` — add `vitest` devDependency and a `"test"` script.
- `vitest.config.ts` (create) — minimal config with the `@/` alias.
- 2–3 new test files colocated with their targets, e.g.
  `src/lib/utils/format.test.ts`, `src/lib/utils/keyboard.test.ts`,
  `src/utils/dateFormat.test.ts`.

**Out of scope** (do NOT touch):
- Application source under test — only read it; do not change `format.ts` et al.
- Playwright setup (`playwright.config.ts`, `tests/`) — leave the e2e harness as
  is.
- Do NOT attempt to mock Tauri/Zustand or test components in this plan — that is
  a deliberate follow-up. Keep the baseline to pure functions.
- ESLint config — Vitest globals will be handled via the config in Step 2, not by
  editing `eslint.config.js` (if lint complains about test globals, prefer
  importing `{ describe, it, expect } from "vitest"` explicitly instead of relying
  on globals).

## Git workflow

- Branch: `advisor/011-establish-frontend-test-baseline`
- Commit message style: conventional commits, e.g.
  `test: add Vitest baseline and unit tests for utility functions`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add Vitest

```
bun add -d vitest
```

**Verify**: `package.json` `devDependencies` now lists `vitest`; `bun install`
exits 0.

### Step 2: Create `vitest.config.ts`

Create `vitest.config.ts` at the repo root with a minimal config that mirrors the
`@/` alias and uses the `node` environment (the baseline tests don't need a DOM):

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    globals: true,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

If `__dirname` is unavailable under the repo's ESM setup, use the
`fileURLToPath(new URL("./src", import.meta.url))` form instead (match whatever
`vite.config.ts` already does for its alias).

### Step 3: Add the `test` script

In `package.json` `scripts`, add:
```json
    "test": "vitest run",
```
(`vitest run` runs once and exits — correct for CI and `bun run test`. Watch mode
remains available via `bunx vitest`.)

**Verify**: `bun run test` runs Vitest (it will report "no test files found"
until Step 4 — that is fine at this checkpoint, exit code may be non-zero; the
real gate is after Step 4).

### Step 4: Write the baseline unit tests

Create test files importing from Vitest explicitly (avoids ESLint
no-undef on globals):

- `src/lib/utils/format.test.ts` — cover `formatModelSize`:
  - `formatModelSize(0)` / `null` / `undefined` / negative → `"Unknown size"`.
  - a sub-GB value → ends with `" MB"`.
  - a >= 1024 value → ends with `" GB"`.
  (Assert on the suffix and the "Unknown size" sentinel; avoid asserting exact
  locale-formatted digits since `Intl.NumberFormat` is locale-dependent.)
- `src/lib/utils/keyboard.test.ts` — read `keyboard.ts`, pick one or two exported
  pure functions, and test their documented behavior (e.g. formatting a key
  combo). Only test exported, pure functions.
- `src/utils/dateFormat.test.ts` — test the exported date formatter on a fixed
  timestamp; assert structural properties (non-empty string, contains expected
  separators) rather than exact locale output.

Example shape:
```ts
import { describe, it, expect } from "vitest";
import { formatModelSize } from "./format";

describe("formatModelSize", () => {
  it("returns Unknown size for non-positive input", () => {
    expect(formatModelSize(0)).toBe("Unknown size");
    expect(formatModelSize(null)).toBe("Unknown size");
    expect(formatModelSize(undefined)).toBe("Unknown size");
    expect(formatModelSize(-5)).toBe("Unknown size");
  });
  it("formats sub-GB sizes in MB", () => {
    expect(formatModelSize(487).endsWith(" MB")).toBe(true);
  });
  it("formats >= 1 GB sizes in GB", () => {
    expect(formatModelSize(1600).endsWith(" GB")).toBe(true);
  });
});
```

**Verify**: `bun run test` → all tests pass, exit 0.

### Step 5: Confirm typecheck and Rust tests still work

**Verify**:
- `bunx tsc --noEmit` → exit 0 (the new config/tests don't break types).
- `cd src-tauri && cargo test` → existing Rust tests build and pass (do not fix
  unrelated pre-existing failures here; report them if present).

## Test plan

- The new tests ARE the deliverable. They must run via `bun run test` and pass.
- Keep assertions locale-robust (suffix/sentinel checks, not exact digit strings)
  so the suite is stable across machines.
- Verification: `bun run test` exits 0 with ≥3 test files and several assertions.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `package.json` has a `"test"` script and `vitest` in `devDependencies`.
- [ ] `vitest.config.ts` exists with the `@/` alias.
- [ ] `bun run test` exits 0 and runs ≥3 test files.
- [ ] `bunx tsc --noEmit` exits 0.
- [ ] `bun run lint` exits 0 (no unused/undef errors from the test files).
- [ ] Source files under test are unchanged (`git status`).
- [ ] `plans/README.md` status row for plan 011 updated.

## STOP conditions

Stop and report back (do not improvise) if:

- A chosen utility turns out NOT to be pure (imports Tauri/DOM) — pick a different
  pure target rather than building a mock layer under this plan.
- Vitest and Vite 6 versions conflict and can't be resolved within minor bumps.
- `cargo test` fails to build for reasons unrelated to this change (report the
  pre-existing breakage; do not fix it here).

## Maintenance notes

- This is a foundation. Natural follow-ups (separate plans): a jsdom environment
  + Tauri/Zustand mocks to test hooks (`useSettings`) and components
  (`PostProcessingSettings`, `GlobalShortcutInput`), and wiring `bun run test` +
  `cargo test` into CI as required gates.
- A reviewer should confirm the assertions are locale-robust and that no app
  source was modified to make tests pass.
- Other plans in this set list `bun run test` as a gate; this plan makes that
  command real.
