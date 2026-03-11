# Phonara

A free, open-source, cross-platform speech-to-text desktop application.

Press a shortcut, speak, and your words appear in any text field. Everything runs locally on your machine.

## How It Works

1. **Press** a configurable keyboard shortcut (or use push-to-talk)
2. **Speak** while recording is active
3. **Release** and Phonara transcribes your speech
4. **Get** transcribed text pasted directly into your active app

### Features

- **Multiple models**: Whisper (Small/Medium/Turbo/Large), Parakeet V3, Moonshine, SenseVoice, GigaAM
- **Voice Activity Detection** with Silero (filters silence automatically)
- **GPU acceleration** when available (Metal on macOS, Vulkan on Windows/Linux)
- **19 languages** supported in the UI
- **CLI control** for automation (`--toggle-transcription`, `--start-hidden`, etc.)
- **Cross-platform**: macOS (Intel + Apple Silicon), Windows (x64), Linux (x64, ARM64)

## What's new in Phonara (vs upstream Parler)

### New Features

- **Appearance settings** - Theme mode (Light/Dark/System), accent color picker (8 colors + system detection), overlay customization moved to Appearance section
- **Overlay customization** - Custom border color, background color, border width, width/height dimensions, distinct state colors (blue=transcribing, purple=processing), high visibility mode
- **Ollama LLM provider** - Built-in support for local Ollama (localhost:11434, no API key required)
- **Local file transcription** - Transcribe WAV files via file picker with 16kHz resampling (PR #381)
- **OS input language detection** - Automatically follows keyboard layout for transcription language (PR #559)
- **LLM template variables** - Use `$time_local`, `$date`, `$language` in LLM prompts (PR #704)
- **Text replacements** - Exact find/replace rules with case-sensitivity option (PR #455)
- **Custom recordings directory** - Choose where recordings are saved (PR #874)
- **Custom audio feedback sounds** - Use your own WAV/MP3/OGG/FLAC files (PR #768)
- **Post-transcription hook** - Run a script after transcription, receiving text via stdin (PR #930)
- **Symmetric audio bars** - Mirrored audio visualization with 13 bars, 150-2500Hz range (PR #552)
- **Whisper initial prompt** - Set a prompt to guide Whisper's transcription (Issue #199)
- **Windows microphone permission** - Onboarding step for mic permission on Windows (PR #991)
- **Long audio chunking** - Audio >28s is automatically split at silence boundaries with 0.5s overlap to prevent Whisper hallucinations
- **Hallucination filtering** - Detects and removes punctuation-only output, repeated characters (!!!!!), spaced repetitions (! ! ! !), and stutter artifacts
- **Consistent language detection** - First chunk language is forced for remaining chunks to prevent Whisper auto-detection errors

### Bug Fixes

- **Cancel deadlock** - Cancel during recording no longer freezes the app (moved blocking work off main thread)
- **Escape crash** - Rapid Escape key spam no longer crashes the app (CANCEL_SUPPRESSED atomic flag + catch_unwind)
- **Subsequent recordings** - Fixed resampler state leak between recordings causing audio misalignment (Issue #828)
- **Whisper medium crash** - Changed panic="abort" to panic="unwind" so larger models don't crash the app (Issue #870)
- **No microphone crash** - Graceful fallback when no mic is connected (PR #477)
- **Bluetooth mic latency** - Lazy stream close keeps mic open for 30s, eliminating BT activation delay (PR #747)
- **Clipboard image preservation** - Images in clipboard are preserved during paste-via-clipboard (Issue #921)
- **Clipboard race condition** - Write-verify-retry with delays for reliable clipboard access (Issue #502)
- **Overlay focus steal** - Overlay no longer steals focus on Windows (Issue #315)
- **DPI scaling** - Overlay uses logical coordinates for correct sizing at 150%+ DPI (Issue #263)
- **Corrupt model downloads** - Stale/partial downloads are detected and re-downloaded automatically (Issue #858)
- **Admin window freeze** - Windows SendInput replaces enigo for input simulation (Issue #434)
- **Volume slider precision** - 1% step instead of 10% (PR #944)
- **Double-click tray** - Opens main window (PR #369)

### Infrastructure & Security

- **Settings cache** - RwLock-based cache eliminates repeated JSON parsing
- **Log redaction** - API keys are stripped from settings debug logs
- **XSS fix** - Removed dangerouslySetInnerHTML in PostProcessingSettings
- **Clipboard hardening** - Sanitized dotool stdin input to prevent injection
- **CI improvements** - Separated signed/unsigned builds, Node.js 24 compatibility, proper Vulkan SDK setup
- **Cross-platform build scripts** - `scripts/build.sh` and `scripts/dev.sh` with dependency checks
- **Custom LLM base URL** - `PHONARA_CUSTOM_LLM_BASE_URL` env var for local LLM services (PR #633)

## Installation

Download the latest release from the [releases page](https://github.com/DylanBricar/Phonara/releases), install, and launch.

## Build from Source

### Prerequisites

- [Rust](https://rustup.rs/) (latest stable)
- [Bun](https://bun.sh/)
- CMake
- **Windows only**: LLVM 18.1.8 (`LIBCLANG_PATH="C:/Program Files/LLVM/bin"`), Vulkan SDK (`VULKAN_SDK` env var)
- **Linux only**: `libasound2-dev`, `libwebkit2gtk-4.1-dev`, `libgtk-3-dev`, `libgtk-layer-shell-dev`, Vulkan SDK

### Quick Build (recommended)

Use the provided scripts that handle dependency checks, VAD model download, and build:

```bash
# Production build (artifacts copied to target/)
./scripts/build.sh

# Development mode (hot reload)
./scripts/dev.sh
```

### Manual Build

```bash
# Install dependencies
bun install

# Download VAD model (required)
mkdir -p src-tauri/resources/models
curl -o src-tauri/resources/models/silero_vad_v4.onnx https://blob.handy.computer/silero_vad_v4.onnx

# Development
bun run tauri dev

# Production build
bun run tauri build
```

## Linux Notes

For text input, install the appropriate tool for your display server:

| Display Server | Tool | Install |
|---|---|---|
| X11 | `xdotool` | `sudo apt install xdotool` |
| Wayland | `wtype` | `sudo apt install wtype` |
| Both | `dotool` | `sudo apt install dotool` |

The recording overlay is disabled by default on Linux. Runtime dependency `libgtk-layer-shell.so.0` may need to be installed separately.

## Origins & Credits

Phonara is a maintained fork that combines work from two upstream projects:

- **[cjpais/Handy](https://github.com/cjpais/Handy)** by CJ Pais - The original speech-to-text application built with Tauri and Whisper. Provided the core architecture, audio pipeline, VAD integration, and model management system.
- **[Melvynx/Parler](https://github.com/Melvynx/Parler)** by Melvynx - A fork of Handy that added UI improvements, settings refactoring, and additional features.

Phonara builds on both projects by actively integrating pending pull requests, fixing open issues, and adding full Windows support.

### Last Processed Upstream Commits

| Source | Last Commit Hash |
|---|---|
| [cjpais/Handy](https://github.com/cjpais/Handy) | `82297fa` |
| [Melvynx/Parler](https://github.com/Melvynx/Parler) | `daff123` |

## License

MIT License - see [LICENSE](LICENSE) for details.
