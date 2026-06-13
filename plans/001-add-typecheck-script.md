# Plan 001: Add a standalone `typecheck` npm script

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 104a551..HEAD -- package.json`
> If `package.json` changed since this plan was written, compare the "Current
> state" excerpt against the live file before proceeding; on a mismatch, treat
> it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `104a551`, 2026-06-13

## Why this matters

There is no fast way to type-check the frontend. `tsc` only runs as part of the
full `build` script (`tsc && vite build`), so catching a type error means
waiting for a full Vite production build. A dedicated `typecheck` script gives a
quick feedback loop, becomes a CI/pre-commit gate, and is referenced by other
plans in this batch as a verification command. This is the cheapest possible
unblocker.

## Current state

- `package.json` (repo root) — defines all npm scripts. Current `scripts` block:

```json
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "tauri": "tauri",
    "tauri:dev:parlerdev": "tauri dev --config src-tauri/tauri.dev.conf.json",
    "tauri:build:parlerdev": "tauri build --config src-tauri/tauri.dev.conf.json",
    "lint": "eslint src",
    "lint:fix": "eslint src --fix",
    "format": "prettier --write . && cd src-tauri && cargo fmt",
    "format:check": "prettier --check . && cd src-tauri && cargo fmt -- --check",
    "format:frontend": "prettier --write .",
    "format:backend": "cd src-tauri && cargo fmt",
    "test:playwright": "playwright test",
    "test:playwright:ui": "playwright test --ui",
    "check:translations": "bun scripts/check-translations.ts",
    "postinstall": "bun scripts/check-nix-deps.ts"
  },
```

- `tsconfig.json` exists at the repo root and is the config `tsc` already uses
  in `build`.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `bun run typecheck`      | exit 0, no errors   |

## Scope

**In scope** (the only files you should modify):
- `package.json` (root)

**Out of scope** (do NOT touch):
- `tsconfig.json` — do not change compiler options; the script must reuse the
  existing config as-is.
- Any CI workflow file — wiring `typecheck` into CI is deliberately deferred.

## Git workflow

- Branch: `advisor/001-add-typecheck-script`
- Commit message style: conventional commits (the repo uses them — e.g.
  `chore(scripts): add typecheck script`).
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add the `typecheck` script

In `package.json`, add a new entry to the `scripts` object, immediately after
the `"lint:fix"` line:

```json
    "typecheck": "tsc --noEmit",
```

`--noEmit` runs the type checker without writing JS output, which is what we
want for a check-only gate.

**Verify**: `bun run typecheck` → exits 0 (no type errors in the current tree).

If `bun run typecheck` reports pre-existing type errors that are unrelated to
this change, that is a STOP condition (see below) — do not attempt to fix them
under this plan.

## Test plan

- No new automated tests. The verification is running the script itself.
- Verification: `bun run typecheck` → exit 0.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `package.json` contains a `"typecheck": "tsc --noEmit"` script.
- [ ] `bun run typecheck` exits 0.
- [ ] No files outside `package.json` are modified (`git status`).
- [ ] `plans/README.md` status row for plan 001 updated.

## STOP conditions

Stop and report back (do not improvise) if:

- `bun run typecheck` reports type errors. The repo is expected to be
  type-clean; pre-existing errors are out of scope for this plan and need a
  separate decision.
- The `scripts` block in `package.json` no longer matches the "Current state"
  excerpt (drift).

## Maintenance notes

- A natural follow-up (deliberately deferred) is to add `bun run typecheck` to
  the GitHub Actions workflow under `.github/` and/or a pre-commit hook.
- A reviewer should confirm the script uses `--noEmit` (a bare `tsc` would emit
  stray `.js` files next to sources).
