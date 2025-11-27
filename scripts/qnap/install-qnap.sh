#!/bin/bash
# QNAP Container Station Installation Script
# Student Management System
#
# This script automates the deployment of SMS on QNAP NAS
# with comprehensive safety checks and validation
#
# Usage:
#   ./install-qnap.sh              # Interactive installation
#   ./install-qnap.sh --dry-run    # Preview without changes
#   ./install-qnap.sh --help       # Show help

set -e  # Exit on error
set -u  # Exit on undefined variable

# ============================================================================
# Configuration
# ============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
QNAP_BASE="/share/Container"
VERSION="1.8.0"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Flags
DRY_RUN=false
SKIP_CHECKS=false
AUTO_YES=false

# ============================================================================
# Helper Functions
# ============================================================================

print_header() {
    echo -e "${BLUE}"
    echo "=========================================="
    echo "  SMS QNAP Installation Script v${VERSION}"
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

print_step() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')] $1${NC}"
}

confirm() {
    if [ "$AUTO_YES" = true ]; then
        return 0
    fi
    
    local message="$1"
    local default="${2:-n}"
    
    if [ "$default" = "y" ]; then
        read -p "$message (Y/n) " -n 1 -r
    else
        read -p "$message (y/N) " -n 1 -r
    fi
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        return 0
    else
        return 1
    fi
}

check_command() {
    if command -v "$1" &> /dev/null; then
        return 0
    else
        return 1
    fi
}

# ============================================================================
# Pre-flight Checks
# ============================================================================

check_qnap_environment() {
    print_step "Checking QNAP environment..."
    
    # Check if running on QNAP
    if [ ! -f "/etc/init.d/nas_fw_daemon.sh" ] && [ "$SKIP_CHECKS" = false ]; then
        print_warning "This doesn't appear to be a QNAP NAS"
        if ! confirm "Continue anyway?"; then
            exit 1
        fi
    fi
    
    # Check if Container Station is installed
    if ! check_command docker; then
        print_error "Docker not found. Container Station may not be installed."
        print_info "Please install Container Station from App Center:"
        print_info "  1. Open App Center"
        print_info "  2. Search for 'Container Station'"
        print_info "  3. Click Install"
        exit 1
    fi
    
    print_success "QNAP environment OK"
}

check_docker_version() {
    print_step "Checking Docker version..."
    
    # Extract version using sed (BusyBox compatible)
    local docker_version=$(docker --version | sed -n 's/.*version \([0-9]*\.[0-9]*\).*/\1/p')
    local required_version="20.10"
    
    # Simple version comparison (major.minor)
    local docker_major=$(echo "$docker_version" | cut -d. -f1)
    local docker_minor=$(echo "$docker_version" | cut -d. -f2)
    local required_major=$(echo "$required_version" | cut -d. -f1)
    local required_minor=$(echo "$required_version" | cut -d. -f2)
    
    if [ "$docker_major" -lt "$required_major" ] || \
       ([ "$docker_major" -eq "$required_major" ] && [ "$docker_minor" -lt "$required_minor" ]); then
        print_error "Docker version $docker_version is too old (minimum: $required_version)"
        exit 1
    fi
    
    print_success "Docker version: $docker_version"
}

check_resources() {
    print_step "Checking system resources..."
    
    # Check available memory
    local total_mem=$(free -m | awk '/^Mem:/ {print $2}')
    local min_mem=4096
    
    if [ "$total_mem" -lt "$min_mem" ]; then
        print_warning "Low memory: ${total_mem}MB (recommended: ${min_mem}MB)"
        if ! confirm "Continue with low memory?"; then
            exit 1
        fi
    else
        print_success "Memory: ${total_mem}MB"
    fi
    
    # Check available disk space
    local available_space=$(df -BG "$QNAP_BASE" | awk 'NR==2 {print $4}' | sed 's/G//')
    local min_space=10
    
    if [ "$available_space" -lt "$min_space" ]; then
        print_error "Insufficient disk space: ${available_space}GB (minimum: ${min_space}GB)"
        exit 1
    else
        print_success "Disk space: ${available_space}GB available"
    fi
}

