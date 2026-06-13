# Plan 009: Surface a toast when post-processing silently fails

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 104a551..HEAD -- src-tauri/src/actions.rs src/App.tsx src/lib/types/events.ts`
> If any changed since this plan was written, compare the "Current state"
> excerpts against the live code before proceeding; on a mismatch, treat it as a
> STOP condition.

## Why this matters

When the user triggers transcription **with post-processing** (the
`transcribe_with_post_process` shortcut, or a selected action), the LLM step can
fail or no-op for several reasons: the provider/API call errors, the API key is
missing, the model returns empty, or Apple Intelligence isn't available. In all
of these, `run_post_process_action` returns `None` and the pipeline silently
falls back to pasting the **raw, un-processed** transcript (see Current state).
There is no data loss — but there is also **no signal**. A user who relies on
post-processing to clean up dictation gets raw text with no idea their cleanup
step didn't run; only a backend `error!`/`debug!` log records it. This plan emits
a `post-process-error` event in exactly that case and shows a toast, mirroring
the existing `recording-error` event pattern. The transcript still pastes; the
user just learns post-processing was skipped.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none (independent; pairs well with plan 011's tests)
- **Category**: bug
- **Planned at**: commit `104a551`, 2026-06-13

## Current state

The silent fallback is in `src-tauri/src/actions.rs`, inside
`TranscribeAction::stop`'s async task (lines 539–555). An action was resolved and
we attempt post-processing; on `None` we just reuse `base` (the raw transcript):

```rust
let processed = if let Some(action) = action {
    show_processing_overlay(&ah);
    let base =
        process_transcription_output(&ah, &transcription, false).await;
    match run_post_process_action(&settings, &base.final_text, &action)
        .await
    {
        Some(result) => ProcessedTranscription {
            final_text: result.clone(),
            post_processed_text: Some(result),
            post_process_prompt: Some(action.prompt.clone()),
        },
        None => base,   // <-- silent: raw transcript pasted, no user signal
    }
} else {
    process_transcription_output(&ah, &transcription, false).await
};
```

The codebase already has a complete event→toast pattern to copy:

- **Backend event struct** — `src-tauri/src/actions.rs:26-30`:
  ```rust
  #[derive(Clone, serde::Serialize)]
  struct RecordingErrorEvent {
      error_type: String,
      detail: Option<String>,
  }
  ```
- **Backend emit** — `src-tauri/src/actions.rs:403-409`:
  ```rust
  let _ = app.emit(
      "recording-error",
      RecordingErrorEvent { error_type: ..., detail: Some(err) },
  );
  ```
  (`use tauri::{AppHandle, Emitter};` is already imported at line 24; in the
  async task the handle is `ah`.)
- **Frontend type** — `src/lib/types/events.ts`:
  ```ts
  export interface RecordingErrorEvent {
    error_type: string;
    detail?: string;
  }
  ```
- **Frontend listener + toast** — `src/App.tsx:118-143` listens with
  `listen<RecordingErrorEvent>("recording-error", ...)` and calls
  `toast.error(t(...))`. `toast` (from `sonner`), `listen`, and `t` are already
  imported in `App.tsx`.

i18n: user-facing strings must come from `t(...)` (ESLint enforces no hardcoded
JSX strings). New keys go in `src/i18n/locales/en/translation.json` under the
existing `errors` group (see `errors.recordingFailed`, `errors.modelLoadFailed`).

## Commands you will need

| Purpose            | Command                                | Expected on success |
|--------------------|----------------------------------------|---------------------|
| Rust build         | `cd src-tauri && cargo check`          | exit 0              |
| Typecheck          | `bunx tsc --noEmit`                    | exit 0              |
| Lint               | `bun run lint`                         | exit 0              |
| Translation check  | `bun scripts/check-translations.ts`    | run; see note below |

Note on translations: adding a key only to `en` will make
`check-translations.ts` report it missing in other locales. That is expected;
either (a) coordinate with plan 007 ordering, or (b) add the same English
placeholder key to all locales as part of this change. Pick (b) if plan 007 has
not landed — see Step 4.

## Scope

**In scope** (modify only these):
- `src-tauri/src/actions.rs` — add a `PostProcessErrorEvent` struct and emit it
  at the `None` arm.
- `src/lib/types/events.ts` — add the matching TS interface.
- `src/App.tsx` — add a listener that shows a toast.
- `src/i18n/locales/en/translation.json` — add the toast string(s); and the other
  19 locale files if doing (b) above.

**Out of scope** (do NOT touch):
- `run_post_process_action` / `process_action` signatures in `actions.rs` — do
  NOT thread an `AppHandle` into them. Emit from the `stop` async task where `ah`
  is already in scope. This keeps the change localized and avoids reshaping the
  post-processing API.
- The paste/history logic — the transcript must still paste exactly as today.
- The `recording-error` and `model-state-changed` events — unchanged.

## Git workflow

- Branch: `advisor/009-surface-post-process-failures`
- Commit message style: conventional commits, e.g.
  `feat(post-processing): notify the user when post-processing is skipped`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add the backend event struct

In `src-tauri/src/actions.rs`, next to `RecordingErrorEvent` (around line 26),
add:

```rust
#[derive(Clone, serde::Serialize)]
struct PostProcessErrorEvent {
    detail: Option<String>,
}
```

### Step 2: Emit the event at the silent-fallback arm

In `TranscribeAction::stop`'s async task, change the `None => base` arm (line
~551) to emit before falling back. The raw transcript still pastes — we only add
a notification:

```rust
None => {
    let _ = ah.emit(
        "post-process-error",
        PostProcessErrorEvent { detail: None },
    );
    base
}
```

(`ah` is the `AppHandle` clone live in this async block; `Emitter` is already in
scope via the existing `use tauri::{AppHandle, Emitter};`.)

**Verify**: `cd src-tauri && cargo check` → exit 0.

### Step 3: Add the frontend type + listener + toast

- In `src/lib/types/events.ts`, add:
  ```ts
  export interface PostProcessErrorEvent {
    detail?: string;
  }
  ```
- In `src/App.tsx`, import `PostProcessErrorEvent` alongside the existing
  `RecordingErrorEvent` import, and add a new `useEffect` listener modeled exactly
  on the `recording-error` one (lines 118–143):
  ```tsx
  useEffect(() => {
    const unlisten = listen<PostProcessErrorEvent>(
      "post-process-error",
      () => {
        toast.error(t("errors.postProcessFailedTitle"), {
          description: t("errors.postProcessFailed"),
        });
      },
    );
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [t]);
  ```

**Verify**: `bunx tsc --noEmit` → exit 0.

### Step 4: Add i18n strings

In `src/i18n/locales/en/translation.json`, under the existing `errors` object,
add:

```json
"postProcessFailedTitle": "Post-processing skipped",
"postProcessFailed": "Post-processing failed, so the raw transcription was pasted instead."
```

If plan 007 (translation backfill) has **not** landed yet, add the same two keys
(English placeholder values are fine) to all 19 non-English
`src/i18n/locales/*/translation.json` files so `check-translations.ts` stays
green. If plan 007 has landed or is being run after this, you may add only to
`en` and let plan 007's sync pick them up — state which choice you made in your
report.

**Verify**:
- `bun run lint` → exit 0 (no hardcoded-string or unused-import errors).
- `bun scripts/check-translations.ts` → passes if you chose to add to all locales;
  if you added only to `en`, it will report these 2 keys missing elsewhere — note
  that in your report.

## Test plan

- No unit-test runner exists for this async Tauri path, so verification is the
  compile/lint gates plus a manual smoke test **if** a dev environment is already
  running (do not stand one up just for this):
  - Configure a post-process action with an invalid API key, trigger
    transcribe-with-post-process, and confirm: (a) the raw transcript still
    pastes, and (b) a "Post-processing skipped" toast appears.
- If you cannot run the app, say so; the contract is the emitted event + listener
  wiring, which the gates verify structurally.
- A backend unit test is impractical here (requires `AppHandle` + live LLM); do
  not force one.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `actions.rs` defines `PostProcessErrorEvent` and emits `"post-process-error"`
      in the `None` arm of the post-process match; the raw-transcript fallback
      (`base`) is preserved.
- [ ] `grep -n "post-process-error" src-tauri/src/actions.rs src/App.tsx` shows
      both the emit and the listener.
- [ ] `src/lib/types/events.ts` exports `PostProcessErrorEvent`.
- [ ] `cd src-tauri && cargo check` exits 0.
- [ ] `bunx tsc --noEmit` exits 0.
- [ ] `bun run lint` exits 0.
- [ ] New `errors.postProcessFailed*` keys exist in `en` (and per the Step 4
      choice, in other locales).
- [ ] Only the in-scope files are modified (`git status`).
- [ ] `plans/README.md` status row for plan 009 updated.

## STOP conditions

Stop and report back (do not improvise) if:

- The `None => base` arm in `actions.rs` no longer matches the excerpt (drift in
  the post-processing pipeline).
- Emitting requires threading an `AppHandle` somewhere it isn't already available
  (it should not — `ah` is in scope at the emit site). If you find yourself about
  to change `run_post_process_action`'s signature, STOP.
- `cargo check` or `tsc` fails for a reason unrelated to this change.

## Maintenance notes

- This intentionally emits one generic event for all `None` causes (API error,
  missing key, empty result, Apple Intelligence unavailable). A future refinement
  could pass a `detail`/reason string from `run_post_process_action` so the toast
  distinguishes "not configured" from "API error" — deferred to avoid reshaping
  the post-processing API now.
- A reviewer should confirm the transcript still pastes on failure (the event is
  additive) and that no event is emitted on the **success** path or when no
  post-processing was requested (the `else` branch must stay silent).
