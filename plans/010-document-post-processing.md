# Plan 010: Document the post-processing feature and reconcile the README roadmap

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 104a551..HEAD -- README.md CLAUDE.md AGENTS.md`
> If any changed since this plan was written, re-read them before editing.

## Why this matters

Parler is a fork of "Handy" whose defining new capability is **LLM
post-processing of transcripts** (custom prompts/actions, multiple providers
including Apple Intelligence). Yet `README.md` and `CLAUDE.md`/`AGENTS.md` still
describe upstream Handy as a Whisper-only speech-to-text tool and never mention
post-processing, language models, providers, or actions. Separately, the README
"Roadmap & Active Development" section lists items as "In Progress" that have no
corresponding code (debug-logging-to-file, macOS Globe key, opt-in analytics,
settings refactor) — misleading anyone deciding what to build. This plan makes
the docs match the code: it adds a user-facing post-processing section and a
contributor-facing architecture note, and reconciles the roadmap. It is
documentation-only — no code behavior changes.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: docs
- **Planned at**: commit `104a551`, 2026-06-13

## Current state — facts to document (verified in code)

These are the load-bearing facts; the executor must NOT invent capabilities
beyond them. Confirm each against the cited file before writing.

- **What it does**: after transcription, text can be passed through an LLM to
  clean up / reformat / transform it, then pasted. Triggered by a dedicated
  shortcut (`transcribe_with_post_process`) or by selecting an action.
  - Evidence: `src-tauri/src/actions.rs` — `TranscribeAction { post_process }`,
    `process_transcription_output`, `run_post_process_action`,
    `ACTION_MAP` contains `"transcribe"` and `"transcribe_with_post_process"`.
- **Providers**: an OpenAI-compatible HTTP client plus Apple Intelligence
  (native, macOS Apple Silicon only).
  - Evidence: `src-tauri/src/llm_client.rs` (`send_chat_completion_with_schema`,
    `fetch_models`, OpenAI-style `/chat/completions` + `/models`); provider
    auth handles `anthropic` (`x-api-key`) vs. bearer (`Authorization`) at
    `llm_client.rs:66-82`. Apple Intelligence path in
    `src-tauri/src/apple_intelligence.rs` and `actions.rs:146-182`, gated on
    `#[cfg(all(target_os = "macos", target_arch = "aarch64"))]` and
    `check_apple_intelligence_availability()`.
  - Default provider list (ids/labels) is in
    `src-tauri/src/settings.rs` `default_post_process_providers()` (around lines
    560–660) — includes a `custom` provider whose base URL is user-editable.
- **Settings/types**: `PostProcessProvider`, `LLMModel`, `LLMPrompt`,
  `PostProcessAction`, `post_process_api_keys`, `post_process_enabled` in
  `src-tauri/src/settings.rs`.
- **Frontend**: `src/components/settings/post-processing/PostProcessingSettings.tsx`
  and `src/components/settings/models/ModelsSettings.tsx` (provider/model/API-key
  UI). Tauri commands: `change_post_process_*`, `add_llm_model`,
  `add_post_process_action`, etc. (see `src/bindings.ts`).
- **Roadmap reality check** — for each README "In Progress" item, the executor
  must verify against the code before keeping/moving it:
  - "Debug Logging to a file": search `crate::FILE_LOG_LEVEL` / `tauri_plugin_log`
    — file logging **does** exist (`commands/mod.rs` `set_log_level`,
    `open_log_dir`). So this item is largely **done**, not in progress.
  - "macOS Globe key": `grep -rin "globe" src-tauri/src` → if no matches, it is
    **not implemented**.
  - "Opt-in Analytics": `grep -rin "analytics\|telemetry" src-tauri/src src` → if
    no matches, **not implemented**.
  - "Settings Refactoring" / "Tauri Commands Cleanup / tauri-specta": `specta`
    is already a dependency and in use (`#[specta::specta]` throughout) — so the
    tauri-specta investigation is **done**; the settings refactor is still
    pending (see `settings.rs` size).
  Use the grep results, not assumptions, to decide each item's status.

## Commands you will need

| Purpose            | Command                               | Expected on success |
|--------------------|---------------------------------------|---------------------|
| Markdown format    | `bunx prettier --write README.md CLAUDE.md AGENTS.md` | exit 0 |
| Format check       | `bunx prettier --check README.md CLAUDE.md AGENTS.md` | exit 0 |
| Grep checks        | as listed in "Current state"          | informs roadmap edits |

## Scope

**In scope** (modify only these):
- `README.md` — add a "Post-Processing with Language Models" section; reconcile
  the "Roadmap & Active Development" section.
- `CLAUDE.md` — add a "Post-Processing Architecture" subsection under the backend
  architecture description.