check_ports() {
    print_step "Checking port availability..."
    
    local ports=(8080 3000 9090)
    local port_conflicts=()
    
    for port in "${ports[@]}"; do
        if netstat -tuln 2>/dev/null | grep -q ":$port "; then
            port_conflicts+=("$port")
        fi
    done
    
    if [ ${#port_conflicts[@]} -gt 0 ]; then
        print_warning "Ports in use: ${port_conflicts[*]}"
        print_info "These ports can be reconfigured in .env.qnap"
        if ! confirm "Continue anyway?"; then
            exit 1
        fi
    else
        print_success "All default ports available"
    fi
}

# ============================================================================
# Directory Setup
# ============================================================================

create_directories() {
    print_step "Creating QNAP directories..."
    
    local dirs=(
        "$QNAP_BASE/sms-data"
        "$QNAP_BASE/sms-postgres"
        "$QNAP_BASE/sms-backups"
        "$QNAP_BASE/sms-logs"
        "$QNAP_BASE/sms-monitoring/prometheus-data"
        "$QNAP_BASE/sms-monitoring/grafana-data"
    )
    
    for dir in "${dirs[@]}"; do
        if [ "$DRY_RUN" = false ]; then
            mkdir -p "$dir"
            chmod 777 "$dir"  # Permissive for Docker containers
            print_info "Created: $dir"
        else
            print_info "[DRY RUN] Would create: $dir"
        fi
    done
    
    print_success "Directories configured"
}

# ============================================================================
# Configuration Setup
# ============================================================================

generate_secrets() {
    print_step "Generating secure secrets..."
    
    # Generate SECRET_KEY using Python
    local secret_key=$(python3 -c "import secrets; print(secrets.token_urlsafe(48))" 2>/dev/null || \
                      openssl rand -base64 48)
    
    # Generate PostgreSQL password
    local postgres_password=$(openssl rand -hex 32)
    
    # Generate admin shutdown token
    local admin_token=$(openssl rand -hex 32)
    
    # Generate Grafana password
    local grafana_password=$(openssl rand -hex 16)
    
    echo "$secret_key"
    echo "$postgres_password"
    echo "$admin_token"
    echo "$grafana_password"
}

detect_qnap_ip() {
    # Try to detect QNAP IP
    local qnap_ip=$(hostname -I | awk '{print $1}')
    
    if [ -z "$qnap_ip" ]; then
        qnap_ip="192.168.1.100"  # Default fallback
    fi
    
    echo "$qnap_ip"
}

create_env_file() {
    print_step "Creating configuration file..."
    
    local env_file="$PROJECT_ROOT/.env.qnap"
    
    if [ -f "$env_file" ]; then
        print_warning "Configuration file already exists: $env_file"
        if ! confirm "Overwrite existing configuration?"; then
            print_info "Keeping existing configuration"
            return 0
        fi
        
        # Backup existing file
        if [ "$DRY_RUN" = false ]; then
            cp "$env_file" "$env_file.backup.$(date +%Y%m%d_%H%M%S)"
            print_info "Backed up to: $env_file.backup.*"
        fi
    fi
    
    if [ "$DRY_RUN" = false ]; then
        # Generate secrets
        local secrets=($(generate_secrets))
        local secret_key="${secrets[0]}"
        local postgres_password="${secrets[1]}"
        local admin_token="${secrets[2]}"
        local grafana_password="${secrets[3]}"
        
        # Detect QNAP IP
        local qnap_ip=$(detect_qnap_ip)
        
        # Create env file from example
        cp "$PROJECT_ROOT/.env.qnap.example" "$env_file"
        
        # Replace placeholders
        sed -i "s|POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${postgres_password}|" "$env_file"
        sed -i "s|SECRET_KEY=.*|SECRET_KEY=${secret_key}|" "$env_file"
        sed -i "s|ADMIN_SHUTDOWN_TOKEN=.*|ADMIN_SHUTDOWN_TOKEN=${admin_token}|" "$env_file"
        sed -i "s|QNAP_IP=.*|QNAP_IP=${qnap_ip}|" "$env_file"
        sed -i "s|GRAFANA_PASSWORD=.*|GRAFANA_PASSWORD=${grafana_password}|" "$env_file"
        
        print_success "Configuration created: $env_file"
        print_warning "IMPORTANT: Review and update $env_file before deploying"
        print_info "Detected QNAP IP: $qnap_ip (verify this is correct)"
    else
        print_info "[DRY RUN] Would create: $env_file"
    fi
}

# ============================================================================
# Docker Build & Deploy
# ============================================================================

build_images() {
    print_step "Building Docker images..."
    
    if [ "$DRY_RUN" = false ]; then
        cd "$PROJECT_ROOT"
        
        export VERSION="$VERSION"
        export BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
        
        docker compose -f docker-compose.qnap.yml build --no-cache
        
        print_success "Images built successfully"
    else
        print_info "[DRY RUN] Would build Docker images"
    fi
}

deploy_services() {
    print_step "Deploying services..."
    
    if [ "$DRY_RUN" = false ]; then
        cd "$PROJECT_ROOT"
        
        # Start services
        docker compose -f docker-compose.qnap.yml --env-file .env.qnap up -d
        
        # Wait for services to be healthy
        print_info "Waiting for services to start..."
        sleep 10
        
        # Check health
        local max_attempts=30
        local attempt=0
        
        while [ $attempt -lt $max_attempts ]; do
            if curl -f -s http://localhost:8080/health > /dev/null 2>&1; then
                print_success "Services are healthy!"
                break
            fi
            
            attempt=$((attempt + 1))
            echo -n "."
            sleep 2
        done
        
        if [ $attempt -eq $max_attempts ]; then
            print_warning "Health check timeout. Services may still be starting."
            print_info "Check logs: docker compose -f docker-compose.qnap.yml logs -f"
        fi
    else
        print_info "[DRY RUN] Would deploy services"
    fi
}

# ============================================================================
# Post-Installation
# ============================================================================

show_summary() {
    local qnap_ip=$(grep QNAP_IP "$PROJECT_ROOT/.env.qnap" 2>/dev/null | cut -d= -f2 || echo "YOUR_QNAP_IP")
    local sms_port=$(grep SMS_PORT "$PROJECT_ROOT/.env.qnap" 2>/dev/null | cut -d= -f2 || echo "8080")
    
    echo ""
    print_header
    print_success "Installation Complete!"
    echo "=========================================="
    echo ""
    echo "📍 Access URLs:"
    echo "   Application: http://${qnap_ip}:${sms_port}"
    echo "   API Docs:    http://${qnap_ip}:${sms_port}/docs"
    echo "   Control:     http://${qnap_ip}:${sms_port}/control"
    echo ""
    echo "📊 Monitoring (optional, enable with --profile monitoring):"
    echo "   Grafana:     http://${qnap_ip}:3000"
    echo "   Prometheus:  http://${qnap_ip}:9090"
    echo ""
    echo "📂 Data Locations:"
    echo "   Database:    $QNAP_BASE/sms-postgres"
    echo "   Backups:     $QNAP_BASE/sms-backups"
    echo "   Logs:        $QNAP_BASE/sms-logs"
    echo ""
    echo "🔧 Management Commands:"
    echo "   Start:   docker compose -f docker-compose.qnap.yml up -d"
    echo "   Stop:    docker compose -f docker-compose.qnap.yml down"
    echo "   Logs:    docker compose -f docker-compose.qnap.yml logs -f"
    echo "   Status:  docker compose -f docker-compose.qnap.yml ps"
    echo ""
    echo "📘 Next Steps:"
    echo "   1. Verify the application is accessible"
    echo "   2. Review configuration: $PROJECT_ROOT/.env.qnap"
    echo "   3. Set up regular backups: scripts/qnap/manage-qnap.sh"
    echo "   4. Configure QNAP firewall if needed"
    echo "   5. Read documentation: docs/qnap/"
    echo ""
    echo "=========================================="
}

# ============================================================================
# Main Installation Flow
# ============================================================================

parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run)
                DRY_RUN=true
                print_warning "DRY RUN MODE - No changes will be made"
                shift
                ;;
            --skip-checks)
                SKIP_CHECKS=true
                shift
                ;;
            --yes|-y)
                AUTO_YES=true
                shift
                ;;
            --help|-h)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --dry-run      Preview installation without making changes"
                echo "  --skip-checks  Skip environment validation checks"
                echo "  --yes, -y      Automatic yes to prompts"
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
    
    # Pre-flight checks
    if [ "$SKIP_CHECKS" = false ]; then
        check_qnap_environment
        check_docker_version
        check_resources
        check_ports
    else
        print_warning "Skipping pre-flight checks"
    fi
    
    echo ""
    
    # Installation steps
    create_directories
    create_env_file
    
    echo ""
    
    if [ "$DRY_RUN" = false ]; then
        if confirm "Proceed with building and deploying services?" "y"; then
            build_images
            deploy_services
            show_summary
        else
            print_info "Installation cancelled. Configuration preserved."
            print_info "To deploy later, run:"
            print_info "  cd $PROJECT_ROOT"
            print_info "  docker compose -f docker-compose.qnap.yml --env-file .env.qnap up -d"
        fi
    else
        print_info ""
        print_info "[DRY RUN] Installation preview complete"
        print_info "Run without --dry-run to perform actual installation"
    fi
}

# Run main function
main "$@"
