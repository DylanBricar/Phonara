# Plan 005: Validate the custom LLM provider `base_url` (require HTTPS except localhost)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 104a551..HEAD -- src-tauri/src/shortcut/mod.rs src-tauri/src/llm_client.rs`
> If either changed since this plan was written, compare the "Current state"
> excerpts against the live code before proceeding; on a mismatch, treat it as a
> STOP condition.

## Why this matters

The "Custom" post-processing provider lets the user set an arbitrary `base_url`,
and the LLM client builds the request URL by raw string concatenation:

```rust
let base_url = provider.base_url.trim_end_matches('/');
let url = format!("{}/chat/completions", base_url);
```

There is no scheme or format validation, and the shipped default for the custom
provider is `http://localhost:11434/v1` (plain HTTP). Every post-process request
sends the **full transcript** plus the user's **API key** (in an `Authorization`
/ `x-api-key` header) to that URL. If a user points the custom provider at a
plain-`http://` non-local host — easy to do by copy-pasting an endpoint — those
secrets travel in cleartext and are trivially interceptable on a shared network.
Validating the URL at the point it is saved closes this with a clear error the
user sees immediately, while still allowing plain HTTP for genuine localhost use
(Ollama, LM Studio, etc.).

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `104a551`, 2026-06-13

## Current state

- `src-tauri/src/shortcut/mod.rs:912-939` — the single write path for a
  provider's base URL. Only the `custom` provider may be edited; this is the
  right place to validate:

```rust
#[tauri::command]
#[specta::specta]
pub fn change_post_process_base_url_setting(
    app: AppHandle,
    provider_id: String,
    base_url: String,
) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);
    let label = settings
        .post_process_provider(&provider_id)
        .map(|provider| provider.label.clone())
        .ok_or_else(|| format!("Provider '{}' not found", provider_id))?;

    let provider = settings
        .post_process_provider_mut(&provider_id)
        .expect("Provider looked up above must exist");

    if provider.id != "custom" {
        return Err(format!(
            "Provider '{}' does not allow editing the base URL",
            label
        ));
    }

    provider.base_url = base_url;
    settings::write_settings(&app, settings);
    Ok(())
}
```

- `src-tauri/src/llm_client.rs:120-121` and `:196-197` — the two consumers that
  concatenate `base_url` into a request URL (`/chat/completions` and `/models`).
  These are downstream of the write path; no change needed there if we validate
  on write.
- Convention: these command handlers return `Result<(), String>` and surface the
  `Err` string to the frontend. Match it.

## Commands you will need

| Purpose    | Command                                   | Expected on success |
|------------|-------------------------------------------|---------------------|
| Rust build | `cd src-tauri && cargo check`             | exit 0              |
| Rust tests | `cd src-tauri && cargo test base_url`     | build + pass        |

## Scope

**In scope** (the only file you should modify):
- `src-tauri/src/shortcut/mod.rs` — add validation in
  `change_post_process_base_url_setting` plus a pure validator helper + tests.

**Out of scope** (do NOT touch):
- `src-tauri/src/llm_client.rs` — do not change the URL concatenation; validating
  on write is sufficient and keeps the blast radius small.
- The default provider definitions in `settings.rs` — the localhost HTTP default
  for the custom provider stays (it is valid under the rule below).
- The frontend input component — a UI-side warning is a deferred follow-up.

## Git workflow

- Branch: `advisor/005-validate-custom-llm-base-url`
- Commit message style: conventional commits, e.g.
  `fix(post-processing): require https for custom LLM endpoints (allow localhost)`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add a pure validator helper

In `src-tauri/src/shortcut/mod.rs`, add a free function that enforces: the URL
must parse, use `http` or `https`, and may only use plain `http` when the host is
loopback. Use the `url` crate if it is already a dependency; otherwise do a
minimal manual scheme/host check (do NOT add a new dependency under this plan).

First check whether `url` is available: `grep -n '^url ' src-tauri/Cargo.toml`.

- **If `url` is a dependency**, target this shape:

