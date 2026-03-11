#!/usr/bin/env bash
set -euo pipefail

# Phonara - Cross-platform build script
# Builds the application for the current platform and copies artifacts to target/

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TARGET_DIR="$PROJECT_ROOT/target"

# Ensure common tool paths are in PATH (especially on Windows/MSYS2 where profiles may not load)
[[ -f "$HOME/.cargo/env" ]] && source "$HOME/.cargo/env"
[[ -d "$HOME/.cargo/bin" ]] && export PATH="$HOME/.cargo/bin:$PATH"
[[ -d "$HOME/.bun/bin" ]] && export PATH="$HOME/.bun/bin:$PATH"
[[ -d "${APPDATA:-}/npm" ]] && export PATH="$PATH:$APPDATA/npm"
[[ -d "/c/Program Files/CMake/bin" ]] && export PATH="$PATH:/c/Program Files/CMake/bin"
[[ -d "/c/Program Files/LLVM/bin" ]] && export PATH="$PATH:/c/Program Files/LLVM/bin"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

detect_os() {
    case "$(uname -s)" in
        Darwin*)  echo "macos" ;;
        Linux*)   echo "linux" ;;
        MINGW*|MSYS*|CYGWIN*) echo "windows" ;;
        *)        echo "unknown" ;;
    esac
}

check_command() {
    if ! command -v "$1" &>/dev/null; then
        return 1
    fi
    return 0
}

install_prompt() {
    local tool="$1"
    local install_cmd="$2"
    warn "$tool is not installed."
    echo -e "  Install it with: ${GREEN}$install_cmd${NC}"
    read -rp "  Would you like to install it now? [y/N] " answer
    if [[ "$answer" =~ ^[Yy]$ ]]; then
        eval "$install_cmd"
    else
        error "$tool is required to build Phonara. Please install it and retry."
    fi
}

check_dependencies() {
    local os="$1"
    info "Checking dependencies for $os..."

    # Rust
    if ! check_command rustc; then
        install_prompt "Rust" "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    fi

    # Bun
    if ! check_command bun; then
        case "$os" in
            macos|linux)
                install_prompt "Bun" "curl -fsSL https://bun.sh/install | bash"
                ;;
            windows)
                install_prompt "Bun" "powershell -c 'irm bun.sh/install.ps1 | iex'"
                ;;
        esac
    fi

    # CMake
    if ! check_command cmake; then
        case "$os" in
            macos)   install_prompt "CMake" "brew install cmake" ;;
            linux)   install_prompt "CMake" "sudo apt-get install -y cmake || sudo dnf install -y cmake || sudo pacman -S cmake" ;;
            windows) install_prompt "CMake" "winget install Kitware.CMake" ;;
        esac
    fi

    # Platform-specific checks
    case "$os" in
        macos)
            if ! xcode-select -p &>/dev/null; then
                warn "Xcode Command Line Tools not found."
                install_prompt "Xcode CLT" "xcode-select --install"
            fi
            ;;
        linux)
            local missing=()
            for pkg in libasound2-dev libwebkit2gtk-4.1-dev libgtk-3-dev libgtk-layer-shell-dev; do
                if ! dpkg -s "$pkg" &>/dev/null 2>&1; then
                    missing+=("$pkg")
                fi
            done
            if [[ ${#missing[@]} -gt 0 ]]; then
                warn "Missing Linux packages: ${missing[*]}"
                install_prompt "Linux build dependencies" "sudo apt-get install -y ${missing[*]}"
            fi
            ;;
        windows)
            if [[ -z "${VULKAN_SDK:-}" ]]; then
                warn "VULKAN_SDK environment variable is not set."
                echo "  Please install Vulkan SDK from https://vulkan.lunarg.com/sdk/home"
            fi
            if [[ -z "${LIBCLANG_PATH:-}" ]]; then
                warn "LIBCLANG_PATH environment variable is not set."
                echo "  Please install LLVM 18.1.8 and set LIBCLANG_PATH=\"C:/Program Files/LLVM/bin\""
            fi
            ;;
    esac

    info "Dependency check complete."
}

setup_vad_model() {
    local models_dir="$PROJECT_ROOT/src-tauri/resources/models"
    local vad_model="$models_dir/silero_vad_v4.onnx"
    if [[ ! -f "$vad_model" ]]; then
        info "Downloading VAD model..."
        mkdir -p "$models_dir"
        curl -o "$vad_model" https://blob.handy.computer/silero_vad_v4.onnx
        info "VAD model downloaded."
    fi
}

build() {
    local os="$1"
    info "Building Phonara for $os..."

    cd "$PROJECT_ROOT"

    # Install frontend dependencies
    info "Installing frontend dependencies..."
    bun install

    # Setup VAD model if needed
    setup_vad_model

    # Build
    info "Running Tauri build..."
    bun run tauri build

    # Copy artifacts to target/
    mkdir -p "$TARGET_DIR"

    local bundle_dir="$PROJECT_ROOT/src-tauri/target/release/bundle"

    case "$os" in
        macos)
            cp -r "$bundle_dir/dmg"/*.dmg "$TARGET_DIR/" 2>/dev/null || true
            cp -r "$bundle_dir/macos"/*.app "$TARGET_DIR/" 2>/dev/null || true
            ;;
        linux)
            cp "$bundle_dir/deb"/*.deb "$TARGET_DIR/" 2>/dev/null || true
            cp "$bundle_dir/appimage"/*.AppImage "$TARGET_DIR/" 2>/dev/null || true
            cp "$bundle_dir/rpm"/*.rpm "$TARGET_DIR/" 2>/dev/null || true
            ;;
        windows)
            cp "$bundle_dir/msi"/*.msi "$TARGET_DIR/" 2>/dev/null || true
            cp "$bundle_dir/nsis"/*.exe "$TARGET_DIR/" 2>/dev/null || true
            ;;
    esac

    info "Build complete! Artifacts available in: $TARGET_DIR/"
    ls -lh "$TARGET_DIR/"
}

main() {
    echo "==============================="
    echo "  Phonara Build Script"
    echo "==============================="
    echo ""

    local os
    os=$(detect_os)

    if [[ "$os" == "unknown" ]]; then
        error "Unsupported operating system: $(uname -s)"
    fi

    info "Detected OS: $os"
    check_dependencies "$os"
    build "$os"
}

main "$@"
