# Plan 012: Move LLM API keys out of the plaintext settings store into the OS keychain

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md`.
>
> **This is the highest-risk plan in this set.** It touches credential storage
> across backend modules and a settings migration. If you are a smaller model or
> anything is ambiguous, prefer STOP-and-report over guessing.
>
> **Drift check (run first)**: `git diff --stat 104a551..HEAD -- src-tauri/src/settings.rs src-tauri/src/shortcut/mod.rs src-tauri/src/actions.rs src-tauri/src/lib.rs src-tauri/Cargo.toml`
> If any changed since this plan was written, compare the "Current state"
> excerpts against the live code before proceeding; on a mismatch, STOP.

## Why this matters

LLM provider API keys are stored **in plaintext** in the Tauri settings store on
disk. The `post_process_api_keys` field is a `SecretMap` whose `Debug` impl
redacts values in logs — but `SecretMap` is `#[serde(transparent)]` over
`HashMap<String, String>`, so it serializes the **real keys** verbatim into the
store JSON. Worse, `get_app_settings` returns the whole `AppSettings` to the
frontend, so the real keys also cross the IPC boundary, and `export_settings`
writes them into an exported JSON file. Any local process, backup, sync client,
or shared-settings export leaks every configured key (OpenAI, Anthropic, Groq,
…). This plan moves the secrets to the OS keychain (macOS Keychain / Windows
Credential Manager / Linux Secret Service) and replaces the on-disk/IPC value
with a non-secret **masked sentinel**, while keeping the existing UI working with
**no frontend changes**.

> Credential handling: this plan references locations and the credential *type*
> only — no key values appear anywhere. Any key that was previously written to a
> settings file or an exported JSON should be treated as exposed and **rotated**
> by the user; deletion from disk does not un-leak an already-committed/backed-up
> secret.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: HIGH
- **Depends on**: plans/011-establish-frontend-test-baseline.md (recommended:
  land the test baseline first so the migration logic can be unit-tested)
- **Category**: security
- **Planned at**: commit `104a551`, 2026-06-13

## Current state

- **Field** — `src-tauri/src/settings.rs:435`:
  ```rust
  #[serde(default = "default_post_process_api_keys")]
  pub post_process_api_keys: SecretMap,
  ```
  with `SecretMap(HashMap<String, String>)` at `settings.rs:346-372` — `Debug`
  redacts, but `Serialize` is transparent (real values persisted).
- **Write path** — `src-tauri/src/shortcut/mod.rs:956-968`:
  ```rust
  pub fn change_post_process_api_key_setting(
      app: AppHandle, provider_id: String, api_key: String,
  ) -> Result<(), String> {
      let mut settings = settings::get_settings(&app);
      validate_provider_exists(&settings, &provider_id)?;
      settings.post_process_api_keys.insert(provider_id, api_key);
      settings::write_settings(&app, settings);
      Ok(())
  }
  ```
- **Read sites** (the only two places the real key is consumed):
  1. `src-tauri/src/actions.rs:193-197`:
     ```rust
     let api_key = settings.post_process_api_keys.get(&provider.id).cloned().unwrap_or_default();
     ```
  2. `src-tauri/src/shortcut/mod.rs:1098-1112` (`fetch_models` path):
     ```rust
     let api_key = settings.post_process_api_keys.get(...) ...;
     ...
     crate::llm_client::fetch_models(provider, api_key).await
     ```
- **Frontend** reads `settings.post_process_api_keys[providerId]` and pre-fills
  the input (`src/components/settings/models/ModelsSettings.tsx:39,56,93`), and
  `handleApiKeyBlur` skips writing when `apiKeyInput === currentApiKey`
  (`ModelsSettings.tsx:99-102`). **Key insight**: if the backend returns a masked
  sentinel (e.g. `"********"`) instead of the real key, the UI shows the mask, and
  the equality guard means an untouched field never writes the mask back. Typing a
  real key replaces it. So **no frontend change is required**.
