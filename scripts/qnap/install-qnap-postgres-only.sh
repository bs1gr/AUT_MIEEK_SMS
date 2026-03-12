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

env_get() {
  grep "^$1=" "$PROJECT_ROOT/$ENV_FILE" | cut -d= -f2- || true
}

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

is_placeholder_value() {
  case "${1:-}" in
    ""|*"<CHANGE_ME"*|*"CHANGE_ME_"*|*"PRIVATE_OR_VPN_IP"*) return 0 ;;
    *) return 1 ;;
  esac
}

validate_port() {
  local port="$1"
  if ! [[ "$port" =~ ^[0-9]+$ ]] || [ "$port" -lt 1 ] || [ "$port" -gt 65535 ]; then
    print_err "Invalid QNAP_PG_PORT: $port"
    exit 1
  fi
}

validate_bind_ip() {
  local ip="$1"

  if is_placeholder_value "$ip"; then
    print_err "QNAP_PG_BIND_IP is still unset/placeholder in $ENV_FILE"
    print_warn "Set it to a private or VPN interface address before first start."
    exit 1
  fi

  case "$ip" in
    0.0.0.0|::|localhost|127.0.0.1)
      print_err "QNAP_PG_BIND_IP must be a private/VPN interface address, not $ip"
      exit 1
      ;;
  esac

  if ! [[ "$ip" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]] && ! [[ "$ip" == *:* ]]; then
    print_err "QNAP_PG_BIND_IP must look like an IPv4 or IPv6 address: $ip"
    exit 1
  fi

  if command -v ip >/dev/null 2>&1; then
    if ! ip addr show | grep -Fq "$ip"; then
      print_warn "QNAP_PG_BIND_IP=$ip was not found on current interfaces."
      print_warn "Double-check the NAS private/VPN address before continuing."
    fi
  fi
}

check_port_available() {
  local bind_ip="$1"
  local port="$2"

  if command -v ss >/dev/null 2>&1; then
    if ss -ltn | awk '{print $4}' | grep -Eq "(^|:)$port$"; then
      print_warn "Port $port appears to already be in use."
    fi
    return 0
  fi

  if command -v netstat >/dev/null 2>&1; then
    if netstat -ltn 2>/dev/null | awk '{print $4}' | grep -Eq "(^|:)$port$"; then
      print_warn "Port $port appears to already be in use."
    fi
    return 0
  fi

  print_warn "Could not verify whether $bind_ip:$port is already in use (ss/netstat unavailable)."
}

wait_for_postgres_health() {
  local max_attempts=30
  local attempt status

  for attempt in $(seq 1 "$max_attempts"); do
    status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' sms-postgres-qnap 2>/dev/null || true)"
    if [ "$status" = "healthy" ]; then
      print_ok "PostgreSQL container is healthy."
      return 0
    fi

    print_info "Waiting for PostgreSQL health ($attempt/$max_attempts)... current status: ${status:-unknown}"
    sleep 2
  done

  print_err "PostgreSQL container did not become healthy in time."
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs --tail=120 postgres || true
  exit 1
}

main() {
  print_info "Preparing QNAP PostgreSQL-only deployment..."

  require_cmd docker
  if ! docker info >/dev/null 2>&1; then
    print_err "Docker daemon is not reachable. Start Container Station/Docker first."
    exit 1
  fi

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
  local data_path backup_path bind_ip bind_port
  data_path="$(env_get QNAP_POSTGRES_DATA_PATH)"
  backup_path="$(env_get QNAP_POSTGRES_BACKUP_PATH)"
  bind_ip="$(env_get QNAP_PG_BIND_IP)"
  bind_port="$(env_get QNAP_PG_PORT)"

  bind_port="${bind_port:-55433}"
  validate_bind_ip "$bind_ip"
  validate_port "$bind_port"
  check_port_available "$bind_ip" "$bind_port"

  [ -n "$data_path" ] && mkdir -p "$data_path"
  [ -n "$backup_path" ] && mkdir -p "$backup_path"

  [ -n "$data_path" ] && [ ! -w "$data_path" ] && {
    print_err "Data path is not writable: $data_path"
    exit 1
  }
  [ -n "$backup_path" ] && [ ! -w "$backup_path" ] && {
    print_err "Backup path is not writable: $backup_path"
    exit 1
  }

  print_info "Preflight validation complete."
  print_info "Database will bind to $bind_ip:$bind_port"

  print_info "Starting PostgreSQL container..."
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

  print_info "Waiting for health status..."
  wait_for_postgres_health
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps

  print_ok "QNAP PostgreSQL-only deployment is up."
  print_info "Next: configure backend DATABASE_ENGINE=postgresql and POSTGRES_* values to point at the QNAP private/VPN address."
}

main "$@"
