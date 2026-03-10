# Phonara

> **This is a fork of [Melvynx/Parler](https://github.com/Melvynx/Parler)** (itself based on [cjpais/Handy](https://github.com/cjpais/Handy)) by Dylan Bricar.
> It actively maintains the project, integrating pending pull requests, fixing issues, and improving cross-platform support including Windows.

---

**A free, open source, and extensible speech-to-text application.**

Phonara is a cross-platform desktop application that provides speech transcription. Press a shortcut, speak, and have your words appear in any text field - locally or enhanced with cloud AI post-processing.

## How It Works

1. **Press** a configurable keyboard shortcut to start/stop recording (or use push-to-talk mode)
2. **Speak** your words while the shortcut is active
3. **Release** and Phonara processes your speech using Whisper
4. **Get** your transcribed text pasted directly into whatever app you're using

The process is entirely local:

- Silence is filtered using VAD (Voice Activity Detection) with Silero
- Transcription uses your choice of models:
  - **Whisper models** (Small/Medium/Turbo/Large) with GPU acceleration when available
  - **Parakeet V3** - CPU-optimized model with excellent performance and automatic language detection
- Works on Windows, macOS, and Linux

## Quick Start

### Installation

1. Download the latest release from the [releases page](https://github.com/DylanBricar/Phonara/releases)
2. Install the application
3. Launch Phonara and grant necessary system permissions (microphone, accessibility)
4. Configure your preferred keyboard shortcuts in Settings
5. Start transcribing!

### Development Setup

For detailed build instructions including platform-specific requirements, see [BUILD.md](BUILD.md).

## Architecture

Phonara is built as a Tauri application combining:

- **Frontend**: React + TypeScript with Tailwind CSS for the settings UI
- **Backend**: Rust for system integration, audio processing, and ML inference
- **Core Libraries**:
  - `whisper-rs`: Local speech recognition with Whisper models
  - `transcription-rs`: CPU-optimized speech recognition with Parakeet models
  - `cpal`: Cross-platform audio I/O
  - `vad-rs`: Voice Activity Detection
  - `rdev`: Global keyboard shortcuts and system events
  - `rubato`: Audio resampling

### Debug Mode

Phonara includes an advanced debug mode for development and troubleshooting. Access it by pressing:

- **macOS**: `Cmd+Shift+D`
- **Windows/Linux**: `Ctrl+Shift+D`

### CLI Parameters

Phonara supports command-line flags for controlling a running instance and customizing startup behavior. These work on all platforms (macOS, Windows, Linux).

**Remote control flags** (sent to an already-running instance via the single-instance plugin):

```bash
phonara --toggle-transcription    # Toggle recording on/off
phonara --toggle-post-process     # Toggle recording with post-processing on/off
phonara --cancel                  # Cancel the current operation
```

**Startup flags:**

```bash
phonara --start-hidden            # Start without showing the main window
phonara --no-tray                 # Start without the system tray icon
phonara --debug                   # Enable debug mode with verbose logging
phonara --help                    # Show all available flags
```

Flags can be combined for autostart scenarios:

```bash
phonara --start-hidden --no-tray
```

> **macOS tip:** When Phonara is installed as an app bundle, invoke the binary directly:
>
> ```bash
> /Applications/Phonara.app/Contents/MacOS/Phonara --toggle-transcription
> ```

## Known Issues & Current Limitations

This project is actively being developed and has some [known issues](https://github.com/DylanBricar/Phonara/issues). We believe in transparency about the current state:

### Major Issues (Help Wanted)

**Whisper Model Crashes:**

- Whisper models crash on certain system configurations (Windows and Linux)
- Does not affect all systems - issue is configuration-dependent
  - If you experience crashes and are a developer, please help to fix and provide debug logs!

**Wayland Support (Linux):**

- Limited support for Wayland display server
- Requires [`wtype`](https://github.com/atx/wtype) or [`dotool`](https://sr.ht/~geb/dotool/) for text input to work correctly (see [Linux Notes](#linux-notes) below for installation)

### Linux Notes

**Text Input Tools:**

For reliable text input on Linux, install the appropriate tool for your display server:

| Display Server | Recommended Tool | Install Command                                    |
| -------------- | ---------------- | -------------------------------------------------- |
| X11            | `xdotool`        | `sudo apt install xdotool`                         |
| Wayland        | `wtype`          | `sudo apt install wtype`                           |
| Both           | `dotool`         | `sudo apt install dotool` (requires `input` group) |

Without these tools, Phonara falls back to enigo which may have limited compatibility, especially on Wayland.

**Other Notes:**

- **Runtime library dependency (`libgtk-layer-shell.so.0`)**: Phonara links `gtk-layer-shell` on Linux. Install the runtime package for your distro if needed.
- The recording overlay is disabled by default on Linux (`Overlay Position: None`) because certain compositors treat it as the active window.
- **Global keyboard shortcuts (Wayland):** On Wayland, system-level shortcuts must be configured through your desktop environment. Use the CLI flags as the command for your custom shortcut.

### Platform Support

- **macOS (both Intel and Apple Silicon)**
- **x64 Windows**
- **x64 Linux**

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- **[cjpais/Handy](https://github.com/cjpais/Handy)** - the original project
- **[Melvynx/Parler](https://github.com/Melvynx/Parler)** - the fork this project is based on
- **Whisper** by OpenAI for the speech recognition model
- **whisper.cpp and ggml** for cross-platform whisper inference/acceleration
- **Silero** for lightweight VAD
- **Tauri** for the Rust-based app framework