- **Export/import** — `src-tauri/src/commands/mod.rs` `export_settings` /
  `import_settings` serialize/deserialize the whole `AppSettings`. After this
  change they will carry only the mask, not real keys (a side benefit).
- **Module registration** — `src-tauri/src/lib.rs:1-21` lists `mod` declarations
  (add the new module there). `Cargo.toml` `[dependencies]` start at line 31; no
  `keyring` dep today.

## Commands you will need

| Purpose    | Command                                   | Expected on success |
|------------|-------------------------------------------|---------------------|
| Rust build | `cd src-tauri && cargo check`             | exit 0              |
| Rust tests | `cd src-tauri && cargo test`              | builds + passes (incl. new migration tests) |
| Typecheck  | `bunx tsc --noEmit`                       | exit 0 (frontend unchanged) |

## Scope

**In scope** (create/modify only these):
- `src-tauri/Cargo.toml` — add the `keyring` dependency.
- `src-tauri/src/secret_store.rs` (create) — keychain wrapper + mask constant.
- `src-tauri/src/lib.rs` — register the new module.
- `src-tauri/src/settings.rs` — migration that moves plaintext keys to keychain
  and masks them in the store; helper to classify real-vs-mask values.
- `src-tauri/src/shortcut/mod.rs` — `change_post_process_api_key_setting` writes
  to keychain; `fetch_models` reads from keychain.
- `src-tauri/src/actions.rs` — `process_action` reads the key from keychain.

**Out of scope** (do NOT touch):
- The frontend. The masked-sentinel design keeps `ModelsSettings.tsx` working
  unchanged. Do NOT modify it.
- `SecretMap`'s definition — keep it; it still usefully redacts `Debug` and now
  holds only masks.
- Other settings, providers, models, prompts, actions.
- The `export_settings`/`import_settings` commands themselves — they keep working;
  they will simply carry masks now.

## Git workflow

- Branch: `advisor/012-move-api-keys-to-os-keychain`
- Commit per step (the steps are ordered so the crate compiles between them).
- Commit message style: conventional commits, e.g.
  `feat(security): store LLM API keys in the OS keychain`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add the `keyring` dependency

In `src-tauri/Cargo.toml` `[dependencies]`, add a platform-native keyring. Use
explicit backend features so each OS uses its native store:

```toml
keyring = { version = "3", features = ["apple-native", "windows-native", "sync-secret-service"] }
```

**Verify**: `cd src-tauri && cargo check` → exit 0 on your build host. If the
Linux `sync-secret-service` backend fails to build for lack of system libs
(dbus/secret-service dev packages), that is a STOP condition — report it; do not
silently drop Linux support.

### Step 2: Create the secret store wrapper

Create `src-tauri/src/secret_store.rs`:

```rust
//! OS-keychain-backed storage for post-processing API keys. The settings store
//! keeps only a non-secret mask; the real secret lives here.

/// Non-secret placeholder stored in settings/IPC/exports in place of a real key.
pub const API_KEY_MASK: &str = "********";

const SERVICE: &str = "com.pais.handy.post_process";

fn entry(provider_id: &str) -> Result<keyring::Entry, String> {
    keyring::Entry::new(SERVICE, provider_id).map_err(|e| format!("keyring error: {}", e))
}

/// Store (or overwrite) the API key for a provider.
pub fn set_api_key(provider_id: &str, api_key: &str) -> Result<(), String> {
    entry(provider_id)?
        .set_password(api_key)
        .map_err(|e| format!("Failed to store API key: {}", e))
}

/// Read the API key for a provider; returns empty string if none is stored.
pub fn get_api_key(provider_id: &str) -> String {
    match entry(provider_id) {
        Ok(e) => e.get_password().unwrap_or_default(),
        Err(_) => String::new(),
    }
}

/// Delete a stored API key (no-op if absent).
pub fn delete_api_key(provider_id: &str) -> Result<(), String> {
    let e = entry(provider_id)?;
    match e.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(err) => Err(format!("Failed to delete API key: {}", err)),
    }
}

/// True if `value` is the mask sentinel (or empty) rather than a real secret.
pub fn is_mask(value: &str) -> bool {
    value.is_empty() || value == API_KEY_MASK
}
```

