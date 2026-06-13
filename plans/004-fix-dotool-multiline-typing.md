# Plan 004: Fix `dotool` typing so newlines in text can't break or inject commands

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 104a551..HEAD -- src-tauri/src/clipboard.rs`
> If it changed since this plan was written, compare the "Current state" excerpt
> against the live code before proceeding; on a mismatch, treat it as a STOP
> condition.

## Why this matters

On Linux, `dotool` is driven by a line-based stdin protocol: each line is a
command (`type <text>`, `key <name>`, …). The current code does:

```rust
writeln!(stdin, "type {}", text)
```

If the transcribed `text` contains a newline (multi-paragraph dictation, a list,
code), everything after the first newline is no longer typed as text — `dotool`
interprets each subsequent line as a **command**. In the benign case the rest of
the user's text silently vanishes; in the worst case a line that happens to look
like `key ...` / `click ...` is executed as a real input event. The sibling
`xdotool` and `ydotool` paths don't have this problem because they pass the text
as a single argv element after `--`. This brings `dotool` up to the same safety
and correctly handles multi-line transcripts.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `104a551`, 2026-06-13

## Current state

- `src-tauri/src/clipboard.rs:319-346` — the affected function (Linux-only):

```rust
/// Type text directly via dotool (works on both Wayland and X11 via uinput).
#[cfg(target_os = "linux")]
fn type_text_via_dotool(text: &str) -> Result<(), String> {
    use std::io::Write;
    use std::process::Stdio;

    let mut child = Command::new("dotool")
        .stdin(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn dotool: {}", e))?;

    if let Some(mut stdin) = child.stdin.take() {
        // dotool uses "type <text>" command
        writeln!(stdin, "type {}", text)
            .map_err(|e| format!("Failed to write to dotool stdin: {}", e))?;
    }

    let output = child
        .wait_with_output()
        .map_err(|e| format!("Failed to wait for dotool: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("dotool failed: {}", stderr));
    }

    Ok(())
}
```

- For contrast, `type_text_via_xdotool` (lines 300-317) and
  `type_text_via_ydotool` (lines 348-…) pass text as `.arg("--").arg(text)` —
  these are already safe and are **out of scope**.

- Note: `type_text_via_dotool` is `#[cfg(target_os = "linux")]`, so it is **not
  compiled** when you run `cargo check` on macOS/Windows. To keep this change
  verifiable on any platform, the plan extracts the line-building logic into a
  small **non-`cfg`-gated, pure function** that is always compiled and unit-
  tested. That function is where the real fix and the tests live.

## Commands you will need

| Purpose    | Command                                  | Expected on success |
|------------|------------------------------------------|---------------------|
| Rust build | `cd src-tauri && cargo check`            | exit 0              |
| Rust tests | `cd src-tauri && cargo test clipboard`   | build + pass (incl. new tests) |

## Scope

**In scope** (the only file you should modify):
- `src-tauri/src/clipboard.rs`

**Out of scope** (do NOT touch):
- `type_text_via_xdotool` and `type_text_via_ydotool` — already safe.
- The clipboard restore logic and any other function in the file.

## Git workflow

- Branch: `advisor/004-fix-dotool-multiline-typing`
- Commit message style: conventional commits, e.g.
  `fix(clipboard): type multi-line text safely via dotool`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add a pure, testable command-builder helper

In `src-tauri/src/clipboard.rs`, add a **non-cfg-gated** free function that turns
arbitrary text into the sequence of `dotool` stdin command lines. Each line of
the input becomes its own `type` command; a literal newline between input lines
is reproduced with a `key enter` command, so no input line can be reinterpreted
as a control command:

```rust
/// Build the line-based dotool stdin command sequence for typing `text`
/// literally. Each input line becomes a `type` command; newlines are emitted as
/// explicit `key enter` commands so embedded newlines can never be reinterpreted
/// as dotool control commands.
fn build_dotool_commands(text: &str) -> Vec<String> {
    let mut commands = Vec::new();
    let mut lines = text.split('\n').peekable();
    while let Some(line) = lines.next() {
        if !line.is_empty() {
            commands.push(format!("type {}", line));
        }
        if lines.peek().is_some() {
            commands.push("key enter".to_string());
        }
    }
    commands
}
```

**Verify**: `cd src-tauri && cargo check` → exit 0 (the function is plain Rust,
compiles on every platform). You may get a `dead_code` warning until Step 2 wires
it in and Step 3 tests it — that is fine at this checkpoint.

### Step 2: Use the helper in `type_text_via_dotool`

Replace the single `writeln!(stdin, "type {}", text)` line with a loop over the
built commands:

```rust
    if let Some(mut stdin) = child.stdin.take() {
        for command in build_dotool_commands(text) {
            writeln!(stdin, "{}", command)
                .map_err(|e| format!("Failed to write to dotool stdin: {}", e))?;
        }
    }
```

Leave the spawn, wait, and error-handling code unchanged.

**Verify**: `cd src-tauri && cargo check` → exit 0. (This still does not compile
the `cfg(linux)` body on non-Linux hosts; that is expected — correctness of the
Linux body is covered by the unit tests on `build_dotool_commands` in Step 3 plus
review.)

### Step 3: Unit-test the helper

Add (or extend) a `#[cfg(test)]` module at the bottom of `clipboard.rs` with
tests for `build_dotool_commands`:

- single line: `"hello world"` → `["type hello world"]`.
- two lines: `"a\nb"` → `["type a", "key enter", "type b"]`.
- leading/trailing/blank lines: `"a\n\nb"` →
  `["type a", "key enter", "key enter", "type b"]` (blank line emits no `type`,
  just the separating `key enter`).
- a line that looks like a command must be typed, not executed:
  `"key enter"` (as the whole input, no newline) → `["type key enter"]`.

Model the test module structure after an existing one in the crate (e.g. the
`#[cfg(test)] mod tests` block in `src-tauri/src/audio_toolkit/text.rs`).

**Verify**: `cd src-tauri && cargo test clipboard` → builds and all new tests
pass.

## Test plan

- New unit tests for `build_dotool_commands` as enumerated in Step 3 (happy path,
  multi-line, blank lines, command-looking line).
- These tests run on any host because the helper is not `cfg`-gated.
- Verification: `cd src-tauri && cargo test clipboard` → all pass.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `clipboard.rs` contains `build_dotool_commands` and `type_text_via_dotool`
      calls it; the raw `writeln!(stdin, "type {}", text)` line is gone.
- [ ] `grep -n 'writeln!(stdin, "type {}", text)' src-tauri/src/clipboard.rs`
      returns no matches.
- [ ] `cd src-tauri && cargo check` exits 0.
- [ ] `cd src-tauri && cargo test clipboard` builds and passes, including ≥4 new
      tests.
- [ ] Only `src-tauri/src/clipboard.rs` is modified (`git status`).
- [ ] `plans/README.md` status row for plan 004 updated.

## STOP conditions

Stop and report back (do not improvise) if:

- The live `type_text_via_dotool` differs materially from the excerpt (drift).
- You discover `dotool`'s newline key command is named differently than `enter`
  in this project's expected `dotool` version AND you can verify it on a Linux
  box — in that case report the correct name rather than guessing; the helper's
  structure stays the same, only the `"key enter"` literal changes.
- `cargo test clipboard` fails to build for a reason unrelated to this change.

## Maintenance notes

- If a future `dotool` version changes its stdin command grammar, only
  `build_dotool_commands` and its tests need to change.
- A reviewer should confirm the helper is pure (no I/O) so the tests stay fast
  and host-independent, and that the `xdotool`/`ydotool` paths were left alone.
- The same "text as argv after `--`" safety already protects `xdotool`/`ydotool`;
  no equivalent stdin protocol exists for `dotool`, which is why the per-line
  approach is necessary.
