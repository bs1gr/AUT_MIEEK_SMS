#!/bin/bash
# QNAP Management Script for Student Management System
# Provides interactive menu for managing SMS on QNAP NAS
#
# Usage: ./manage-qnap.sh

set -e

# ============================================================================
# Configuration
# ============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="docker-compose.qnap.yml"
ENV_FILE=".env.qnap"
BACKUP_DIR="/share/Container/sms-backups"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ============================================================================
# Helper Functions
# ============================================================================

print_header() {
    clear
    echo -e "${CYAN}"
    echo "=========================================="
    echo "   SMS QNAP Management Menu"
    echo "=========================================="
    echo -e "${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

pause() {
    echo ""
    read -p "Press Enter to continue..."
}

confirm() {
    local message="$1"
    read -p "$message (yes/NO) " -r
    [[ $REPLY == "yes" ]]
}

# ============================================================================
# Service Management
# ============================================================================

start_services() {
    print_header
    echo "🚀 Starting services..."
    echo ""
    
    cd "$PROJECT_ROOT"
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d
    
    echo ""
    print_success "Services started"
    pause
}

stop_services() {
    print_header
    echo "🛑 Stopping services..."
    echo ""
    
    if confirm "Are you sure you want to stop all services?"; then
        cd "$PROJECT_ROOT"
        docker compose -f "$COMPOSE_FILE" down
        
        echo ""
        print_success "Services stopped"
    else
        print_info "Cancelled"
    fi
    pause
}

restart_services() {
    print_header
    echo "🔄 Restarting services..."
    echo ""
    
    cd "$PROJECT_ROOT"
    docker compose -f "$COMPOSE_FILE" restart
    
    echo ""
    print_success "Services restarted"
    pause
}

view_logs() {
    print_header
    echo "📋 Viewing logs (Ctrl+C to exit)..."
    echo ""
    
    cd "$PROJECT_ROOT"
    docker compose -f "$COMPOSE_FILE" logs -f --tail=100
}

show_status() {
    print_header
    echo "📊 Service Status"
    echo ""
    
    cd "$PROJECT_ROOT"
    docker compose -f "$COMPOSE_FILE" ps
    
    echo ""
    echo "🗄️  Disk Usage:"
    du -sh /share/Container/sms-* 2>/dev/null || print_warning "No data directories found"
    
    echo ""
    echo "💾 Container Stats:"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" \
        $(docker compose -f "$COMPOSE_FILE" ps -q) 2>/dev/null || print_info "No containers running"
    
    pause
}

# ============================================================================
# Backup & Restore
# ============================================================================

backup_database() {
    print_header
    echo "💾 Creating Database Backup"
    echo ""
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/backup_$timestamp.sql"
    
    # Ensure backup directory exists
    mkdir -p "$BACKUP_DIR"
    
    # Load environment
    source "$PROJECT_ROOT/$ENV_FILE"
    
    print_info "Backing up database to: $backup_file"
    
    cd "$PROJECT_ROOT"
    docker compose -f "$COMPOSE_FILE" exec -T postgres \
        pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "$backup_file"
    
    # Compress backup
    gzip "$backup_file"
    
    echo ""
    print_success "Backup created: $backup_file.gz"
    
    # Show backup size
    local size=$(du -h "$backup_file.gz" | cut -f1)
    print_info "Backup size: $size"
    
    # Keep only last 10 backups
    print_info "Cleaning old backups (keeping last 10)..."
    ls -t "$BACKUP_DIR"/backup_*.sql.gz 2>/dev/null | tail -n +11 | xargs -r rm
    
    echo ""
    print_info "Available backups:"
    ls -lh "$BACKUP_DIR"/backup_*.sql.gz 2>/dev/null || print_warning "No backups found"
    
    pause
}

restore_database() {
    print_header
    echo "📥 Restore Database Backup"
    echo ""
    
    # List available backups
    print_info "Available backups:"
    echo ""
    
    local backups=($(ls -t "$BACKUP_DIR"/backup_*.sql.gz 2>/dev/null))
    
    if [ ${#backups[@]} -eq 0 ]; then
        print_error "No backups found in $BACKUP_DIR"
        pause
        return
    fi
    
    local i=1
    for backup in "${backups[@]}"; do
        local filename=$(basename "$backup")
        local size=$(du -h "$backup" | cut -f1)
        echo "  $i) $filename ($size)"
        i=$((i + 1))
    done
    
    echo ""
    read -p "Select backup number (or 0 to cancel): " selection
    
    if [ "$selection" = "0" ] || [ "$selection" -gt "${#backups[@]}" ]; then
        print_info "Cancelled"
        pause
        return
    fi
    
    local selected_backup="${backups[$((selection - 1))]}"
    
    echo ""
    print_warning "⚠️  This will OVERWRITE the current database!"
    print_info "Selected backup: $(basename "$selected_backup")"
    echo ""
    
    if ! confirm "Are you ABSOLUTELY sure you want to restore this backup?"; then
        print_info "Cancelled"
        pause
        return
    fi
    
    # Create pre-restore backup
    print_info "Creating pre-restore backup first..."
    local pre_restore_backup="$BACKUP_DIR/pre_restore_$(date +%Y%m%d_%H%M%S).sql.gz"
    
    source "$PROJECT_ROOT/$ENV_FILE"
    cd "$PROJECT_ROOT"
    
    docker compose -f "$COMPOSE_FILE" exec -T postgres \
        pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$pre_restore_backup"
    
    print_success "Pre-restore backup saved: $pre_restore_backup"
    
    # Restore selected backup
    print_info "Restoring database..."
    
    gunzip -c "$selected_backup" | \
        docker compose -f "$COMPOSE_FILE" exec -T postgres \
        psql -U "$POSTGRES_USER" "$POSTGRES_DB"
    
    echo ""
    print_success "Database restored successfully"
    print_info "Restarting services..."
    
    docker compose -f "$COMPOSE_FILE" restart backend
    
    pause
}

# ============================================================================
# Updates
# ============================================================================

update_application() {
    print_header
    echo "🔄 Update Application"
    echo ""
    
    print_warning "This will:"
    print_info "  1. Create a database backup"
    print_info "  2. Pull latest code from git"
    print_info "  3. Rebuild Docker images"
    print_info "  4. Restart services"
    echo ""
    
    if ! confirm "Continue with update?"; then
        print_info "Cancelled"
        pause
        return
    fi
    
    # Backup database first
    print_info "Step 1: Creating backup..."
    source "$PROJECT_ROOT/$ENV_FILE"
    local backup_file="$BACKUP_DIR/pre_update_$(date +%Y%m%d_%H%M%S).sql"
    
    cd "$PROJECT_ROOT"
    docker compose -f "$COMPOSE_FILE" exec -T postgres \
        pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "$backup_file"
    gzip "$backup_file"
    
    print_success "Backup created: $backup_file.gz"
    
    # Pull latest code
    print_info "Step 2: Pulling latest code..."
    git pull origin feature/qnap-deployment
    
    # Rebuild images
    print_info "Step 3: Rebuilding images..."
    docker compose -f "$COMPOSE_FILE" down
    docker compose -f "$COMPOSE_FILE" build --no-cache
    
    # Start services
    print_info "Step 4: Starting services..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d
    
    echo ""
    print_success "Update complete!"
    pause
}

# ============================================================================
# Monitoring
# ============================================================================

enable_monitoring() {
    print_header
    echo "📊 Enable Monitoring Stack"
    echo ""
    
    print_info "Starting Grafana and Prometheus..."
    
    cd "$PROJECT_ROOT"
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" \
        --profile monitoring up -d
    
    source "$ENV_FILE"
    
    echo ""
    print_success "Monitoring enabled"
    echo ""
    echo "Access URLs:"
    echo "  Grafana:    http://${QNAP_IP}:${GRAFANA_PORT:-3000}"
    echo "  Prometheus: http://${QNAP_IP}:${PROMETHEUS_PORT:-9090}"
    echo ""
    echo "Grafana Login:"
    echo "  Username: admin"
    echo "  Password: (check .env.qnap)"
    
    pause
}

disable_monitoring() {
    print_header
    echo "🛑 Disable Monitoring Stack"
    echo ""
    
    cd "$PROJECT_ROOT"
    docker compose -f "$COMPOSE_FILE" stop prometheus grafana
    
    print_success "Monitoring disabled"
    pause
}

# ============================================================================
# Maintenance
# ============================================================================

cleanup_docker() {
    print_header
    echo "🧹 Docker Cleanup"
    echo ""
    
    print_warning "This will remove:"
    print_info "  - Stopped containers"
    print_info "  - Dangling images"
    print_info "  - Unused networks"
    print_info "  - Build cache"
    echo ""
    print_warning "Data volumes will NOT be affected"
    echo ""
    
    if ! confirm "Proceed with cleanup?"; then
        print_info "Cancelled"
        pause
        return
    fi
    
    print_info "Removing stopped containers..."
    docker container prune -f
    
    print_info "Removing dangling images..."
    docker image prune -f
    
    print_info "Removing unused networks..."
    docker network prune -f
    
    print_info "Removing build cache..."
    docker builder prune -f
    
    echo ""
    print_success "Cleanup complete"
    
    echo ""
    print_info "Disk space summary:"
    docker system df
    
    pause
}

view_configuration() {
    print_header
    echo "⚙️  Current Configuration"
    echo ""
    
    if [ -f "$PROJECT_ROOT/$ENV_FILE" ]; then
        cat "$PROJECT_ROOT/$ENV_FILE" | grep -v "PASSWORD\|SECRET\|TOKEN" | grep -v "^#" | grep -v "^$"
        echo ""
        print_warning "Sensitive values (passwords, secrets, tokens) are hidden"
    else
        print_error "Configuration file not found: $ENV_FILE"
    fi
    
    pause
}

# ============================================================================
# Main Menu
# ============================================================================

show_menu() {
    print_header
    
    # Show quick status
    local status=$(docker compose -f "$PROJECT_ROOT/$COMPOSE_FILE" ps --format json 2>/dev/null | grep -c '"State":"running"' || echo "0")
    
    if [ "$status" -gt 0 ]; then
        echo -e "${GREEN}● Services Running ($status containers)${NC}"
    else
        echo -e "${RED}○ Services Stopped${NC}"
    fi
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Service Management:"
    echo "  1) Start services"
    echo "  2) Stop services"
    echo "  3) Restart services"
    echo "  4) View logs"
    echo "  5) Show status"
    echo ""
    echo "Backup & Restore:"
    echo "  6) Backup database"
    echo "  7) Restore database"
    echo ""
    echo "Monitoring:"
    echo "  8) Enable monitoring"
    echo "  9) Disable monitoring"
    echo ""
    echo "Maintenance:"
    echo "  10) Update application"
    echo "  11) Docker cleanup"
    echo "  12) View configuration"
    echo ""
    echo "  0) Exit"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
}

main() {
    cd "$PROJECT_ROOT"
    
    while true; do
        show_menu
        read -p "Select option: " choice
        
        case $choice in
            1) start_services ;;
            2) stop_services ;;
            3) restart_services ;;
            4) view_logs ;;
            5) show_status ;;
            6) backup_database ;;
            7) restore_database ;;
            8) enable_monitoring ;;
            9) disable_monitoring ;;
            10) update_application ;;
            11) cleanup_docker ;;
            12) view_configuration ;;
            0)
                print_info "Goodbye!"
                exit 0
                ;;
            *)
                print_error "Invalid option"
                pause
                ;;
        esac
    done
}

# Run main function
main
