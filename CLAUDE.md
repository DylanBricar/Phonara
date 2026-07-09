# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Prerequisites:** [Rust](https://rustup.rs/) (latest stable), [Bun](https://bun.sh/)

```bash
# Install dependencies
bun install

# Run in development mode
bun run tauri dev
# If cmake error on macOS:
CMAKE_POLICY_VERSION_MINIMUM=3.5 bun run tauri dev

# Build for production
bun run tauri build

# Linting and formatting (run before committing)
bun run lint              # ESLint for frontend
bun run lint:fix          # ESLint with auto-fix
bun run format            # Prettier + cargo fmt
bun run format:check      # Check formatting without changes
bun run quality:check     # translations, secrets, lint, unit coverage, build, Playwright, audit
bun run quality:rust      # cargo fmt, clippy -D warnings, cargo test
bun run audit:rust        # RustSec advisory audit (requires cargo-audit)
```

**Model Setup (Required for Development):**

```bash
mkdir -p src-tauri/resources/models
curl -o src-tauri/resources/models/silero_vad_v4.onnx https://blob.handy.computer/silero_vad_v4.onnx
```

## Architecture Overview

Phonara is a cross-platform desktop speech-to-text app built with Tauri 2.x (Rust backend + React/TypeScript frontend).

### Backend Structure (src-tauri/src/)

- `lib.rs` - Main entry point, Tauri setup, manager initialization
- `managers/` - Core business logic:
  - `audio.rs` - Audio recording and device management
  - `model.rs` - Model downloading and management
  - `transcription.rs` - Speech-to-text processing pipeline
  - `history.rs` - Transcription history storage
- `audio_toolkit/` - Low-level audio processing:
  - `audio/` - Device enumeration, recording, resampling
  - `vad/` - Voice Activity Detection (Silero VAD)
- `commands/` - Tauri command handlers for frontend communication
- `shortcut/` - Global keyboard shortcut handling (mod.rs, handler.rs, phonara_keys.rs, tauri_impl.rs, setting_commands.rs)
- `settings.rs` - Application settings management

### Frontend Structure (src/)

- `App.tsx` - Main component with onboarding flow
- `components/settings/` - Settings UI (35+ files)
- `components/model-selector/` - Model management interface
- `components/onboarding/` - First-run experience
- `hooks/useSettings.ts` - Settings hook; model state lives in `stores/modelStore.ts`
- `stores/settingsStore.ts` - Zustand store for settings
- `bindings.ts` - Auto-generated Tauri type bindings (via tauri-specta)
- `overlay/` - Recording overlay window code

### Key Patterns

**Manager Pattern:** Core functionality organized into managers (Audio, Model, Transcription) initialized at startup and managed via Tauri state.

**Command-Event Architecture:** Frontend -> Backend via Tauri commands; Backend -> Frontend via events.

**Pipeline Processing:** Audio -> VAD -> Whisper/Parakeet -> Text output -> Clipboard/Paste

**State Flow:** Zustand -> Tauri Command -> Rust State -> Persistence (tauri-plugin-store)

## Internationalization (i18n)

All user-facing strings must use i18next translations. ESLint enforces this (no hardcoded strings in JSX).

**Adding new text:**

1. Add key to `src/i18n/locales/en/translation.json`
2. Use in component: `const { t } = useTranslation(); t('key.path')`

## Code Style

**Rust:**

- Run `cargo fmt` and `cargo clippy` before committing
- Handle errors explicitly (avoid unwrap in production)

**TypeScript/React:**

- Strict TypeScript, avoid `any` types
- Functional components with hooks
- Tailwind CSS for styling
- Path aliases: `@/` -> `./src/`

## Debug Mode

Access debug features: `Cmd+Shift+D` (macOS) or `Ctrl+Shift+D` (Windows/Linux)

## Platform Notes

- **macOS**: Metal acceleration, accessibility permissions required
- **Windows**: Vulkan acceleration (LLVM 18, Vulkan SDK required for build)
- **Linux**: OpenBLAS + Vulkan, limited Wayland support, overlay disabled by default

## Windows Build Requirements

- LLVM/Clang for bindgen, set `LIBCLANG_PATH="C:/Program Files/LLVM/bin"` (builds fine with LLVM 18 or 22)
- Vulkan SDK, set `VULKAN_SDK` env var
- CMake in PATH
- Rust/Cargo in PATH
- `transcribe-rs` is on the 0.3.x line (Cargo.lock resolves 0.3.11); per-platform feature flags differ (whisper-cpp+onnx base, whisper-vulkan+ort-directml on Windows, whisper-metal on macOS)
- If the native `whisper-rs-sys`/`vulkan-shaders-gen` build fails with a `FileTracker FTK1011 ... path not found` error, it's the Windows MAX_PATH (260) limit: build with a short `CARGO_TARGET_DIR` (e.g. `D:\pt`) and `CMAKE_POLICY_VERSION_MINIMUM=3.5`
