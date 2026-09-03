#!/usr/bin/env bash

set -euo pipefail

APP_BINARY="phonara"

require_pattern() {
  local listing="$1"
  local pattern="$2"
  local label="$3"

  if ! grep -Eq "$pattern" "$listing"; then
    echo "ERROR: missing ${label} (${pattern}) in ${listing}" >&2
    cat "$listing" >&2
    exit 1
  fi
}

require_path() {
  local path="$1"
  local label="$2"

  if [ ! -e "$path" ]; then
    echo "ERROR: missing ${label}: ${path}" >&2
    find "$(dirname "$path")" -maxdepth 2 -type f 2>/dev/null >&2 || true
    exit 1
  fi
}

audit_listing() {
  local listing="$1"
  local dynamic_transcribe="$2"
  local require_onnx="$3"

  require_pattern "$listing" "usr/bin/${APP_BINARY}$" "app binary"
  if [ "$dynamic_transcribe" = "true" ]; then
    require_pattern "$listing" 'usr/lib(/Phonara)?/libtranscribe\.so(\.[0-9]+)*$' "transcribe runtime library"
    require_pattern "$listing" 'usr/lib(/Phonara)?/libggml-cpu.*\.so(\.[0-9]+)*$' "ggml CPU backend module"
  fi
  if [ "$require_onnx" = "true" ]; then
    require_pattern "$listing" 'usr/lib(/Phonara)?/libonnxruntime\.so(\.[0-9]+)*$' "ONNX Runtime library"
  fi
}

audit_appimage_root() {
  local root="$1"
  local dynamic_transcribe="$2"

  require_path "${root}/usr/bin/${APP_BINARY}" "AppImage app binary"
  if [ "$dynamic_transcribe" = "true" ]; then
    require_path "${root}/usr/lib/libtranscribe.so" "AppImage transcribe runtime library"
    if ! find "${root}/usr/lib" -name 'libggml-cpu*.so*' -print -quit | grep -q .; then
      echo "ERROR: missing AppImage ggml CPU backend module" >&2
      find "${root}/usr/lib" -maxdepth 1 -type f >&2
      exit 1
    fi
  fi
}

smoke_binary() (
  local root="$1"
  local label="$2"
  local vulkan_icd
  local smoke_log

  vulkan_icd="$(find /usr/share/vulkan/icd.d -maxdepth 1 -name 'lvp_icd*.json' -print -quit 2>/dev/null || true)"
  smoke_log="$(mktemp)"
  trap 'rm -f "$smoke_log"' EXIT
  if [ -n "$vulkan_icd" ]; then
    export VK_ICD_FILENAMES="$vulkan_icd"
  fi

  PHONARA_NO_GTK_LAYER_SHELL=1 \
  LD_LIBRARY_PATH="${root}/usr/lib${LD_LIBRARY_PATH:+:${LD_LIBRARY_PATH}}" \
    xvfb-run -a "${root}/usr/bin/${APP_BINARY}" --list-devices >"$smoke_log"
  cat "$smoke_log"
  echo "${label} --list-devices smoke passed"
)

audit_deb() (
  local deb="$1"
  local build_platform="$2"
  local build_target="$3"
  local dynamic_transcribe="$4"
  local listing
  local require_onnx="false"
  local root

  listing="$(mktemp)"
  root="$(mktemp -d)"
  trap 'rm -rf "$root"; rm -f "$listing"' EXIT
  dpkg-deb -c "$deb" >"$listing"
  if [[ "$build_platform" == *"ubuntu-22.04"* && "$build_target" == "x86_64-unknown-linux-gnu" ]]; then
    require_onnx="true"
  fi
  audit_listing "$listing" "$dynamic_transcribe" "$require_onnx"
  dpkg-deb -x "$deb" "$root"
  smoke_binary "$root" "deb"
)

audit_rpm() (
  local package="$1"
  local dynamic_transcribe="$2"
  local listing

  listing="$(mktemp)"
  trap 'rm -f "$listing"' EXIT
  rpm -qpl "$package" >"$listing"
  audit_listing "$listing" "$dynamic_transcribe" "false"
)

audit_appimage() (
  local appimage="$1"
  local dynamic_transcribe="$2"
  local workdir

  workdir="$(mktemp -d)"
  trap 'rm -rf "$workdir"' EXIT
  cp "$appimage" "${workdir}/Phonara.AppImage"
  chmod +x "${workdir}/Phonara.AppImage"
  cd "$workdir"
  ./Phonara.AppImage --appimage-extract >/dev/null
  audit_appimage_root "squashfs-root" "$dynamic_transcribe"
)

audit_bundles() {
  local bundle_dir="$1"
  local build_platform="$2"
  local build_target="$3"
  local dynamic_transcribe="$4"
  local audited_packages=0

  if compgen -G "${bundle_dir}/deb/*.deb" >/dev/null; then
    if ! command -v xvfb-run >/dev/null 2>&1; then
      echo "ERROR: xvfb-run is required for packaged binary smoke tests" >&2
      exit 1
    fi
    for deb in "${bundle_dir}"/deb/*.deb; do
      audited_packages=$((audited_packages + 1))
      echo "Auditing deb package: ${deb}"
      audit_deb "$deb" "$build_platform" "$build_target" "$dynamic_transcribe"
    done
  fi

  if compgen -G "${bundle_dir}/rpm/*.rpm" >/dev/null; then
    if ! command -v rpm >/dev/null 2>&1; then
      echo "ERROR: rpm is required for RPM package audits" >&2
      exit 1
    fi
    for rpm_package in "${bundle_dir}"/rpm/*.rpm; do
      audited_packages=$((audited_packages + 1))
      echo "Auditing rpm package: ${rpm_package}"
      audit_rpm "$rpm_package" "$dynamic_transcribe"
    done
  fi

  if compgen -G "${bundle_dir}/appimage/*.AppImage" >/dev/null; then
    for appimage in "${bundle_dir}"/appimage/*.AppImage; do
      audited_packages=$((audited_packages + 1))
      echo "Auditing AppImage package: ${appimage}"
      audit_appimage "$appimage" "$dynamic_transcribe"
      echo "AppImage package content audit passed"
    done
  fi

  if [ "$audited_packages" -eq 0 ]; then
    echo "ERROR: no supported Linux packages found under ${bundle_dir}" >&2
    exit 1
  fi
}

case "${1:-}" in
  listing)
    [ "$#" -eq 4 ] || { echo "usage: audit-linux-package.sh listing <listing> <dynamic-transcribe> <require-onnx>" >&2; exit 2; }
    audit_listing "$2" "$3" "$4"
    ;;
  appimage-root)
    [ "$#" -eq 3 ] || { echo "usage: audit-linux-package.sh appimage-root <root> <dynamic-transcribe>" >&2; exit 2; }
    audit_appimage_root "$2" "$3"
    ;;
  bundles)
    [ "$#" -eq 5 ] || { echo "usage: audit-linux-package.sh bundles <bundle-dir> <platform> <target> <dynamic-transcribe>" >&2; exit 2; }
    audit_bundles "$2" "$3" "$4" "$5"
    ;;
  *)
    echo "usage: audit-linux-package.sh {listing|appimage-root|bundles} ..." >&2
    exit 2
    ;;
esac
