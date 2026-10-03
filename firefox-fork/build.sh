#!/usr/bin/env bash
# Zip Browser — Firefox fork: build the browser.
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -d mozilla-unified ]; then
  echo "mozilla-unified/ not found. Run ./setup.sh first." >&2
  exit 1
fi

MODE="release"
ARTIFACT=0
for a in "$@"; do
  case "$a" in
    --debug) MODE="debug" ;;
    --artifact) ARTIFACT=1 ;;
    -h|--help)
      cat <<EOF
Usage: ./build.sh [--debug] [--artifact]
  --debug      Build with symbols and asserts.
  --artifact   Fast front-end-only build using Mozilla's pre-built binaries.
EOF
      exit 0 ;;
  esac
done

export MOZCONFIG="${PWD}/mozconfig"
cd mozilla-unified

if [ "${ARTIFACT}" = "1" ]; then
  echo "ac_add_options --enable-artifact-builds" >> mozconfig.artifact
  export MOZCONFIG="${PWD}/mozconfig.artifact"
fi

echo "Building Zip Browser (${MODE}, artifact=${ARTIFACT})..."
./mach build

cat <<EOF

Build complete.
Binary tree: $(./mach environment 2>/dev/null | awk '/OBJDIR/ {print $2}')/dist/bin/
Run with:   ./run.sh
EOF
