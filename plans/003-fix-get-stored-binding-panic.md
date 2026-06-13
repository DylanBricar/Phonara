# Plan 003: Stop `get_stored_binding` from panicking on an unknown binding id

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 104a551..HEAD -- src-tauri/src/settings.rs src-tauri/src/shortcut/mod.rs`
> If either changed since this plan was written, compare the "Current state"
> excerpts against the live code before proceeding; on a mismatch, treat it as a
> STOP condition.

## Why this matters

`get_stored_binding` does `bindings.get(id).unwrap()`. If it is ever called with
an id that is not present in the stored bindings map — a stale id from the
frontend, a binding that was removed, a feature-flagged binding that isn't
backfilled yet, or a typo — the whole Rust process panics instead of returning a
recoverable error. The function is reachable from the `reset_binding` Tauri
command, which the UI invokes. A single bad id should surface as an error toast,
not crash the app.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `104a551`, 2026-06-13

## Current state

- `src-tauri/src/settings.rs:1165-1169` — the panicking function:

```rust
pub fn get_stored_binding(app: &AppHandle, id: &str) -> ShortcutBinding {
    let bindings = get_bindings(app);

    let binding = bindings.get(id).unwrap().clone();
    // ... (returns `binding`)
```

- The only caller is `src-tauri/src/shortcut/mod.rs:251-256`:

```rust
#[tauri::command]
#[specta::specta]
pub fn reset_binding(app: AppHandle, id: String) -> Result<BindingResponse, String> {
    let binding = settings::get_stored_binding(&app, &id);
    change_binding(app, id, binding.default_binding)
}
```

`reset_binding` already returns `Result<BindingResponse, String>`, so the error
channel back to the frontend exists — we just need `get_stored_binding` to use
it instead of panicking.

- Convention: throughout this codebase, fallible backend operations return
  `Result<T, String>` with a human-readable message (see `change_binding`,
  `change_post_process_base_url_setting`, etc. in `src-tauri/src/shortcut/mod.rs`,
  which use `.ok_or_else(|| format!("Provider '{}' not found", provider_id))?`).
  Match that pattern.

## Commands you will need

| Purpose    | Command                              | Expected on success |
|------------|--------------------------------------|---------------------|
| Rust build | `cd src-tauri && cargo check`        | exit 0, no errors   |
| Rust tests | `cd src-tauri && cargo test settings`| build + pass        |

## Scope

**In scope** (the only files you should modify):
- `src-tauri/src/settings.rs` — change `get_stored_binding`'s signature and body
- `src-tauri/src/shortcut/mod.rs` — update the single caller `reset_binding`

**Out of scope** (do NOT touch):
- Any other function in `settings.rs`. In particular, do NOT change the other
  `.unwrap()` calls in `get_settings`/`write_settings` (lines ~1095, 1145, 1156)
  — those serialize known-good default structs and are a separate concern.
- `change_binding` itself — its behavior is unchanged.

## Git workflow

- Branch: `advisor/003-fix-get-stored-binding-panic`
- Commit message style: conventional commits, e.g.
  `fix(settings): return error instead of panicking on unknown binding id`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Make `get_stored_binding` fallible

In `src-tauri/src/settings.rs`, change the function to return a `Result` and use
`ok_or_else` instead of `unwrap`. Target shape:

```rust
pub fn get_stored_binding(app: &AppHandle, id: &str) -> Result<ShortcutBinding, String> {
    let bindings = get_bindings(app);

    let binding = bindings
        .get(id)
        .cloned()
        .ok_or_else(|| format!("Binding '{}' not found", id))?;

    Ok(binding)
}
```

Keep the rest of the original body's logic, but make every path return
`Ok(binding)` / propagate the error. If the original function did additional work
after fetching `binding` before returning, preserve that work and wrap the final
value in `Ok(...)`. (Read lines 1165–1180 of the live file to confirm the full
body before editing.)

**Verify**: `cd src-tauri && cargo check` → it will now report a type error at
the `reset_binding` caller (expected — fixed in Step 2).

### Step 2: Update the `reset_binding` caller

In `src-tauri/src/shortcut/mod.rs`, change `reset_binding` to propagate the error
with `?`:

```rust
pub fn reset_binding(app: AppHandle, id: String) -> Result<BindingResponse, String> {
    let binding = settings::get_stored_binding(&app, &id)?;
    change_binding(app, id, binding.default_binding)
}
```

**Verify**: `cd src-tauri && cargo check` → exit 0, no errors.

### Step 3: Confirm no other callers exist

**Verify**: `grep -rn "get_stored_binding" src-tauri/src` → returns exactly two
lines: the definition in `settings.rs` and the call in `shortcut/mod.rs`. If a
third caller exists, it must also be updated to handle the `Result` (apply the
same `?` propagation if it already returns `Result<_, String>`, otherwise STOP
and report).

## Test plan

- Add a Rust unit test next to the other `#[cfg(test)]` tests in
  `src-tauri/src/settings.rs` (search the file for `#[cfg(test)]`; if a test
  module exists, add to it — otherwise add one at the end of the file following
  the structure of an existing test module elsewhere in the crate, e.g. in
  `src-tauri/src/audio_toolkit/text.rs`).
- The test should cover the lookup logic that previously panicked. Because
  `get_stored_binding` takes an `&AppHandle` (hard to construct in a unit test),
  extract the lookup into a small pure helper if and only if it can be done
  cleanly, e.g.:
  ```rust
  fn lookup_binding(
      bindings: &HashMap<String, ShortcutBinding>,
      id: &str,
  ) -> Result<ShortcutBinding, String> { ... }
  ```
  and have `get_stored_binding` call it. Then test `lookup_binding` with:
  - happy path: an id that exists → `Ok(binding)`.
  - the regression: an id that does NOT exist → `Err` (and the process does not
    panic).
- If extracting the helper would require touching out-of-scope code or is
  awkward, skip the unit test and instead note in your report that the change is
  covered only by `cargo check`; do not force an awkward test.
- Verification: `cd src-tauri && cargo test settings` → builds and passes,
  including the new test if added.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `get_stored_binding` returns `Result<ShortcutBinding, String>` and contains
      no `.unwrap()` on the binding lookup.
- [ ] `grep -n "bindings.get(id).unwrap()" src-tauri/src/settings.rs` returns no
      matches.
- [ ] `reset_binding` compiles using `?` to propagate the error.
- [ ] `cd src-tauri && cargo check` exits 0.
- [ ] `cd src-tauri && cargo test settings` builds and passes.
- [ ] No files outside the in-scope list are modified (`git status`).
- [ ] `plans/README.md` status row for plan 003 updated.

## STOP conditions

Stop and report back (do not improvise) if:

- The live `get_stored_binding` body does substantially more than the excerpt
  shows (drift) and you are unsure how to preserve its behavior under a `Result`.
- `grep` finds a caller of `get_stored_binding` other than `reset_binding` that
  does NOT already return `Result<_, String>` (changing its signature would
  ripple further than this plan's scope).
- `cargo check` fails for a reason unrelated to this change.

## Maintenance notes

- This is a defensive fix; the UI should already only send valid ids, but the
  backend should never panic on bad input from the IPC boundary.
- A reviewer should confirm the error message is user-meaningful and that
  `reset_binding`'s `Result` reaches a frontend toast (it does today via the
  generated bindings).
- Follow-up (not in scope): other Tauri command handlers in `shortcut/mod.rs`
  could be swept for similar `unwrap`/`expect` on IPC-supplied ids.
