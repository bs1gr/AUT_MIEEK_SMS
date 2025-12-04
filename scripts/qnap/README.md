# QNAP Deployment Scripts

This directory contains scripts for deploying and managing the Student Management System on QNAP NAS devices using Container Station.

## 📋 Scripts Overview

### 🚀 Installation & Setup

#### `install-qnap.sh`
**Purpose**: Automated installation of SMS on QNAP NAS

**Features**:
- QNAP environment detection and validation
- Pre-flight checks (Docker, resources, ports)
- Automatic directory creation
- Secure secret generation
- Docker image building and deployment
- Health check validation

**Usage**:
```bash
# Interactive installation
./install-qnap.sh

# Preview without making changes
./install-qnap.sh --dry-run

# Skip environment checks
./install-qnap.sh --skip-checks

# Automatic yes to all prompts
./install-qnap.sh --yes
```

**Pre-requisites**:
- QNAP NAS with Container Station installed
- Minimum: 4GB RAM, 10GB free disk space
- Docker version 20.10+

---

### 🔧 Management

#### `manage-qnap.sh`
**Purpose**: Interactive menu for managing SMS services

**Features**:
- Service lifecycle (start/stop/restart)
- Log viewing
- Status monitoring
- Database backup/restore
- Monitoring enable/disable
- Update management
- Docker cleanup
- Configuration viewing

**Usage**:
```bash
./manage-qnap.sh
```

**Menu Options**:
1. Start services
2. Stop services
3. Restart services
4. View logs
5. Show status
6. Backup database
7. Restore database
8. Enable monitoring
9. Disable monitoring
10. Update application
11. Docker cleanup
12. View configuration

---

### 🗑️ Uninstallation

#### `uninstall-qnap.sh`
**Purpose**: Safe removal of SMS from QNAP

**Features**:
- Pre-uninstall backup creation
- Container and image removal
- Optional data preservation
- Configuration cleanup

**Usage**:
```bash
# Interactive uninstall
./uninstall-qnap.sh

# Keep all data
./uninstall-qnap.sh --keep-data

# Force without confirmation
./uninstall-qnap.sh --force
```

**What Gets Removed**:
- Docker containers
- Docker images
- Data directories (optional)
- Configuration files

**What's Preserved**:
- Backup directory (always)
- Data directories (with --keep-data)

---

### 🔄 Rollback

#### `rollback-qnap.sh`
**Purpose**: Rollback to previous database state

**Features**:
- Backup selection menu
- Safety backup before rollback
- Database restoration
- Service restart
- Health verification

**Usage**:
```bash
# Interactive backup selection
./rollback-qnap.sh

# Rollback to specific backup
./rollback-qnap.sh --to-backup /share/Container/sms-backups/backup_20251119_120000.sql.gz
```

**When to Use**:
- After failed update
- Data corruption
- Accidental changes
- Testing rollback procedures

---

## 🔐 Security Notes

1. **Secrets**: All scripts generate secure random secrets
2. **Permissions**: Scripts set appropriate file permissions
3. **Backups**: Always encrypted in production
4. **Access**: Scripts check for QNAP-specific security features

## 📁 Directory Structure

Scripts create and manage these QNAP directories:

```text
/share/Container/
├── sms-postgres/        # PostgreSQL database
├── sms-data/            # Application data
├── sms-backups/         # Database backups
├── sms-logs/            # Application logs
└── sms-monitoring/      # Monitoring data (optional)
    ├── prometheus-data/
    └── grafana-data/
```

## 🧪 Testing Scripts

All scripts support dry-run or preview modes:

```bash
# Test installation without changes
./install-qnap.sh --dry-run

# Preview uninstall
./uninstall-qnap.sh --keep-data  # Shows what would be removed
```

## 🔧 Troubleshooting

### Script Won't Execute

```bash
# Make scripts executable
chmod +x scripts/qnap/*.sh
```

### Permission Denied

```bash
# Run as admin or with sudo
sudo ./install-qnap.sh
```

### Port Conflicts

```bash
# Check what's using ports
netstat -tuln | grep -E '8080|3000|9090'

# Edit .env.qnap to use different ports
vi .env.qnap
```

### Docker Not Found

1. Install Container Station from App Center
2. Wait for Docker daemon to start (1-2 minutes)
3. Verify: `docker --version`

## 📖 Related Documentation

- [QNAP Installation Guide](../../docs/qnap/QNAP_INSTALLATION_GUIDE.md)
- [QNAP Configuration Guide](../../docs/qnap/QNAP_CONFIGURATION_GUIDE.md)
- [QNAP Troubleshooting](../../docs/qnap/QNAP_TROUBLESHOOTING.md)
- [Main QNAP Documentation](../../docs/QNAP.md)

## 🆘 Support

If you encounter issues:

1. Check script output for error messages
2. Review logs: `./manage-qnap.sh` → "View logs"
3. Check Docker status: `docker ps`
4. Consult troubleshooting guide
5. Open GitHub issue with error details

## 🔄 Version Compatibility

These scripts are designed for:
- Student Management System v1.9.7+
- QNAP QTS 5.0+ or QuTS hero h5.0+
- Container Station 3.0+
- Docker 20.10+

## 📝 Development

### Adding New Scripts

1. Follow naming convention: `action-qnap.sh`
2. Include help text (`--help` flag)
3. Add dry-run mode where appropriate
4. Update this README
5. Add to main documentation

### Script Structure

```bash
#!/bin/bash
set -e  # Exit on error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Helper functions
print_success() { ... }
print_error() { ... }

# Main logic
main() { ... }

# Run
main "$@"
```

## 🤝 Contributing

Improvements to these scripts are welcome! Please:

1. Test on actual QNAP hardware
2. Maintain backward compatibility
3. Update documentation
4. Follow existing code style
5. Add error handling

---

**Last Updated**: November 19, 2025  
**Branch**: `feature/qnap-deployment`
