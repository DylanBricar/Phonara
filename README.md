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