- `AGENTS.md` — same architecture note (these two files mirror each other; keep
  them consistent).

**Out of scope** (do NOT touch):
- Any source code. This is docs-only.
- The "Verify Release Signatures", "Troubleshooting", "Manual Model Installation"
  README sections — unrelated and correct.
- Do not change the public `pubkey`, URLs, or install instructions.

## Git workflow

- Branch: `advisor/010-document-post-processing`
- Commit message style: conventional commits, e.g.
  `docs: document post-processing and reconcile roadmap`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Verify the facts

Run the greps in "Current state" and skim the cited files. Write down, for your
own reference, the actual provider ids/labels from
`default_post_process_providers()` and the real status of each roadmap item. Do
not document anything you could not confirm.

### Step 2: Add the README post-processing section

Add a new top-level section to `README.md` (place it after "How It Works",
before "Quick Start"), titled **"Post-Processing with Language Models"**. Cover,
in plain user language, only the verified facts:
- what post-processing does and how it's triggered (dedicated shortcut / actions);
- supported provider types (OpenAI-compatible APIs incl. the named defaults; the
  user-editable Custom endpoint; Apple Intelligence on macOS Apple Silicon);
- where to configure it (Settings → Models / Post-Processing), and that API keys
  are entered there;
- that it runs only when the user invokes the post-process trigger; the plain
  transcribe shortcut is unaffected.

Keep it concise (a screen or so). Do not promise features that don't exist.

### Step 3: Add the architecture note to CLAUDE.md and AGENTS.md

In both `CLAUDE.md` and `AGENTS.md`, under the backend architecture description,
add a **"Post-Processing Architecture"** subsection mapping the moving parts:
- `actions.rs` — `ShortcutAction` trait, `TranscribeAction` (`post_process`
  flag), action resolution, `process_transcription_output`.
- `llm_client.rs` — OpenAI-compatible client (`/chat/completions`, `/models`),
  provider-specific auth headers.
- `apple_intelligence.rs` — native macOS-only provider (cfg-gated).
- `settings.rs` — `PostProcessProvider` / `LLMModel` / `LLMPrompt` /
  `PostProcessAction` / `post_process_api_keys`.
- frontend: `PostProcessingSettings.tsx`, `ModelsSettings.tsx`, and the
  `change_post_process_*` commands.
Keep CLAUDE.md and AGENTS.md consistent (same content, matching each file's
style).

### Step 4: Reconcile the README roadmap

Edit the "Roadmap & Active Development" section based on the verified statuses
from Step 1:
- Move items confirmed **implemented** (file logging; tauri-specta) out of "In
  Progress" — either delete or move to a brief "Recently shipped" note.
- For items confirmed **not implemented** (Globe key, analytics, if greps return
  nothing), keep them but under a clearly-labeled "Ideas / Not started" heading
  rather than "In Progress".
- Keep "Settings refactoring" as a genuine pending item if `settings.rs` is still
  the large single module (it is at this commit).
Do not invent new roadmap items.

### Step 5: Format

**Verify**: `bunx prettier --write README.md CLAUDE.md AGENTS.md` then
`bunx prettier --check README.md CLAUDE.md AGENTS.md` → exit 0.

## Test plan

- Docs-only; no automated tests. Verification is `prettier --check` passing and a
  self-review that every documented capability traces to a cited file from
  "Current state".

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `README.md` contains a "Post-Processing with Language Models" section.
- [ ] `grep -n "Post-Processing Architecture" CLAUDE.md AGENTS.md` → matches in
      both.
- [ ] The README "Roadmap" no longer lists already-shipped items (file logging,
      tauri-specta) under "In Progress".
- [ ] `bunx prettier --check README.md CLAUDE.md AGENTS.md` exits 0.
- [ ] No source files modified (`git status` shows only the three docs).
- [ ] `plans/README.md` status row for plan 010 updated.

## STOP conditions

Stop and report back (do not improvise) if:

- A grep contradicts this plan's assumption about a feature's status in a way you
  can't resolve (e.g. analytics code actually exists) — report the finding rather
  than documenting either way.
- The post-processing code has been substantially restructured since this plan
  (the cited symbols in `actions.rs`/`llm_client.rs` are gone) — the architecture
  note would be wrong; stop and report.

## Maintenance notes

- Keep `CLAUDE.md` and `AGENTS.md` in sync — they duplicate guidance by design.
- When providers or actions change, the README provider list and the architecture
  note must be updated; call this out so reviewers check docs on post-processing
  PRs.
- Deferred: a dedicated `POST_PROCESSING.md` with example prompts and a setup
  walkthrough — out of scope here; this plan establishes the baseline docs.
