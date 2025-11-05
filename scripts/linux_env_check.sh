#!/usr/bin/env bash
# Linux environment validator for Student Management System
# Validates prerequisites and optionally applies safe fixes (-f/--fix)
#
# Checks:
# - OS: Linux/WSL
# - PowerShell 7+ (pwsh) presence (recommended for helper scripts)
# - Docker engine availability and permissions (for Docker mode)
# - Python >= 3.11 (for native dev)
# - Node.js >= 18 (for native dev)
# - Existence of backend/.env and frontend/.env (copies from .env.example with --fix)
# - Writable directories: backend/logs and data/
#
# Exit code:
# 0 = OK (meets requirements for chosen or auto mode)
# 1 = Issues found
# 2 = Misuse of the script

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

COLOR_RED='\033[0;31m'
COLOR_GREEN='\033[0;32m'
COLOR_YELLOW='\033[0;33m'
COLOR_BLUE='\033[0;34m'
COLOR_RESET='\033[0m'

prefer_mode="auto" # auto|docker|native
apply_fixes=false

usage() {
  cat <<EOF
Usage: $(basename "$0") [--prefer docker|native] [--fix]

Validates your Linux environment for running the Student Management System.

Options:
  --prefer docker   Prefer Docker full-stack mode validation
  --prefer native   Prefer native development mode validation
  -f, --fix         Apply safe fixes (create folders, copy .env from .env.example)
  -h, --help        Show this help and exit

Exit codes:
  0  All good for selected/auto mode
  1  Issues found
  2  Invalid usage
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --prefer)
      shift
      [[ $# -gt 0 ]] || { echo "Missing value for --prefer" >&2; usage; exit 2; }
      case "$1" in
        docker|native) prefer_mode="$1";;
        *) echo "Invalid value for --prefer: $1" >&2; usage; exit 2;;
      esac
      ;;
    -f|--fix)
      apply_fixes=true
      ;;
    -h|--help)
      usage; exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2; usage; exit 2
      ;;
  esac
  shift || true
done

ok()   { echo -e "${COLOR_GREEN}✔${COLOR_RESET} $1"; }
warn() { echo -e "${COLOR_YELLOW}•${COLOR_RESET} $1"; }
err()  { echo -e "${COLOR_RED}✖${COLOR_RESET} $1"; }
info() { echo -e "${COLOR_BLUE}i${COLOR_RESET} $1"; }

issues=0

echo "--- Linux Environment Check ---"

# OS check
os_name=$(uname -s || true)
case "$os_name" in
  Linux*) ok "OS: $os_name" ;;
  MINGW*|MSYS*|CYGWIN*) warn "Detected Windows-like shell; this script targets Linux. Proceeding anyway." ;;
  Darwin*) warn "Detected macOS. Most checks still apply, but Docker and permissions may differ." ;;
  *) warn "Unknown OS: $os_name" ;;
esac

# PowerShell check (recommended for helper scripts)
if command -v pwsh >/dev/null 2>&1; then
  pwsh_ver=$(pwsh -NoLogo -NoProfile -Command '$PSVersionTable.PSVersion.ToString()' 2>/dev/null || true)
  ok "PowerShell (pwsh) detected: $pwsh_ver"
else
  warn "PowerShell (pwsh) not found. Helper scripts will fall back to docker compose or manual steps."
fi

# Docker checks (for docker mode)
docker_ok=false
if command -v docker >/dev/null 2>&1; then
  if docker info >/dev/null 2>&1; then
    ok "Docker engine is running and accessible"
    docker_ok=true
  else
    err "Docker is installed but not accessible. Start the daemon and/or ensure your user is in the 'docker' group."
    warn "Try: sudo usermod -aG docker "$USER" && newgrp docker"
    issues=$((issues+1))
  fi
else
  warn "Docker not found. Docker full-stack mode won't be available."
fi

# Python check (for native mode)
python_ok=false
py_cmd=""
for cmd in python3 python; do
  if command -v "$cmd" >/dev/null 2>&1; then py_cmd="$cmd"; break; fi
