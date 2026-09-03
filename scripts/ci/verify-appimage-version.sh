#!/usr/bin/env bash

set -euo pipefail

APPIMAGE_PATH="${1:?usage: verify-appimage-version.sh <appimage-path> <expected-version>}"
EXPECTED_VERSION="${2:?usage: verify-appimage-version.sh <appimage-path> <expected-version>}"

if [ ! -f "$APPIMAGE_PATH" ]; then
  echo "ERROR: AppImage does not exist: $APPIMAGE_PATH" >&2
  exit 1
fi

APPIMAGE_PATH="$(cd "$(dirname "$APPIMAGE_PATH")" && pwd)/$(basename "$APPIMAGE_PATH")"
WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

cd "$WORKDIR"
"$APPIMAGE_PATH" --appimage-extract >/dev/null

if [ ! -x squashfs-root/AppRun ]; then
  echo "ERROR: AppImage AppRun is missing or not executable" >&2
  exit 1
fi

VERSION_OUTPUT="$(squashfs-root/AppRun --version)"
if [ "$VERSION_OUTPUT" != "phonara ${EXPECTED_VERSION}" ]; then
  echo "ERROR: AppImage reports '${VERSION_OUTPUT}', expected 'phonara ${EXPECTED_VERSION}'" >&2
  exit 1
fi

echo "AppImage reports the expected version: ${EXPECTED_VERSION}"
