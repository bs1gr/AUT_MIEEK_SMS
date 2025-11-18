#!/usr/bin/env bash
#
# OnOff.sh - Cross-platform container toggle script
# Checks if Docker containers are running and starts/stops accordingly
# Works on macOS, Linux, and WSL
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Helper functions
info() { echo -e "${CYAN}$1${NC}"; }
success() { echo -e "${GREEN}$1${NC}"; }
error() { echo -e "${RED}$1${NC}"; }
warning() { echo -e "${YELLOW}$1${NC}"; }

# Check if Docker is installed and running
check_docker() {
    if ! command -v docker &> /dev/null; then
        error "❌ Docker is not installed!"
        exit 1
    fi

    if ! docker info &> /dev/null; then
        error "❌ Docker is not running!"
        warning "Please start Docker and try again."
        exit 1
    fi
}

# Check if containers are running
check_containers_running() {
    local running
    running=$(docker-compose ps --services --filter "status=running" 2>/dev/null || echo "")

    if [ -n "$running" ]; then
        return 0  # Running
    else
        return 1  # Not running
    fi
}

# Main logic
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  Student Management System - Container Toggle (OnOff)    ${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Check Docker availability
info "Checking Docker availability..."
check_docker
success "✓ Docker is running"
echo ""

# Check container status
info "Checking container status..."

if check_containers_running; then
    warning "⚠ Containers are currently RUNNING"
    echo ""
    read -p "Do you want to STOP the containers? (y/N): " response

    if [[ "$response" =~ ^[Yy]$ ]]; then
        info "Stopping containers..."
        docker-compose down

        echo ""
        success "✓ Containers stopped successfully!"
    else
        info "Operation cancelled. Containers remain running."
    fi
else
    success "✓ Containers are currently STOPPED"
    echo ""
    read -p "Do you want to START the containers? (Y/n): " response

    if [[ ! "$response" =~ ^[Nn]$ ]]; then
        info "Starting containers..."
        docker-compose up -d

        echo ""
        success "✓ Containers started successfully!"
        echo ""
        info "Access the application at:"
        echo -e "${YELLOW}  Frontend: http://localhost:5173${NC}"
        echo -e "${YELLOW}  Backend:  http://localhost:8000${NC}"
    else
        info "Operation cancelled. Containers remain stopped."
    fi
fi

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo ""
