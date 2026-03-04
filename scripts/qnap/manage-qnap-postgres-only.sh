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
  backup                    Create compressed backup in QNAP_POSTGRES_BACKUP_PATH
  restore <file.sql.gz>     Restore compressed backup into configured database
  psql-url                  Print DATABASE_URL template for app runtime

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

cmd_backup() {
  require_env

  local backup_dir ts backup_file user db
  backup_dir="$(env_get QNAP_POSTGRES_BACKUP_PATH)"
  user="$(env_get POSTGRES_USER)"
  db="$(env_get POSTGRES_DB)"
  ts="$(date +%Y%m%d_%H%M%S)"
  backup_file="${backup_dir}/backup_${ts}.sql.gz"

  mkdir -p "$backup_dir"

  compose exec -T postgres pg_dump -U "$user" "$db" | gzip > "$backup_file"
  echo "Backup created: $backup_file"
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

  local user pass db ip port
  user="$(env_get POSTGRES_USER)"
  pass="$(env_get POSTGRES_PASSWORD)"
  db="$(env_get POSTGRES_DB)"
  ip="$(env_get QNAP_PG_BIND_IP)"
  port="$(env_get QNAP_PG_PORT)"

  echo "postgresql://${user}:${pass}@${ip}:${port}/${db}"
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
    psql-url) cmd_psql_url ;;
    *) print_usage; exit 1 ;;
  esac
}

main "$@"
