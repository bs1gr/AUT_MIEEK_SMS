#!/bin/bash
# QNAP PostgreSQL-Only Installer
# Deploys only PostgreSQL on QNAP for shared DB architecture.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="docker/docker-compose.qnap.postgres-only.yml"
ENV_EXAMPLE=".env.qnap.postgres-only.example"
ENV_FILE=".env.qnap.postgres-only"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_ok() { echo -e "${GREEN}✅ $1${NC}"; }
print_warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_err() { echo -e "${RED}❌ $1${NC}"; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    print_err "Missing command: $1"
    exit 1
  }
}

generate_password() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 24
  else
    tr -dc 'A-Za-z0-9' </dev/urandom | head -c 48
  fi
}

main() {
  print_info "Preparing QNAP PostgreSQL-only deployment..."

  require_cmd docker

  cd "$PROJECT_ROOT"

  if [ ! -f "$ENV_FILE" ]; then
    cp "$ENV_EXAMPLE" "$ENV_FILE"
    local generated_pw
    generated_pw="$(generate_password)"
    sed -i "s|POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${generated_pw}|" "$ENV_FILE"
    print_ok "Created $ENV_FILE"
    print_warn "Update QNAP_PG_BIND_IP in $ENV_FILE before first start."
  else
    print_info "$ENV_FILE already exists, keeping it."
  fi

  # Pre-create expected directories from env (if values exist)
  local data_path backup_path
  data_path="$(grep '^QNAP_POSTGRES_DATA_PATH=' "$ENV_FILE" | cut -d= -f2- || true)"
  backup_path="$(grep '^QNAP_POSTGRES_BACKUP_PATH=' "$ENV_FILE" | cut -d= -f2- || true)"

  [ -n "$data_path" ] && mkdir -p "$data_path"
  [ -n "$backup_path" ] && mkdir -p "$backup_path"

  print_info "Starting PostgreSQL container..."
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

  print_info "Waiting for health status..."
  sleep 5
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps

  print_ok "QNAP PostgreSQL-only deployment is up."
  print_info "Next: update VPS/backend DATABASE_URL to point to QNAP private/VPN IP + port."
}

main "$@"