```rust
/// Validate a user-supplied custom provider base URL. Plain http is only
/// allowed for loopback hosts; everything else must be https. Returns the
/// trimmed URL on success.
fn validate_custom_base_url(input: &str) -> Result<String, String> {
    let trimmed = input.trim();
    if trimmed.is_empty() {
        return Err("Base URL cannot be empty".to_string());
    }
    let parsed = url::Url::parse(trimmed)
        .map_err(|_| format!("'{}' is not a valid URL", trimmed))?;
    let host = parsed.host_str().unwrap_or("");
    let is_loopback = matches!(host, "localhost" | "127.0.0.1" | "::1");
    match parsed.scheme() {
        "https" => Ok(trimmed.to_string()),
        "http" if is_loopback => Ok(trimmed.to_string()),
        "http" => Err(
            "Custom endpoints must use https (plain http is only allowed for localhost)"
                .to_string(),
        ),
        other => Err(format!("Unsupported URL scheme '{}': use https", other)),
    }
}
```

- **If `url` is NOT a dependency**, implement the same rule with manual string
  checks (lowercase the input; require it to start with `https://`, or with
  `http://localhost`, `http://127.0.0.1`, or `http://[::1]`; otherwise return the
  appropriate error). Keep the same function signature and error messages.

**Verify**: `cd src-tauri && cargo check` → exit 0 (a `dead_code` warning until
Step 2 is fine).

### Step 2: Call the validator before persisting

In `change_post_process_base_url_setting`, after the `provider.id != "custom"`
guard, replace `provider.base_url = base_url;` with:

```rust
    let validated = validate_custom_base_url(&base_url)?;
    provider.base_url = validated;
```

**Verify**: `cd src-tauri && cargo check` → exit 0.

### Step 3: Unit-test the validator

Add a `#[cfg(test)]` module (or extend an existing one) in `shortcut/mod.rs` with
`validate_custom_base_url` cases:

- `https://api.example.com/v1` → `Ok`.
- `http://localhost:11434/v1` → `Ok` (the shipped default must remain valid).
- `http://127.0.0.1:11434` → `Ok`.
- `http://api.example.com/v1` → `Err` (plain http, non-local).
- `ftp://example.com` → `Err` (bad scheme).
- `""` / `"   "` → `Err` (empty).
- `"not a url"` → `Err`.

**Verify**: `cd src-tauri && cargo test base_url` → builds and all new tests
pass.

## Test plan

- New unit tests for `validate_custom_base_url` as enumerated in Step 3,
  including the regression case (plain-http non-local rejected) and the
  must-still-work case (localhost http and the shipped default accepted).
- Verification: `cd src-tauri && cargo test base_url` → all pass.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `change_post_process_base_url_setting` calls `validate_custom_base_url` and
      persists only the validated value.
- [ ] `validate_custom_base_url` exists with the rule "https required except
      loopback http".
- [ ] `cd src-tauri && cargo check` exits 0.
- [ ] `cd src-tauri && cargo test base_url` builds and passes, including the
      enumerated cases.
- [ ] Only `src-tauri/src/shortcut/mod.rs` is modified (`git status`).
- [ ] `plans/README.md` status row for plan 005 updated.

## STOP conditions

Stop and report back (do not improvise) if:

- `change_post_process_base_url_setting` no longer matches the excerpt (drift),
  or the "custom-only" guard has moved.
- Adding the `url` crate appears necessary AND the manual fallback can't cleanly
  express the rule — report rather than adding a dependency.
- A second write path for `base_url` exists (`grep -rn "\.base_url =" src-tauri/src`)
  that bypasses this command — note it; it would need the same validation.

## Maintenance notes

- Validation is enforced on **write**, so existing stored values are not
  retroactively validated. If a user already saved a plain-http remote URL before
  this change, it keeps working until they next edit it. A follow-up could
  validate on read/use in `llm_client.rs` if stricter enforcement is wanted.
- A reviewer should confirm loopback HTTP still works (Ollama/LM Studio users
  depend on it) and that the error strings are user-readable.
- Deferred: a matching inline warning in the custom-endpoint input field in the
  frontend (`src/components/settings/models/ModelsSettings.tsx`).
