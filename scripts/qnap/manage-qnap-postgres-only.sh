#!/bin/bash
# QNAP PostgreSQL-Only Management Script

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="docker/docker-compose.qnap.postgres-only.yml"
ENV_FILE=".env.qnap.postgres-only"

print_usage() {
  cat <<'EOF'
Usage: ./scripts/qnap/manage-qnap-postgres-only.sh <command> [args]

Commands:
  start                     Start PostgreSQL service
  stop                      Stop PostgreSQL service
  restart                   Restart PostgreSQL service
  status                    Show service status
  logs                      Tail PostgreSQL logs
  backup                    Create compressed backup + checksum in QNAP_POSTGRES_BACKUP_PATH
  restore <file.sql.gz>     Restore compressed backup into configured database
  psql-url [--show-password] Print app DATABASE_URL (redacted by default)

Examples:
  ./scripts/qnap/manage-qnap-postgres-only.sh start
  ./scripts/qnap/manage-qnap-postgres-only.sh backup
  ./scripts/qnap/manage-qnap-postgres-only.sh restore /share/Container/sms-backups/backup_20260304_120000.sql.gz
EOF
}

require_env() {
  if [ ! -f "$PROJECT_ROOT/$ENV_FILE" ]; then
    echo "Missing $ENV_FILE. Create it from .env.qnap.postgres-only.example first."
    exit 1
  fi
}

compose() {
  cd "$PROJECT_ROOT"
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"
}

env_get() {
  grep "^$1=" "$PROJECT_ROOT/$ENV_FILE" | cut -d= -f2-
}

sha256_file() {
  local target="$1"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$target" > "$target.sha256"
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$target" > "$target.sha256"
  elif command -v openssl >/dev/null 2>&1; then
    openssl dgst -sha256 "$target" | sed 's/^SHA2-256(//; s/)= /  /' > "$target.sha256"
  else
    echo "Warning: no SHA256 utility found; checksum file not created." >&2
    return 1
  fi
}

prune_backups() {
  local backup_dir="$1"
  local keep_count="$2"
  local old_file

  mapfile -t old_files < <(find "$backup_dir" -maxdepth 1 -type f -name 'backup_*.sql.gz' | sort -r | tail -n +$((keep_count + 1)) || true)
  for old_file in "${old_files[@]:-}"; do
    [ -n "$old_file" ] || continue
    rm -f "$old_file" "$old_file.sha256"
  done
}

cmd_backup() {
  require_env

  local backup_dir ts backup_file user db keep_count
  backup_dir="$(env_get QNAP_POSTGRES_BACKUP_PATH)"
  user="$(env_get POSTGRES_USER)"
  db="$(env_get POSTGRES_DB)"
  keep_count="$(env_get QNAP_POSTGRES_BACKUP_KEEP)"
  ts="$(date +%Y%m%d_%H%M%S)"
  backup_file="${backup_dir}/backup_${ts}.sql.gz"

  keep_count="${keep_count:-14}"
  if ! [[ "$keep_count" =~ ^[0-9]+$ ]] || [ "$keep_count" -lt 1 ]; then
    echo "Invalid QNAP_POSTGRES_BACKUP_KEEP value: $keep_count" >&2
    exit 1
  fi

  mkdir -p "$backup_dir"

  compose exec -T postgres pg_dump -U "$user" "$db" | gzip > "$backup_file"
  gzip -t "$backup_file"
  chmod 600 "$backup_file" || true
  sha256_file "$backup_file" || true
  prune_backups "$backup_dir" "$keep_count"

  echo "Backup created: $backup_file"
  [ -f "$backup_file.sha256" ] && echo "Checksum created: $backup_file.sha256"
  echo "Retention applied: keeping latest $keep_count backup(s)"
}

cmd_restore() {
  require_env

  if [ $# -lt 1 ]; then
    echo "restore requires a .sql.gz file path"
    exit 1
  fi

  local input_file user db
  input_file="$1"
  user="$(env_get POSTGRES_USER)"
  db="$(env_get POSTGRES_DB)"

  if [ ! -f "$input_file" ]; then
    echo "Backup file not found: $input_file"
    exit 1
  fi

  echo "WARNING: this overwrites data in $db"
  read -r -p "Type YES to continue: " confirm
  if [ "$confirm" != "YES" ]; then
    echo "Restore cancelled."
    exit 0
  fi

  gunzip -c "$input_file" | compose exec -T postgres psql -U "$user" "$db"
  echo "Restore complete."
}

cmd_psql_url() {
  require_env

  local user pass db ip port show_password full_url redacted_url
  user="$(env_get POSTGRES_USER)"
  pass="$(env_get POSTGRES_PASSWORD)"
  db="$(env_get POSTGRES_DB)"
  ip="$(env_get QNAP_PG_BIND_IP)"
  port="$(env_get QNAP_PG_PORT)"
  show_password="${1:-}"

  full_url="postgresql+psycopg://${user}:${pass}@${ip}:${port}/${db}"
  redacted_url="postgresql+psycopg://${user}:***@${ip}:${port}/${db}"

  if [ "$show_password" = "--show-password" ]; then
    echo "$full_url"
    return 0
  fi

  echo "$redacted_url"
  echo "(Password hidden. Re-run with: psql-url --show-password)" >&2
}

main() {
  if [ $# -lt 1 ]; then
    print_usage
    exit 1
  fi

  local cmd="$1"
  shift

  case "$cmd" in
    start) require_env; compose up -d ;;
    stop) require_env; compose down ;;
    restart) require_env; compose restart ;;
    status) require_env; compose ps ;;
    logs) require_env; compose logs -f postgres ;;
    backup) cmd_backup ;;
    restore) cmd_restore "$@" ;;
    psql-url) cmd_psql_url "$@" ;;
    *) print_usage; exit 1 ;;
  esac
}

main "$@"
