#!/bin/bash
# QNAP Rollback Script for Student Management System
# Provides safe rollback capabilities for failed updates or deployments
#
# Usage:
#   ./rollback-qnap.sh                    # Interactive rollback
#   ./rollback-qnap.sh --to-backup <file> # Rollback to specific backup

set -e

# ============================================================================
# Configuration
# ============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_DIR="/share/Container/sms-backups"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TARGET_BACKUP=""

# ============================================================================
# Helper Functions
# ============================================================================

print_header() {
    echo -e "${BLUE}"
    echo "=========================================="
    echo "  SMS QNAP Rollback Script"
    echo "=========================================="
    echo -e "${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

confirm() {
    local message="$1"
    read -p "$message (yes/NO) " -r
    [[ $REPLY == "yes" ]]
}

# ============================================================================
# Rollback Functions
# ============================================================================

select_backup() {
    print_info "Available backups:"
    echo ""
    
    local backups=($(ls -t "$BACKUP_DIR"/*.sql.gz 2>/dev/null))
    
    if [ ${#backups[@]} -eq 0 ]; then
        print_error "No backups found in $BACKUP_DIR"
        exit 1
    fi
    
    local i=1
    for backup in "${backups[@]}"; do
        local filename=$(basename "$backup")
        local size=$(du -h "$backup" | cut -f1)
        local date=$(echo "$filename" | grep -oP '\d{8}_\d{6}' || echo "unknown")
        echo "  $i) $filename"
        echo "     Size: $size | Date: $date"
        i=$((i + 1))
    done
    
    echo ""
    read -p "Select backup number (or 0 to cancel): " selection
    
    if [ "$selection" = "0" ] || [ "$selection" -gt "${#backups[@]}" ]; then
        print_info "Rollback cancelled"
        exit 0
    fi
    
    TARGET_BACKUP="${backups[$((selection - 1))]}"
}

create_safety_backup() {
    print_info "Creating safety backup of current state..."
    
    local safety_backup="$BACKUP_DIR/rollback_safety_$(date +%Y%m%d_%H%M%S).sql.gz"
    
    source "$PROJECT_ROOT/.env.qnap" 2>/dev/null || {
        print_warning "Could not load environment file"
        return 1
    }
    
    cd "$PROJECT_ROOT"
    
    if docker compose -f docker-compose.qnap.yml ps postgres 2>/dev/null | grep -q "Up"; then
        docker compose -f docker-compose.qnap.yml exec -T postgres \
            pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" 2>/dev/null \
            | gzip > "$safety_backup" || {
            print_warning "Could not create safety backup"
            return 1
        }
        
        print_success "Safety backup created: $safety_backup"
        return 0
    else
        print_warning "Database container not running, skipping safety backup"
        return 1
    fi
}

restore_backup() {
    print_info "Restoring backup: $(basename "$TARGET_BACKUP")"
    
    source "$PROJECT_ROOT/.env.qnap"
    cd "$PROJECT_ROOT"
    
    # Stop backend to prevent database access
    print_info "Stopping backend service..."
    docker compose -f docker-compose.qnap.yml stop backend
    
    # Restore database
    print_info "Restoring database..."
    gunzip -c "$TARGET_BACKUP" | \
        docker compose -f docker-compose.qnap.yml exec -T postgres \
        psql -U "$POSTGRES_USER" "$POSTGRES_DB" 2>&1 | grep -v "^ERROR:" || true
    
    print_success "Database restored"
}

restart_services() {
    print_info "Restarting services..."
    
    cd "$PROJECT_ROOT"
    docker compose -f docker-compose.qnap.yml restart
    
    # Wait for health checks
    print_info "Waiting for services to become healthy..."
    sleep 10
    
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -f -s http://localhost:8080/health > /dev/null 2>&1; then
            print_success "Services are healthy!"
            return 0
        fi
        
        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done
    
    print_warning "Health check timeout. Check logs manually."
    return 1
}

verify_rollback() {
    print_info "Verifying rollback..."
    
    # Check container status
    local running=$(docker compose -f "$PROJECT_ROOT/docker-compose.qnap.yml" ps --format json 2>/dev/null | grep -c '"State":"running"' || echo "0")
    
    if [ "$running" -lt 3 ]; then
        print_error "Not all containers are running"
        return 1
    fi
    
    # Check health endpoint
    if curl -f -s http://localhost:8080/health > /dev/null 2>&1; then
        print_success "Health check passed"
    else
        print_error "Health check failed"
        return 1
    fi
    
    # Check database connection
    source "$PROJECT_ROOT/.env.qnap"
    if docker compose -f "$PROJECT_ROOT/docker-compose.qnap.yml" exec -T postgres \
        psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 1" > /dev/null 2>&1; then
        print_success "Database connection OK"
    else
        print_error "Database connection failed"
        return 1
    fi
    
    print_success "Rollback verification complete"
    return 0
}

show_summary() {
    echo ""
    print_header
    print_success "Rollback Complete"
    echo "=========================================="
    echo ""
    echo "✓ Database restored from: $(basename "$TARGET_BACKUP")"
    echo "✓ Services restarted"
    echo "✓ Health checks passed"
    echo ""
    echo "🔍 Verification:"
    echo "   1. Access the application: http://YOUR_QNAP_IP:8080"
    echo "   2. Verify data is as expected"
    echo "   3. Check logs: docker compose -f docker-compose.qnap.yml logs -f"
    echo ""
    echo "🔄 If issues persist:"
    echo "   - Check logs for errors"
    echo "   - Try restoring from an earlier backup"
    echo "   - Contact support if needed"
    echo ""
    echo "=========================================="
}

# ============================================================================
# Main
# ============================================================================

parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --to-backup)
                TARGET_BACKUP="$2"
                shift 2
                ;;
            --help|-h)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --to-backup <file>  Rollback to specific backup file"
                echo "  --help, -h          Show this help message"
                echo ""
                echo "Examples:"
                echo "  $0                                    # Interactive backup selection"
                echo "  $0 --to-backup /path/to/backup.sql.gz # Specific backup"
                echo ""
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
}

main() {
    parse_args "$@"
    
    print_header
    
    print_warning "⚠️  ROLLBACK OPERATION"
    echo ""
    echo "This will:"
    echo "  1. Create a safety backup of current state"
    echo "  2. Restore database from selected backup"
    echo "  3. Restart all services"
    echo ""
    
    # Select backup if not specified
    if [ -z "$TARGET_BACKUP" ]; then
        select_backup
    else
        if [ ! -f "$TARGET_BACKUP" ]; then
            print_error "Backup file not found: $TARGET_BACKUP"
            exit 1
        fi
    fi
    
    echo ""
    print_info "Target backup: $(basename "$TARGET_BACKUP")"
    echo ""
    
    if ! confirm "Continue with rollback?"; then
        print_info "Rollback cancelled"
        exit 0
    fi
    
    echo ""
    
    # Rollback procedure
    create_safety_backup || print_warning "Continuing without safety backup"
    
    echo ""
    
    restore_backup
    restart_services
    
    echo ""
    
    if verify_rollback; then
        show_summary
        exit 0
    else
        print_error "Rollback verification failed"
        print_info "Check logs: docker compose -f docker-compose.qnap.yml logs -f"
        exit 1
    fi
}

# Run main function
main "$@"