Register it in `src-tauri/src/lib.rs` by adding `mod secret_store;` to the module
list (keep the list alphabetical-ish, matching the existing ordering).

**Verify**: `cd src-tauri && cargo check` → exit 0 (a few `dead_code` warnings
until later steps wire it in are fine).

### Step 3: Route the write path to the keychain

Rewrite `change_post_process_api_key_setting` in `src-tauri/src/shortcut/mod.rs`
to store the real key in the keychain and persist only the mask:

```rust
pub fn change_post_process_api_key_setting(
    app: AppHandle,
    provider_id: String,
    api_key: String,
) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);
    validate_provider_exists(&settings, &provider_id)?;

    let trimmed = api_key.trim();
    // Ignore writes of the mask itself (untouched field re-submitted).
    if trimmed == crate::secret_store::API_KEY_MASK {
        return Ok(());
    }

    if trimmed.is_empty() {
        crate::secret_store::delete_api_key(&provider_id)?;
        settings.post_process_api_keys.remove(&provider_id);
    } else {
        crate::secret_store::set_api_key(&provider_id, trimmed)?;
        settings
            .post_process_api_keys
            .insert(provider_id, crate::secret_store::API_KEY_MASK.to_string());
    }

    settings::write_settings(&app, settings);
    Ok(())
}
```

**Verify**: `cd src-tauri && cargo check` → exit 0.

### Step 4: Route the two read sites to the keychain

- `src-tauri/src/actions.rs:193-197` — replace the settings-map read with:
  ```rust
  let api_key = crate::secret_store::get_api_key(&provider.id);
  ```
- `src-tauri/src/shortcut/mod.rs:1098-1112` (`fetch_models` path) — replace the
  settings-map read of `api_key` with `crate::secret_store::get_api_key(provider_id)`
  (use the provider id variable already in scope there). Keep the existing
  empty-key guard (`if api_key.trim().is_empty() && provider.id != "custom"`).

**Verify**: `cd src-tauri && cargo check` → exit 0; then
`grep -rn "post_process_api_keys.get" src-tauri/src` → returns **no** matches
(both real-key reads now go through `secret_store`).

### Step 5: Migrate existing plaintext keys on load

Add a migration that runs when settings are loaded, moving any real key currently
in `post_process_api_keys` into the keychain and replacing it with the mask.
Place a helper in `settings.rs` and call it from the existing settings-load
backfill flow (the same place `ensure_post_process_defaults` /
`ensure_action_bindings` are called inside `get_settings`, returning a `changed`
bool so it persists):

```rust
/// Move any plaintext API keys still in the store into the OS keychain,
/// replacing them with the mask. Returns true if the store was changed.
fn migrate_api_keys_to_keychain(settings: &mut AppSettings) -> bool {
    let mut changed = false;
    let provider_ids: Vec<String> = settings.post_process_api_keys.keys().cloned().collect();
    for id in provider_ids {
        if let Some(value) = settings.post_process_api_keys.get(&id).cloned() {
            if !crate::secret_store::is_mask(&value) {
                if crate::secret_store::set_api_key(&id, &value).is_ok() {
                    settings
                        .post_process_api_keys
                        .insert(id, crate::secret_store::API_KEY_MASK.to_string());
                    changed = true;
                }
                // If keychain write fails, leave the value as-is and try again
                // next load rather than silently dropping the user's key.
            }
        }
    }
    changed
}
```

Wire it into `get_settings` next to the other `ensure_*` calls so a changed
result triggers `store.set(...)`. (Read `settings.rs:1101-1149` to place it in the
same `updated |= ...` pattern.)

**Verify**: `cd src-tauri && cargo check` → exit 0.

