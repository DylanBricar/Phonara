# Plan 002: Remove the dead Gemini client and command module

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 104a551..HEAD -- src-tauri/src/gemini_client.rs src-tauri/src/commands/gemini.rs src-tauri/src/commands/mod.rs src-tauri/src/lib.rs`
> If any of these changed since this plan was written, compare the "Current
> state" facts against the live code before proceeding; on a mismatch, treat it
> as a STOP condition.

## Why this matters

The fork's recent "rework into language models + actions" commit replaced the
original Gemini-specific transcription/post-processing path with a unified
OpenAI-compatible client (`llm_client.rs`) plus a generic provider list. The old
Gemini code was left behind as dead weight:

- `src-tauri/src/commands/gemini.rs` is now a two-line tombstone comment.
- `src-tauri/src/gemini_client.rs` (166 lines) has zero callers.

Dead code like this is actively harmful here: it presents two competing "LLM
client" stories to anyone reading the backend, and invites a future contributor
to wire the dead, unmaintained path back in. Removing it makes the post-
processing architecture legible.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `104a551`, 2026-06-13

## Current state

Verified facts (confirmed by grep at the planned-at commit):

- `src-tauri/src/commands/gemini.rs` contains only:
  ```rust
  // Deprecated: Gemini API support removed
  // These functions are no longer used
  ```
- `src-tauri/src/commands/mod.rs:2` declares the module:
  ```rust
  pub mod gemini;
  ```
- `src-tauri/src/gemini_client.rs` (166 lines) defines `pub async fn
  transcribe_audio(...)` and `pub async fn generate_text(...)`. It is **NOT**
  declared as a module anywhere — `src-tauri/src/lib.rs` lists modules
  (`mod actions; mod apple_intelligence; ... mod llm_client; ...`) and has **no**
  `mod gemini_client;`. The file is therefore not even compiled into the binary.
- The only other occurrence of the string `gemini` in the Rust/TS source is
  `src-tauri/src/settings.rs:599` (`id: "gemini".to_string()`), which is a
  legitimate **provider config entry** for the unified `llm_client` path — it is
  NOT related to the dead files and **must not be touched**.

So: removing the two files plus the one `pub mod gemini;` line is safe.

## Commands you will need

| Purpose      | Command                                              | Expected on success |
|--------------|------------------------------------------------------|---------------------|
| Rust build   | `cd src-tauri && cargo check`                        | exit 0, no errors   |
| Grep check   | `grep -rn "gemini_client\|commands::gemini\|mod gemini" src-tauri/src` | only `settings.rs:599` style provider-id lines, no module/usage refs |

(`cargo check` may take a few minutes the first time — that is normal.)

## Scope

**In scope** (the only files you should modify or delete):
- Delete `src-tauri/src/gemini_client.rs`
- Delete `src-tauri/src/commands/gemini.rs`
- Edit `src-tauri/src/commands/mod.rs` — remove the `pub mod gemini;` line

**Out of scope** (do NOT touch, even though they mention "gemini"):
- `src-tauri/src/settings.rs` — line 599's `"gemini"` provider id is a live
  config for the unified LLM client. Leave it exactly as is.
- `src-tauri/src/llm_client.rs` — the replacement client; unaffected.
- `src/bindings.ts` — generated file; it should not reference any gemini
  command, but do not hand-edit it.

## Git workflow

- Branch: `advisor/002-remove-dead-gemini-code`
- Use the repo's deletion-safe convention: prefer `git rm <file>` (or the `trash`
  CLI) over `rm -rf`.
- Commit message style: conventional commits, e.g.
  `chore(post-processing): remove dead Gemini client and command module`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Confirm the files are truly unreferenced

Run:
```
grep -rn "gemini_client" src-tauri/src
grep -rn "commands::gemini\|crate::commands::gemini" src-tauri/src
```

Expected: the first returns matches **only** inside
`src-tauri/src/gemini_client.rs` itself (self-references). The second returns
**nothing**.

If either returns a real usage elsewhere → STOP (see STOP conditions).

### Step 2: Delete the two dead files

```
git rm src-tauri/src/gemini_client.rs src-tauri/src/commands/gemini.rs
```

### Step 3: Remove the module declaration

In `src-tauri/src/commands/mod.rs`, delete the line:
```rust
pub mod gemini;
```
The remaining `pub mod` lines (`audio`, `history`, `models`, `transcription`)
stay.

**Verify**: `cd src-tauri && cargo check` → exit 0, no errors and no
"unresolved module" warning for `gemini`.

### Step 4: Final grep sweep

**Verify**: `grep -rn "gemini_client\|mod gemini" src-tauri/src` → returns
nothing (the only remaining `gemini` reference in the tree is the provider-id
string at `settings.rs:599`, which `grep -rn "gemini" src-tauri/src` will still
show — that is correct and expected).

## Test plan

- No new tests. This is a pure deletion of unreachable code; the verification is
  that the backend still compiles (`cargo check`) and no references remain.
- If the repo's Rust test suite is runnable in your environment, run
  `cd src-tauri && cargo test` and confirm it still builds/passes; if it does
  not build for unrelated reasons, note that in your report rather than fixing it
  here.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `src-tauri/src/gemini_client.rs` no longer exists.
- [ ] `src-tauri/src/commands/gemini.rs` no longer exists.
- [ ] `src-tauri/src/commands/mod.rs` does not contain `pub mod gemini;`.
- [ ] `cd src-tauri && cargo check` exits 0.
- [ ] `grep -rn "gemini_client\|mod gemini" src-tauri/src` returns no matches.
- [ ] `grep -rn "\"gemini\"" src-tauri/src/settings.rs` still returns the
      provider-id line (untouched).
- [ ] `plans/README.md` status row for plan 002 updated.

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1 finds a real usage of `gemini_client` functions or the `commands::gemini`
  module anywhere outside the two files being deleted (the codebase drifted and
  the code is no longer dead).
- `cargo check` fails after the deletion with an error that references `gemini`.
- `src-tauri/src/commands/gemini.rs` contains real code (not the two-line
  tombstone) — drift; the file may have been repurposed.

## Maintenance notes

- If Gemini support is ever wanted again, it should be added as a provider entry
  in the unified `llm_client.rs` + `PostProcessProvider` system (the same way
  OpenAI/Anthropic/Groq are handled), not by resurrecting these files.
- A reviewer should confirm `src/bindings.ts` (regenerated on the next
  tauri-specta build) contains no gemini command — but that regeneration is out
  of scope for this plan.
