#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
SMART_SETUP="${REPO_ROOT}/SMART_SETUP.ps1"

if [[ ! -f "${SMART_SETUP}" ]]; then
  echo "SMART_SETUP.ps1 not found at ${SMART_SETUP}" >&2
  exit 1
fi

export SMS_ENV=production
export SMS_EXECUTION_MODE=docker

echo "Launching SMART_SETUP.ps1 in Docker release mode..."
pwsh -NoProfile -File "${SMART_SETUP}" -PreferDocker "$@"
