#!/usr/bin/env bash
# Zip Browser — Firefox fork: one-time setup.
# Clones mozilla-unified, bootstraps Mozilla's build toolchain, and wires
# in the Zip branding + patches.

set -euo pipefail
cd "$(dirname "$0")"

MOZ_DIR="${PWD}/mozilla-unified"
PATCHES_DIR="${PWD}/patches"
BRANDING_DIR="${PWD}/branding"
MOZCONFIG="${PWD}/mozconfig"
SHALLOW="${ZIP_SHALLOW:-0}"

step() { printf "\n\033[1;36m==>\033[0m %s\n" "$1"; }

if [ ! -d "${MOZ_DIR}" ]; then
  step "Cloning mozilla-unified (this is ~15 GB — go get a coffee)"
  if [ "${SHALLOW}" = "1" ]; then
    git clone --depth 1 https://github.com/mozilla-firefox/firefox.git "${MOZ_DIR}"
  else
    hg clone https://hg.mozilla.org/mozilla-unified "${MOZ_DIR}" || \
      git clone https://github.com/mozilla-firefox/firefox.git "${MOZ_DIR}"
  fi
else
  step "mozilla-unified already present; skipping clone"
fi

step "Writing mozconfig"
cp "${MOZCONFIG}" "${MOZ_DIR}/mozconfig"

step "Linking Zip branding into browser/branding/zip"
mkdir -p "${MOZ_DIR}/browser/branding"
rm -rf "${MOZ_DIR}/browser/branding/zip"
cp -R "${BRANDING_DIR}" "${MOZ_DIR}/browser/branding/zip"

step "Applying Zip patches"
cd "${MOZ_DIR}"
for p in "${PATCHES_DIR}"/*.patch; do
  [ -e "$p" ] || continue
  if git apply --check "$p" 2>/dev/null; then
    git apply "$p"
    echo "  applied $(basename "$p")"
  else
    echo "  skipped $(basename "$p") (already applied or incompatible)"
  fi
done

step "Running mach bootstrap (installs system toolchains)"
./mach --no-interactive bootstrap --application-choice=browser || {
  echo "bootstrap reported an error. See docs/setup for your platform." >&2
  echo "You can continue manually: cd mozilla-unified && ./mach bootstrap" >&2
}

step "Setup done. Next: ./build.sh"
