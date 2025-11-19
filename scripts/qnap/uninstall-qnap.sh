#!/bin/bash
# QNAP Uninstall Script for Student Management System
# Safely removes SMS from QNAP NAS with data preservation options
#
# Usage:
#   ./uninstall-qnap.sh              # Interactive uninstall
#   ./uninstall-qnap.sh --keep-data  # Uninstall but keep all data
#   ./uninstall-qnap.sh --force      # Uninstall without confirmation

set -e

# ============================================================================
# Configuration
# ============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
QNAP_BASE="/share/Container"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Flags
KEEP_DATA=false
FORCE=false

# ============================================================================
# Helper Functions
# ============================================================================

print_header() {
    echo -e "${BLUE}"
    echo "=========================================="
    echo "  SMS QNAP Uninstall Script"
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
    if [ "$FORCE" = true ]; then
        return 0
    fi
    
    local message="$1"
    read -p "$message (yes/NO) " -r
    [[ $REPLY == "yes" ]]
}

# ============================================================================
# Uninstall Functions
# ============================================================================

stop_and_remove_containers() {
    print_info "Stopping and removing containers..."
    
    cd "$PROJECT_ROOT"
    
    if docker compose -f docker-compose.qnap.yml ps -q 2>/dev/null | grep -q .; then
        docker compose -f docker-compose.qnap.yml down
        print_success "Containers stopped and removed"
    else
        print_info "No containers found"
    fi
}

remove_images() {
    print_info "Removing Docker images..."
    
    local images=(
        "sms-backend-qnap"
        "sms-frontend-qnap"
    )
    
    for image in "${images[@]}"; do
        if docker images -q "$image" 2>/dev/null | grep -q .; then
            docker rmi -f "$image" 2>/dev/null || true
            print_info "Removed image: $image"
        fi
    done
    
    print_success "Images removed"
}

backup_data_before_removal() {
    print_warning "Creating final backup before uninstall..."
    
    local backup_dir="$HOME/sms_uninstall_backup_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    # Backup database if container is running
    if docker compose -f docker-compose.qnap.yml ps postgres 2>/dev/null | grep -q "Up"; then
        print_info "Backing up database..."
        source "$PROJECT_ROOT/.env.qnap" 2>/dev/null || true
        docker compose -f docker-compose.qnap.yml exec -T postgres \
            pg_dump -U "${POSTGRES_USER:-sms_user}" "${POSTGRES_DB:-student_management}" \
            2>/dev/null | gzip > "$backup_dir/final_backup.sql.gz" || true
    fi
    
    # Copy configuration
    if [ -f "$PROJECT_ROOT/.env.qnap" ]; then
        cp "$PROJECT_ROOT/.env.qnap" "$backup_dir/" 2>/dev/null || true
    fi
    
    print_success "Backup saved to: $backup_dir"
}

remove_data_directories() {
    if [ "$KEEP_DATA" = true ]; then
        print_info "Keeping data directories (--keep-data flag)"
        return 0
    fi
    
    print_warning "⚠️  This will DELETE all application data!"
    echo ""
    print_info "Data directories:"
    echo "  - $QNAP_BASE/sms-postgres"
    echo "  - $QNAP_BASE/sms-data"
    echo "  - $QNAP_BASE/sms-logs"
    echo "  - $QNAP_BASE/sms-monitoring"
    echo ""
    print_info "Backups will be preserved: $QNAP_BASE/sms-backups"
    echo ""
    
    if ! confirm "Are you ABSOLUTELY sure you want to delete all data?"; then
        print_info "Data directories preserved"
        KEEP_DATA=true
        return 0
    fi
    
    # Remove data directories (except backups)
    local dirs=(
        "$QNAP_BASE/sms-postgres"
        "$QNAP_BASE/sms-data"
        "$QNAP_BASE/sms-logs"
        "$QNAP_BASE/sms-monitoring"
    )
    
    for dir in "${dirs[@]}"; do
        if [ -d "$dir" ]; then
            rm -rf "$dir"
            print_info "Removed: $dir"
        fi
    done
    
    print_success "Data directories removed"
}

remove_configuration() {
    print_info "Removing configuration files..."
    
    if [ -f "$PROJECT_ROOT/.env.qnap" ]; then
        rm -f "$PROJECT_ROOT/.env.qnap"
        print_info "Removed: .env.qnap"
    fi
    
    # Remove backup config files
    rm -f "$PROJECT_ROOT/.env.qnap.backup"* 2>/dev/null || true
    
    print_success "Configuration removed"
}

show_summary() {
    echo ""
    print_header
    print_success "Uninstall Complete"
    echo "=========================================="
    echo ""
    
    if [ "$KEEP_DATA" = true ]; then
        echo "📂 Data Preserved:"
        echo "   Database:  $QNAP_BASE/sms-postgres"
        echo "   Backups:   $QNAP_BASE/sms-backups"
        echo "   Logs:      $QNAP_BASE/sms-logs"
        echo ""
        echo "   To reinstall with existing data:"
        echo "   1. Run: ./scripts/qnap/install-qnap.sh"
        echo "   2. Configure .env.qnap with same database credentials"
        echo "   3. Deploy services"
    else
        echo "🗑️  Removed:"
        echo "   ✓ Docker containers"
        echo "   ✓ Docker images"
        echo "   ✓ Data directories"
        echo "   ✓ Configuration files"
        echo ""
        echo "📁 Preserved:"
        echo "   ✓ Backups: $QNAP_BASE/sms-backups"
    fi
    
    echo ""
    echo "🔄 To reinstall:"
    echo "   Run: ./scripts/qnap/install-qnap.sh"
    echo ""
    echo "=========================================="
}

# ============================================================================
# Main
# ============================================================================

parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --keep-data)
                KEEP_DATA=true
                shift
                ;;
            --force)
                FORCE=true
                shift
                ;;
            --help|-h)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --keep-data    Keep all data directories"
                echo "  --force        Skip confirmation prompts"
                echo "  --help, -h     Show this help message"
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
    
    echo "This script will uninstall Student Management System from QNAP"
    echo ""
    
    if [ "$KEEP_DATA" = true ]; then
        print_info "Mode: Uninstall (keep data)"
    else
        print_warning "Mode: Complete uninstall (remove data)"
    fi
    
    echo ""
    
    if ! confirm "Continue with uninstall?"; then
        print_info "Uninstall cancelled"
        exit 0
    fi
    
    echo ""
    
    # Create backup before uninstalling
    backup_data_before_removal
    
    echo ""
    
    # Uninstall steps
    stop_and_remove_containers
    remove_images
    remove_data_directories
    remove_configuration
    
    # Summary
    show_summary
}

# Run main function
main "$@"
