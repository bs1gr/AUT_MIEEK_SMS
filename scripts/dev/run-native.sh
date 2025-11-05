#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
SMART_SETUP="${REPO_ROOT}/SMART_SETUP.ps1"

if [[ ! -f "${SMART_SETUP}" ]]; then
  echo "SMART_SETUP.ps1 not found at ${SMART_SETUP}" >&2
  exit 1
fi

if [[ "${SMS_ENV:-}" =~ ^(production|PRODUCTION|Production|release|RELEASE)$ ]]; then
  echo "SMS_ENV indicates a production environment. Use the Docker release helper instead." >&2
  exit 2
fi

export SMS_ENV=development
export SMS_EXECUTION_MODE=native

echo "Launching SMART_SETUP.ps1 in native development mode..."
pwsh -NoProfile -File "${SMART_SETUP}" -PreferNative "$@"