### Step 6: Unit-test the pure migration/classification logic

Keychain I/O can't be unit-tested without the OS store, so test the **pure**
pieces. Add a `#[cfg(test)]` module (in `secret_store.rs` for `is_mask`, and in
`settings.rs` for the classification) covering:
- `is_mask("")` → true; `is_mask("********")` → true; `is_mask("sk-real")` →
  false.
- A small table-driven test of the "which entries need migration" decision: given
  a map of `{provider -> value}`, the set selected for migration is exactly those
  where `!is_mask(value)`. (Extract that selection into a pure helper if needed so
  it's testable without an `AppHandle`/keychain.)

**Verify**: `cd src-tauri && cargo test secret_store` and
`cd src-tauri && cargo test settings` → build and pass.

### Step 7: Confirm the frontend is untouched and still type-checks

**Verify**:
- `git status` shows **no** changes under `src/`.
- `bunx tsc --noEmit` → exit 0.

## Test plan

- New Rust unit tests for `is_mask` and the migration-selection logic (Step 6).
- Manual smoke test (only if a dev environment is already available — the
  keychain round-trip cannot be unit-tested): set an API key in Settings →
  Models, restart the app, confirm (a) the field shows the mask `********`, (b)
  post-processing still authenticates (key is read from keychain), (c) the
  on-disk settings store no longer contains the real key (inspect the store file
  under the app data dir), (d) `export_settings` produces a JSON with the mask,
  not the real key. If you cannot run the app, state this clearly — the compile
  gates plus the migration unit tests are the structural contract.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `keyring` is a dependency in `src-tauri/Cargo.toml`.
- [ ] `src-tauri/src/secret_store.rs` exists and is registered in `lib.rs`.
- [ ] `grep -rn "post_process_api_keys.get" src-tauri/src` → no matches (no real
      key is read from the settings map anymore).
- [ ] `change_post_process_api_key_setting` writes via `secret_store` and stores
      the mask in settings.
- [ ] A migration runs from `get_settings` and is covered by the
      classification unit test.
- [ ] `cd src-tauri && cargo check` exits 0; `cargo test` builds and passes.
- [ ] `bunx tsc --noEmit` exits 0 and `git status` shows no `src/` changes.
- [ ] No key value appears in any committed file (only the mask).
- [ ] `plans/README.md` status row for plan 012 updated.

## STOP conditions

Stop and report back (do not improvise) if:

- The `keyring` crate fails to build on the target platform (esp. Linux
  secret-service system libs) — report; do not drop a platform's support.
- The masked-sentinel assumption breaks: e.g. `ModelsSettings.tsx`'s blur guard
  (`apiKeyInput === currentApiKey`) has changed so an untouched field WOULD write
  the mask back — that would overwrite real keys with the mask; STOP and reassess
  before proceeding.
- Any read site of `post_process_api_keys` exists beyond the two documented ones
  (`grep -rn "post_process_api_keys" src-tauri/src` shows an unexpected consumer).
- The settings-load flow in `get_settings` no longer matches the excerpt (drift),
  making it unclear where to hook the migration.

## Maintenance notes

- **Rotation**: any API key configured before this change was stored in plaintext
  on disk (and possibly in exported JSON / backups). Advise users in the PR notes
  to rotate previously-entered keys; the migration removes them from the store
  going forward but cannot recall copies that already left the machine.
- The settings store and exports now carry only the mask — a deliberate, durable
  improvement (`export_settings` no longer leaks secrets). Note that
  `import_settings` therefore won't restore keys; the user re-enters them. Call
  this out for reviewers.
- Future: a small frontend affordance to show "configured ✓" instead of the raw
  `********` mask would be a nicer UX (the mask works but is opaque) — deliberately
  deferred to keep this plan backend-only.
- A reviewer should scrutinize: the migration's failure handling (keys must never
  be dropped if the keychain write fails), that no log/`Debug`/event path prints a
  real key, and that the two read sites are the only consumers.
