#!/usr/bin/env bash
# Zip Browser — launches the built Gecko binary.
set -euo pipefail
cd "$(dirname "$0")/mozilla-unified"
./mach run "$@"