done
if [[ -n "$py_cmd" ]]; then
  py_ver_str=$($py_cmd -c 'import sys;print("%d.%d.%d"%sys.version_info[:3])' 2>/dev/null || true)
  if [[ -n "$py_ver_str" ]]; then
    py_major=${py_ver_str%%.*}
    py_minor=${py_ver_str#*.}; py_minor=${py_minor%%.*}
    if (( py_major > 3 || (py_major == 3 && py_minor >= 11) )); then
      ok "Python version $py_ver_str (>= 3.11)"
      python_ok=true
    else
      err "Python version $py_ver_str (< 3.11). Native dev requires Python 3.11+."
      issues=$((issues+1))
    fi
  else
    err "Unable to determine Python version"
    issues=$((issues+1))
  fi
else
  warn "Python not found. Native development won't be available."
fi

# Node check (for native mode)
node_ok=false
if command -v node >/dev/null 2>&1; then
  node_ver_str=$(node -v 2>/dev/null | sed 's/^v//')
  node_major=${node_ver_str%%.*}
  if [[ -n "$node_major" ]] && (( node_major >= 18 )); then
    ok "Node.js version v${node_ver_str} (>= 18)"
    node_ok=true
  else
    err "Node.js version v${node_ver_str} (< 18). Native dev requires Node.js 18+."
    issues=$((issues+1))
  fi
else
  warn "Node.js not found. Native development won't be available."
fi

# .env files
backend_env_ok=true
frontend_env_ok=true
if [[ ! -f "${REPO_ROOT}/backend/.env" ]]; then
  if [[ -f "${REPO_ROOT}/backend/.env.example" ]]; then
    if $apply_fixes; then
      cp "${REPO_ROOT}/backend/.env.example" "${REPO_ROOT}/backend/.env"
      ok "Created backend/.env from .env.example"
    else
      warn "backend/.env missing (will create from .env.example with --fix)"
      backend_env_ok=false
    fi
  else
    err "backend/.env missing and no .env.example found"
    backend_env_ok=false; issues=$((issues+1))
  fi
else
  ok "backend/.env present"
fi

if [[ ! -f "${REPO_ROOT}/frontend/.env" ]]; then
  if [[ -f "${REPO_ROOT}/frontend/.env.example" ]]; then
    if $apply_fixes; then
      cp "${REPO_ROOT}/frontend/.env.example" "${REPO_ROOT}/frontend/.env"
      ok "Created frontend/.env from .env.example"
    else
      warn "frontend/.env missing (will create from .env.example with --fix)"
      frontend_env_ok=false
    fi
  else
    warn "frontend/.env missing and .env.example not found (may be optional)"
    frontend_env_ok=false
  fi
else
  ok "frontend/.env present"
fi

# Writable directories
ensure_dir() {
  local d="$1"
  if [[ -d "$d" ]]; then
    if [[ -w "$d" ]]; then ok "Dir writable: ${d}"; else err "Dir not writable: ${d}"; issues=$((issues+1)); fi
  else
    if $apply_fixes; then
      mkdir -p "$d" && ok "Created directory: ${d}"
    else
      warn "Missing directory: ${d} (will create with --fix)"
    fi
  fi
}

ensure_dir "${REPO_ROOT}/backend/logs"
ensure_dir "${REPO_ROOT}/data"

# Determine overall readiness depending on preferred mode
ready=false
case "$prefer_mode" in
  docker)
    if $docker_ok; then ready=true; else ready=false; fi
    ;;
  native)
    if $python_ok && $node_ok; then ready=true; else ready=false; fi
    ;;
  auto)
    if $docker_ok; then ready=true; else ready=$python_ok && $node_ok; fi
    ;;
esac

echo "---------------------------------"
if $ready && (( issues == 0 )) && $backend_env_ok && $frontend_env_ok; then
  ok "Environment is ready ($prefer_mode mode)"
  info "Next steps:"
  if [[ "$prefer_mode" == "docker" || ( "$prefer_mode" == "auto" && $docker_ok ) ]]; then
    echo "  - Docker release mode: ${REPO_ROOT}/scripts/deploy/run-docker-release.sh"
  fi
  if [[ "$prefer_mode" == "native" || ( "$prefer_mode" == "auto" && ! $docker_ok ) ]]; then
    echo "  - Native development:  ${REPO_ROOT}/scripts/dev/run-native.sh"
  fi
  exit 0
else
  err "Environment has issues. Review messages above."
  info "Run with --fix to auto-create missing .env files and directories."
  exit 1
fi
