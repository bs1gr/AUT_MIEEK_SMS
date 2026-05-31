# IT Deployment Guide - SMS Native Lite v1.18.24

**Target Audience:** System Administrators, IT Teams, Deployment Engineers  
**Version:** 1.0  
**Date:** May 31, 2026  
**Status:** Ready for Enterprise Deployment

---

## Table of Contents

1. [Overview](#overview)
2. [System Requirements](#system-requirements)
3. [Deployment Scenarios](#deployment-scenarios)
4. [Installation Methods](#installation-methods)
5. [Network Configuration](#network-configuration)
6. [Database Setup](#database-setup)
7. [Security Configuration](#security-configuration)
8. [Monitoring & Support](#monitoring--support)
9. [Troubleshooting](#troubleshooting)

---

## Overview

### What is SMS Native Lite?

SMS Native Lite Simple is a standalone, portable executable version of the Student Management System designed for easy deployment across an organization.

**Key Characteristics:**
- Single executable file (67.1 MB)
- No installation wizard
- No registry modifications
- No system dependencies
- Works on Windows 10+ and Linux
- Portable across machines
- Zero-configuration default

### Deployment Models

| Model | Use Case | Users | Setup Time |
|-------|----------|-------|-----------|
| **Individual** | Single user on one computer | 1 | 2 minutes |
| **Department** | Team on shared network | 5-50 | 15 minutes |
| **Campus-wide** | Entire organization | 100+ | 30 minutes |
| **Distributed** | Remote/branch offices | 50+ | 45 minutes |

---

## System Requirements

### Minimum Requirements
- **OS:** Windows 10 or Ubuntu 18.04+
- **RAM:** 512 MB
- **Storage:** 100 MB free
- **Network:** Local network connectivity
- **Port:** 8000 (HTTP) - must be available

### Recommended Requirements
- **OS:** Windows 11 or Ubuntu 20.04+
- **RAM:** 1-2 GB
- **Storage:** 500 MB free (for future data)
- **Network:** Fast local network (1 Gbps+)
- **Port:** 8000 with low latency

### Network Requirements

**For HTTP Server:**
```
Source: User Machine
Destination: Server Machine Port 8000
Protocol: HTTP/1.1
Maximum Users: 10-20 concurrent
```

**For Database (Optional QNAP):**
```
Source: User Machine
Destination: QNAP Server Port 5432
Protocol: PostgreSQL
Authentication: Database credentials
```

---

## Deployment Scenarios

### Scenario 1: Individual User Deployment

**Time:** 5 minutes  
**Complexity:** Trivial  
**Prerequisites:** Nothing

**Steps:**

1. **Download executable**
   ```
   Download: SMS_Native_Lite_Simple.exe (67.1 MB)
   Location: Company download server or email
   ```

2. **Place file**
   ```
   Suggested: C:\Users\[username]\Downloads\
   Alternative: D:\Applications\SMS_Lite\
   Network: \\shared-server\apps\sms-lite\
   ```

3. **Create shortcut (optional)**
   ```
   Right-click exe → Send to → Desktop (Create Shortcut)
   Edit properties → Set custom icon
   Edit properties → Pin to taskbar
   ```

4. **Run**
   ```
   Double-click SMS_Native_Lite_Simple.exe
   Wait 8-10 seconds
   Browser opens automatically
   Login with admin@sms-lite.app / AdminPassword123!
   ```

**User Instructions:**
- Email users the exe download link
- Include quick start guide (1 page)
- No IT intervention required
- Support: User can just delete and re-download

---

### Scenario 2: Department Network Deployment

**Time:** 15 minutes  
**Complexity:** Low  
**Prerequisites:** Network share access

**Steps:**

1. **Create shared folder**
   ```
   Network Path: \\sms-server\SMS_Lite\
   Permissions: Read-only for users
   Backup: Daily backup of share
   ```

2. **Copy executable**
   ```
   Copy SMS_Native_Lite_Simple.exe to \\sms-server\SMS_Lite\
   Verify file integrity (checksum: SHA256)
   Create version marker file
   ```

3. **Distribute access**
   ```
   Email download link: \\sms-server\SMS_Lite\SMS_Native_Lite_Simple.exe
   Include shortcut creation instructions
   Include quick start guide
   ```

4. **Monitor usage**
   ```
   Track download counts
   Monitor port 8000 usage
   Collect user feedback
   ```

**Group Policy (Optional):**
```
For centralized deployment on Windows domain:
  Computer Config\Administrative Templates\...
  Deploy via SCCM/Intune
  Create desktop shortcut automatically
  Restrict to approved users
```

---

### Scenario 3: Campus-Wide Deployment

**Time:** 30-45 minutes  
**Complexity:** Medium  
**Prerequisites:** System distribution tools

**Steps:**

1. **Prepare distribution**
   ```
   Hardware requirement analysis
   Network capacity planning
   Load balancing setup (optional)
   Database configuration (if QNAP)
   ```

2. **Deploy via system tools**
   ```
   Windows: SCCM / Intune / GPO
   Linux: APT / Yum repositories
   Mac: Homebrew (if supported)
   ```

3. **Configuration management**
   ```
   Create default config files
   Push via configuration service
   Centralize logging
   Monitor installations
   ```

4. **Database setup**
   ```
   Option A: Local SQLite (default, no config)
   Option B: Centralized QNAP PostgreSQL
          - Create qnap-credentials.json
          - Distribute via configuration service
          - Test connectivity
   ```

5. **Communication plan**
   ```
   Week 1: Announcement email
   Week 1: IT training sessions
   Week 2: Soft launch (early adopters)
   Week 3: Full rollout
   Week 4: Support & feedback
   ```

---

### Scenario 4: Remote/Distributed Deployment

**Time:** 45+ minutes  
**Complexity:** High  
**Prerequisites:** VPN, remote support tools

**Steps:**

1. **Infrastructure setup**
   ```
   Central QNAP PostgreSQL server
   VPN access from remote sites
   Network bandwidth verification
   Latency testing
   ```

2. **Distribution method**
   ```
   Cloud storage: Google Drive, OneDrive, AWS S3
   Package managers: Update servers
   Manual: Email or local delivery
   Deployment automation: PowerShell, Ansible
   ```

3. **Local database setup**
   ```
   Each location gets local SQLite
   OR
   All locations use central PostgreSQL
   Data synchronization (if needed)
   ```

4. **Support structure**
   ```
   Tier 1: Local IT at each site
   Tier 2: Central IT support
   Remote session tools: TeamViewer, RDP
   Knowledge base articles
   ```

---

## Installation Methods

### Method 1: Direct Download

**Best for:** Individual users, small teams

```
1. Download from company server
2. Save to desktop or documents
3. Double-click to run
4. Done!
```

**Pros:**
- Simple, no IT involvement
- User controls installation timing
- Easy rollback (just delete)

**Cons:**
- Manual for each user
- Version control difficult
- Update management manual

---

### Method 2: Network Share

**Best for:** Department deployments

```
\\sms-server\SMS_Lite\SMS_Native_Lite_Simple.exe
```

**Setup:**
```powershell
# Create network share
New-Item -Path "\\sms-server\SMS_Lite" -ItemType Directory -Force
Copy-Item "SMS_Native_Lite_Simple.exe" "\\sms-server\SMS_Lite\"
```

**User Access:**
```powershell
# Map network drive
net use Z: \\sms-server\SMS_Lite

# Run from network
Z:\SMS_Native_Lite_Simple.exe
```

**Pros:**
- Centralized file management
- Version control
- Easy to update (just replace exe)

**Cons:**
- Network dependency
- Requires network access
- Slower startup from network

---

### Method 3: Group Policy / SCCM / Intune

**Best for:** Large organizations, domain-managed

```
SCCM Package Setup:
  Package: SMS_Native_Lite_Simple.exe
  Program: SMS_Native_Lite_Simple.exe
  Distribution: All workstations
  Schedule: Deployment phase
```

**Intune PowerShell Script:**
```powershell
$url = "https://company.com/download/SMS_Native_Lite_Simple.exe"
$path = "C:\Program Files\SMS_Lite\"
Invoke-WebRequest -Uri $url -OutFile "$path\SMS_Native_Lite_Simple.exe"
```

**Pros:**
- Fully automated
- Centralized control
- Version management
- Security policy integration

**Cons:**
- Requires infrastructure
- Complex initial setup
- IT team required

---

### Method 4: Cloud Storage

**Best for:** Remote/distributed teams

```
Google Drive / OneDrive Share Link:
  Public: https://drive.google.com/file/d/...
  Restricted: Internal company only
  Versioning: Automatic backup
```

**S3 Bucket:**
```bash
aws s3 cp SMS_Native_Lite_Simple.exe s3://company-apps/sms-lite/
aws s3 presign s3://company-apps/sms-lite/SMS_Native_Lite_Simple.exe
```

**Pros:**
- Accessible from anywhere
- Automatic backups
- Version history
- Easy link distribution

**Cons:**
- Internet required
- Storage costs
- Bandwidth usage

---

## Network Configuration

### Port Requirements

**Primary Port:**
```
Port: 8000 (HTTP)
Protocol: TCP
Direction: Inbound
Source: Local network (0.0.0.0 or restricted subnet)
Required: YES (application-critical)
```

**Port Verification:**
```powershell
# Windows - Check if port is available
netstat -ano | findstr :8000

# Windows - Check for blocking firewall
Get-NetFirewallRule -DisplayName "*8000*"

# Linux - Check port
netstat -tlnp | grep 8000
```

### Firewall Configuration

**Windows Firewall (Allow):**
```powershell
# Create rule
New-NetFirewallRule -DisplayName "SMS Lite HTTP" `
  -Direction Inbound -Action Allow `
  -Protocol TCP -LocalPort 8000

# Verify
Get-NetFirewallRule -DisplayName "SMS Lite HTTP"
```

**Linux iptables:**
```bash
# Allow port 8000
sudo iptables -A INPUT -p tcp --dport 8000 -j ACCEPT

# Persist (Ubuntu)
sudo ufw allow 8000/tcp
```

### Network Share Access

**SMB Configuration:**
```
Protocol: SMB3
Port: 445
Encryption: Required
Authentication: Domain or Local

Example UNC Path:
\\file-server\SMS_Lite\SMS_Native_Lite_Simple.exe
```

---

## Database Setup

### Option A: Local SQLite (Default)

**Configuration:** None required

**Location:**
```
Windows: %LOCALAPPDATA%\SMS_Native_Lite_Simple\sms_lite.db
Linux:   ~/.local/share/SMS_Native_Lite_Simple/sms_lite.db
```

**Backup:**
```powershell
# Backup local database
Copy-Item "$env:LOCALAPPDATA\SMS_Native_Lite_Simple\sms_lite.db" `
  "D:\Backups\SMS_Lite_backup_$(Get-Date -Format yyyyMMdd).db"
```

**Restore:**
```powershell
# Restore from backup
Remove-Item "$env:LOCALAPPDATA\SMS_Native_Lite_Simple\sms_lite.db"
Copy-Item "D:\Backups\SMS_Lite_backup_20260531.db" `
  "$env:LOCALAPPDATA\SMS_Native_Lite_Simple\sms_lite.db"
# Restart application
```

### Option B: QNAP PostgreSQL (Centralized)

**Requirements:**
- QNAP server running PostgreSQL
- Network access to QNAP (port 5432)
- Database credentials
- User account on database

**Configuration File:**
```json
// Location: local-secrets/qnap-credentials.json
{
  "host": "qnap.company.local",
  "port": 5432,
  "dbname": "student_management",
  "user": "sms_user",
  "password": "secure_password_here",
  "sslmode": "disable"
}
```

**Distribution:**
```powershell
# Create secrets folder
$SecretsPath = "$env:LOCALAPPDATA\SMS_Native_Lite_Simple\local-secrets"
New-Item -ItemType Directory -Force -Path $SecretsPath

# Copy credentials file
Copy-Item "qnap-credentials.json" "$SecretsPath\"

# Secure file permissions
icacls "$SecretsPath\qnap-credentials.json" /inheritance:r
icacls "$SecretsPath\qnap-credentials.json" /grant:r "$env:USERNAME`:(F)"
```

**Testing Connection:**
```powershell
# Test QNAP connectivity
Test-NetConnection -ComputerName qnap.company.local -Port 5432

# Test from application
Run SMS_Native_Lite_Simple.exe
Check debug log: %LOCALAPPDATA%\SMS_Native_Lite_Simple\debug.log
```

---

## Security Configuration

### Credential Management

**QNAP Credentials - Best Practices:**
```
1. Store in secure location (not in git)
2. Encrypt file on disk (Windows: BitLocker, Linux: LUKS)
3. Restrict file permissions (owner read-only)
4. Rotate credentials annually
5. Audit access logs
6. Never share via email
```

**Password Policy:**
```
Default Admin Password: AdminPassword123!
Action: CHANGE ON FIRST LOGIN
Recommendations:
  - Minimum 12 characters
  - Mix of upper, lower, numbers, symbols
  - No dictionary words
  - No user information
```

### Network Security

**Firewall Rules:**
```
Application Port: 8000 (HTTP only)
Scope: Internal network only
Recommendation: Behind reverse proxy for HTTPS
Alternative: Use stunnel or nginx for SSL/TLS
```

**VPN/Proxy Configuration:**
```
For remote access over internet:
  1. Setup reverse proxy (nginx, Apache)
  2. Enable SSL/TLS encryption
  3. Implement authentication layer
  4. Use VPN for additional security
  5. Monitor access logs
```

---

## Monitoring & Support

### Health Checks

**Automated Monitoring:**
```powershell
# Check if application is running
$running = Get-Process | Where-Object {$_.Name -like "*SMS*"}
if ($running) { Write-Host "SMS Lite is running" }
else { Write-Host "SMS Lite is NOT running - restart required" }

# Check port availability
Test-NetConnection -ComputerName localhost -Port 8000
```

**Manual Verification:**
```
1. Open http://127.0.0.1:8000 in browser
2. Check if login page loads
3. Attempt test login
4. Review debug logs for errors
5. Check system resources (Task Manager)
```

### Log Files

**Location:**
```
%LOCALAPPDATA%\SMS_Native_Lite_Simple\
├── debug.log (startup & runtime logs)
├── migrations.log (database schema changes)
└── sms_lite.db (database file)
```

**Log Review:**
```powershell
# View recent logs
Get-Content "$env:LOCALAPPDATA\SMS_Native_Lite_Simple\debug.log" -Tail 50

# Search for errors
Select-String -Path "$env:LOCALAPPDATA\SMS_Native_Lite_Simple\debug.log" -Pattern "ERROR|error"
```

### Support Escalation

**Tier 1 - User Self-Service:**
- Check quick start guide
- Review troubleshooting section
- Clear cache/restart application
- Verify system requirements

**Tier 2 - Local IT Support:**
- Collect debug logs
- Check network connectivity
- Verify port 8000 availability
- Restart application
- Check firewall rules

**Tier 3 - Central IT/Development:**
- Remote support session
- Database diagnostics
- Network analysis
- Configuration review
- Code-level debugging

---

## Troubleshooting

### Common Issues & Solutions

**Issue: Browser doesn't open automatically**

```
Solution:
  1. Check if server started: http://127.0.0.1:8000
  2. Manual browser: Open Chrome/Firefox and navigate to URL
  3. Check debug log for errors
  4. Verify webbrowser module not blocked
```

**Issue: Port 8000 already in use**

```
PowerShell:
  # Find what's using port 8000
  netstat -ano | findstr :8000
  
  # Kill the process
  taskkill /PID <PID> /F
  
  # Restart SMS Lite
```

**Issue: Cannot connect to QNAP database**

```
Checklist:
  1. Verify QNAP server is running: ping qnap.company.local
  2. Check network connectivity: Test-NetConnection -Port 5432
  3. Verify credentials are correct: qnap-credentials.json
  4. Check firewall: netstat -ano | findstr 5432
  5. Review logs: Check debug.log for connection errors
```

**Issue: Application crashes on startup**

```
Steps:
  1. Check debug log: %LOCALAPPDATA%\SMS_Native_Lite_Simple\debug.log
  2. Verify system requirements: RAM, storage, OS version
  3. Check port 8000 availability
  4. Delete corrupted database and restart
  5. Reinstall: Delete and redownload exe
```

**Issue: Slow performance**

```
Optimization:
  1. Check system resources: Task Manager
  2. Verify network bandwidth
  3. Check if multiple users on same machine
  4. Review database: SQLite vs PostgreSQL performance
  5. Consider dedicated machine for higher load
```

---

## Maintenance

### Regular Tasks

**Daily:**
- Monitor error logs
- Check user feedback
- Verify port availability

**Weekly:**
- Backup databases (if using local SQLite)
- Review performance metrics
- Check for update availability

**Monthly:**
- Audit access logs
- Update documentation
- Assess capacity needs
- Collect usage statistics

### Updates & Patches

**Checking for Updates:**
```powershell
# Compare versions
$current = "1.18.24"
$latest = (Invoke-WebRequest "https://company.com/versions.txt").Content

if ($latest -gt $current) {
  Write-Host "New version available: $latest"
}
```

**Installation:**
```powershell
# Backup current version
Copy-Item "SMS_Native_Lite_Simple.exe" "SMS_Native_Lite_Simple_v1.18.24.exe"

# Download new version
Invoke-WebRequest -Uri "https://company.com/SMS_Native_Lite_Simple.exe" `
  -OutFile "SMS_Native_Lite_Simple.exe"

# Restart application
```

---

## Appendix

### Useful Commands

**Windows PowerShell:**
```powershell
# Kill all SMS processes
Stop-Process -Name SMS_Native_Lite* -Force

# Check application is running
Get-Process | Where-Object {$_.Name -like "SMS*"}

# Monitor resource usage
Get-Process -Name SMS_Native_Lite* | 
  Format-Table Name,CPU,Memory

# Create network share
New-SmbShare -Name SMS_Lite `
  -Path "C:\Apps\SMS_Lite" `
  -FullAccess Everyone
```

**Linux Bash:**
```bash
# Kill process
pkill -f SMS_Native_Lite

# Check port
netstat -tlnp | grep 8000

# Monitor resources
top -p $(pgrep -f SMS_Native_Lite)

# Create directory with permissions
mkdir -p /opt/sms-lite
chmod 755 /opt/sms-lite
```

### Contact & Escalation

**For Deployment Questions:**
- IT Systems Admin
- Software Licensing Team
- Network Infrastructure Team

**For Technical Issues:**
- Application Support Team
- Development Team (if critical)
- QNAP Administrator (if database issues)

---

**Document Status:** ✅ Ready for Production  
**Last Updated:** 2026-05-31  
**Version:** 1.0  
**Classification:** Internal Use

---

*SMS Native Lite v1.18.24 - IT Deployment Guide*
