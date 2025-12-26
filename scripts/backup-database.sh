#!/bin/bash
set -e

# Database Backup Script for Student Management System
# Automated daily PostgreSQL backups with retention management
#
# Environment Variables (from docker-compose):
#   POSTGRES_HOST - Database host (default: postgres)
#   POSTGRES_PORT - Database port (default: 5432)
#   POSTGRES_USER - Database user
#   POSTGRES_PASSWORD - Database password
#   POSTGRES_DB - Database name
#   BACKUP_DIR - Backup directory (default: /backups)
#   BACKUP_RETENTION_DAYS - Keep backups for N days (default: 30)

BACKUP_HOST="${POSTGRES_HOST:-postgres}"
BACKUP_PORT="${POSTGRES_PORT:-5432}"
BACKUP_USER="${POSTGRES_USER:-sms_user}"
BACKUP_PASSWORD="${POSTGRES_PASSWORD}"
BACKUP_DB="${POSTGRES_DB:-student_management}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${BACKUP_DB}_${TIMESTAMP}.sql.gz"
LOG_FILE="${BACKUP_DIR}/backup.log"

# Ensure backup directory exists
mkdir -p "${BACKUP_DIR}"

# Function: Log message with timestamp
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}"
}

# Function: Handle errors
handle_error() {
    log_message "❌ BACKUP FAILED: $1"
    echo "error=true" > "${BACKUP_DIR}/.backup_error"
    exit 1
}

# Function: Verify database connection
verify_connection() {
    log_message "🔍 Verifying database connection..."
    PGPASSWORD="${BACKUP_PASSWORD}" pg_isready \
        -h "${BACKUP_HOST}" \
        -p "${BACKUP_PORT}" \
        -U "${BACKUP_USER}" \
        -d "${BACKUP_DB}" \
        || handle_error "Cannot connect to database at ${BACKUP_HOST}:${BACKUP_PORT}"
    log_message "✅ Database connection verified"
}

# Function: Perform backup
perform_backup() {
    log_message "💾 Starting backup of database: ${BACKUP_DB}"

    PGPASSWORD="${BACKUP_PASSWORD}" pg_dump \
        -h "${BACKUP_HOST}" \
        -p "${BACKUP_PORT}" \
        -U "${BACKUP_USER}" \
        -d "${BACKUP_DB}" \
        --verbose \
        --no-password \
        | gzip > "${BACKUP_FILE}" \
        || handle_error "pg_dump failed"

    log_message "✅ Backup created: ${BACKUP_FILE}"

    # Get file size
    SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    log_message "📦 Backup size: ${SIZE}"
}

# Function: Verify backup integrity
verify_backup() {
    log_message "🔍 Verifying backup integrity..."

    # Check if file exists and has content
    if [ ! -f "${BACKUP_FILE}" ] || [ ! -s "${BACKUP_FILE}" ]; then
        handle_error "Backup file is empty or missing"
    fi

    # Test gzip integrity
    if ! gzip -t "${BACKUP_FILE}" 2>/dev/null; then
        handle_error "Backup file is corrupted (gzip test failed)"
    fi

    log_message "✅ Backup integrity verified"
}

# Function: Clean up old backups
cleanup_old_backups() {
    log_message "🧹 Cleaning up backups older than ${RETENTION_DAYS} days..."

    DELETED_COUNT=0
    while IFS= read -r -d '' file; do
        log_message "Deleting old backup: $(basename "$file")"
        rm -f "$file"
        ((DELETED_COUNT++))
    done < <(find "${BACKUP_DIR}" -name "backup_*.sql.gz" -type f -mtime "+${RETENTION_DAYS}" -print0)

    if [ ${DELETED_COUNT} -gt 0 ]; then
        log_message "✅ Deleted ${DELETED_COUNT} old backup(s)"
    else
        log_message "ℹ️ No old backups to delete"
    fi
}

# Function: Create backup metadata
create_metadata() {
    METADATA_FILE="${BACKUP_DIR}/backup_${BACKUP_DB}_${TIMESTAMP}.meta"
    cat > "${METADATA_FILE}" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "database": "${BACKUP_DB}",
  "host": "${BACKUP_HOST}",
  "port": ${BACKUP_PORT},
  "backup_file": "$(basename "${BACKUP_FILE}")",
  "size_bytes": $(stat -f%z "${BACKUP_FILE}" 2>/dev/null || stat -c%s "${BACKUP_FILE}"),
  "size_human": "$(du -h "${BACKUP_FILE}" | cut -f1)",
  "compression": "gzip",
  "status": "success",
  "pg_version": "$(PGPASSWORD="${BACKUP_PASSWORD}" psql -h "${BACKUP_HOST}" -U "${BACKUP_USER}" -d "${BACKUP_DB}" -t -c 'SELECT version();' 2>/dev/null || echo 'unknown')"
}
EOF
    log_message "📝 Metadata file created: ${METADATA_FILE}"
}

# Function: Send notification (optional)
send_notification() {
    # If SLACK_WEBHOOK_URL is set, send Slack notification
    if [ -n "${SLACK_WEBHOOK_URL}" ]; then
        SLACK_MESSAGE="{
            \"text\": \"Database Backup Complete\",
            \"blocks\": [
                {
                    \"type\": \"section\",
                    \"text\": {
                        \"type\": \"mrkdwn\",
                        \"text\": \"✅ *Database Backup Successful*\n*Database:* ${BACKUP_DB}\n*Size:* $(du -h "${BACKUP_FILE}" | cut -f1)\n*File:* backup_${BACKUP_DB}_${TIMESTAMP}.sql.gz\"
                    }
                }
            ]
        }"

        curl -X POST -H 'Content-type: application/json' \
            --data "${SLACK_MESSAGE}" \
            "${SLACK_WEBHOOK_URL}" \
            2>/dev/null || log_message "⚠️ Failed to send Slack notification"
    fi
}

# Main execution
main() {
    log_message "🚀 Starting database backup process..."
    log_message "Database: ${BACKUP_DB} @ ${BACKUP_HOST}:${BACKUP_PORT}"

    verify_connection
    perform_backup
    verify_backup
    create_metadata
    cleanup_old_backups
    send_notification

    # Clear error flag if everything succeeded
    rm -f "${BACKUP_DIR}/.backup_error"

    log_message "✅ Backup process completed successfully"
    log_message "========================================"
}

# Run main function
main "$@"
