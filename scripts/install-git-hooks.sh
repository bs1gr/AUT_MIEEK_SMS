#!/usr/bin/env bash
# Install git hooks from .githooks into .git/hooks
# Usage: ./scripts/install-git-hooks.sh [--force]

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd -P)"
GITHOOKS="$ROOT/.githooks"
TARGET="$ROOT/.git/hooks"

if [ ! -d "$GITHOOKS" ]; then
  echo "No .githooks folder found at: $GITHOOKS" >&2
  exit 1
fi

if [ ! -d "$TARGET" ]; then
  echo ".git/hooks not found — this is not a git repo or hooks dir is missing" >&2
  exit 1
fi

FORCE=0
if [ "${1:-}" = "--force" ]; then
  FORCE=1
fi

echo "Installing git hooks from $GITHOOKS -> $TARGET"
for file in "$GITHOOKS"/*; do
  base=$(basename "$file")
  dest="$TARGET/$base"
  if [ -f "$dest" ] && [ $FORCE -ne 1 ]; then
    echo "Skipping existing hook: $base (use --force to overwrite)"
    continue
  fi
  cp -f "$file" "$dest"
  chmod +x "$dest" || true
  echo "Installed: $base"
done

echo "Done."
