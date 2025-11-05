# Deployment Decision Tree

## How to Deploy Student Management System to Windows Computers

```text
START: Do you want to deploy the application?
   │
   ├─→ YES
   │   │
   │   ├─→ QUESTION: Does target computer have internet access?
   │   │   │
   │   │   ├─→ YES (Online Deployment)
   │   │   │   │
   │   │   │   └─→ SIMPLE PATH:
   │   │   │       1. Copy/clone application to target computer
   │   │   │       2. Run INSTALLER.bat
   │   │   │       3. Follow prompts
   │   │   │       4. Done! ✓
   │   │   │
   │   │   └─→ NO (Offline Deployment)
   │   │       │
   │   │       ├─→ Step 1: On computer WITH internet
   │   │       │   - Run CREATE_DEPLOYMENT_PACKAGE.bat
   │   │       │   - Choose option 3 (full with Docker)
   │   │       │   - Wait for package creation
   │   │       │
   │   │       ├─→ Step 2: Transfer
   │   │       │   - Copy deployment-package.zip to USB
   │   │       │   - Or use network share
   │   │       │
   │   │       └─→ Step 3: On target computer
   │   │           - Extract package
   │   │           - Run INSTALLER.bat
   │   │           - Done! ✓
   │   │
   │   └─→ QUESTION: Deploying to multiple computers?
   │       │
   │       ├─→ YES
   │       │   │
   │       │   ├─→ Same network / domain?
   │       │   │   │
   │       │   │   ├─→ YES: Use PowerShell remoting
   │       │   │   │   - Create deployment package once
   │       │   │   │   - Place on network share
   │       │   │   │   - Run script to deploy to all PCs
   │       │   │   │   - See DEPLOYMENT_GUIDE.md § Network Deployment
   │       │   │   │
   │       │   │   └─→ NO: Manual per-computer
   │       │   │       - Create deployment package once
   │       │   │       - Copy to each computer (USB/email/etc)
   │       │   │       - Run INSTALLER.bat on each
   │       │   │
   │       │   └─→ Use DEPLOYMENT_CHECKLIST.md to track progress
   │       │
   │       └─→ NO: Single computer (see above)
   │
   └─→ NO: Exit
```

## Installation Mode Decision

```text
INSTALLER.bat starts...
   │
   ├─→ Checks: Is Docker Desktop installed?
   │   │
   │   ├─→ YES: Is Docker running?
   │   │   │
   │   │   ├─→ YES: ✓ Use Docker Mode (RECOMMENDED)
   │   │   │   - Simplest setup
   │   │   │   - No Python/Node.js needed
   │   │   │   - Consistent environment
   │   │   │
   │   │   └─→ NO: Would you like to start Docker?
   │   │       │
   │   │       ├─→ YES: Start Docker → Use Docker Mode ✓
   │   │       └─→ NO: Fall back to Native Mode
   │   │
   │   └─→ NO: Would you like to install Docker?
   │       │
   │       ├─→ YES: Open download page → Install → Restart → Run installer again
   │       └─→ NO: Fall back to Native Mode
   │
   └─→ Native Mode: Check Python & Node.js
       │
       ├─→ Python 3.11+ installed?
       │   ├─→ YES: ✓
       │   └─→ NO: Install Python (guided)
       │
       ├─→ Node.js 18+ installed?
       │   ├─→ YES: ✓
       │   └─→ NO: Install Node.js (guided)
       │
       └─→ Both installed? → Use Native Mode ✓
```

## Quick Decision Guide

### Choose Your Path

```text
┌─────────────────────────────────────────────────────────────┐
│                     DEPLOYMENT SCENARIOS                     │
└─────────────────────────────────────────────────────────────┘

Scenario A: "I have one computer, it has internet"
   → Easiest: Run INSTALLER.bat
   → Time: 10-15 minutes
   → Downloads: Docker Desktop (~500 MB) or Python/Node.js

Scenario B: "I have one computer, NO internet"
   → Create package elsewhere, copy via USB
   → Time: 5 minutes (after package created)
   → No downloads on target computer

Scenario C: "I have many computers, all have internet"
   → Run INSTALLER.bat on each
   → Or use network share + PowerShell script
   → Time: 10-15 min per computer (or automated)

Scenario D: "I have many computers, NO internet"
   → Create package once with Docker image
   → Copy to all computers (network share or USB)
   → Run INSTALLER.bat on each
   → Time: 5-10 min per computer

Scenario E: "I want full control (manual)"
   → Follow DEPLOYMENT_GUIDE.md § Manual Installation
   → Time: 20-30 minutes
   → Requires technical knowledge
```

## Prerequisites Decision Matrix

```text
╔══════════════════════════════════════════════════════════════╗
║                    WHAT DO YOU NEED?                         ║
╚══════════════════════════════════════════════════════════════╝

Installation Mode: DOCKER (Recommended)
   ✓ Pros: Easiest, no Python/Node.js needed, consistent
   ✗ Cons: Requires Docker Desktop (~500 MB)

   Requirements:
   [✓] Windows 10/11 (64-bit)
   [✓] Docker Desktop
   [✓] 4 GB RAM minimum (8 GB recommended)
   [✓] 10 GB free disk space

   Best for: Most users, offline deployment, multiple computers

Installation Mode: NATIVE (Alternative)
   ✓ Pros: No Docker, lighter weight, full control
   ✗ Cons: Need to install Python + Node.js

   Requirements:
   [✓] Windows 10/11 (64-bit)
   [✓] Python 3.11+
   [✓] Node.js 18+
   [✓] 2 GB RAM minimum (4 GB recommended)
   [✓] 5 GB free disk space

   Best for: Developers, when Docker not available
```

## Troubleshooting Decision Tree

```text
Problem encountered?
   │
   ├─→ "Docker not found"
   │   ├─→ Want to use Docker?
   │   │   └─→ YES: Install Docker Desktop → Restart installer
   │   └─→ NO: Installer will use Native mode
   │
   ├─→ "Docker not running"
   │   └─→ Start Docker Desktop from Start Menu
   │       Wait 1-2 minutes → Retry
   │
   ├─→ "Python not found"
   │   └─→ Install Python 3.11+
   │       ⚠ Check "Add Python to PATH"
   │       Restart PowerShell → Retry
   │
   ├─→ "Node.js not found"
   │   └─→ Install Node.js 18+ LTS
   │       Restart PowerShell → Retry
   │
   ├─→ "Port already in use"
   │   ├─→ Run: .\SMS.ps1 → Diagnostics → Check Port Conflicts
   │   └─→ Stop conflicting application → Retry
   │
   ├─→ "Access Denied"
   │   └─→ Run PowerShell as Administrator → Retry
   │
   └─→ "Other error"
       ├─→ Check error message carefully
       ├─→ Run: .\scripts\internal\DIAGNOSE_STATE.ps1
       ├─→ Check: DEPLOYMENT_GUIDE.md § Troubleshooting
       └─→ Still stuck? Check logs or seek support
```

## Files You Need

```text
For Online Deployment (internet on target):
   📂 The entire application folder
   📄 INSTALLER.bat ← JUST RUN THIS!

For Offline Deployment (no internet on target):
   1️⃣ Create: deployment-package.zip
      (Run CREATE_DEPLOYMENT_PACKAGE.bat)

   2️⃣ Transfer: Copy ZIP to target computer

   3️⃣ Install: Extract → Run INSTALLER.bat

For Manual Deployment (advanced):
   📘 Read: DEPLOYMENT_GUIDE.md
   📋 Follow: Step-by-step instructions
```

## Time Estimates

```text
┌────────────────────────────────────────────────────┐
│                   HOW LONG?                         │
└────────────────────────────────────────────────────┘

Creating deployment package:
   - Basic (code only): 1-2 minutes
   - With Docker image: 5-10 minutes
   - Compressed: +2-5 minutes

First-time installation:
   - With Docker Desktop: 10-15 minutes
   - With Native mode: 15-20 minutes
   - Manual setup: 20-30 minutes

Repeat installations (package ready):
   - Per computer: 5-10 minutes
   - Automated (multiple): 1-2 min per computer

Application startup:
   - Docker mode: 30-60 seconds
   - Native mode: 10-20 seconds
```

## Success Indicators

```text
✓ Installation Successful When:
   [✓] No error messages during install
   [✓] "Installation Complete" message shown
   [✓] Browser opens to http://localhost:8080
   [✓] Frontend loads without errors
   [✓] Can navigate between pages
   [✓] API docs accessible at http://localhost:8000/docs

✓ Application Running When:
   [✓] SMS.ps1 -Status shows "Running"
   [✓] Can access frontend in browser
   [✓] No error messages in logs
   [✓] Can create/view data (students, courses, etc.)

✓ Ready for Daily Use When:
   [✓] User knows how to start: QUICKSTART.bat
   [✓] User knows how to stop: scripts\STOP.ps1
   [✓] User can access application
   [✓] User knows where documentation is
   [✓] User has support contact info
```

## Next Steps After Installation

```text
Installation complete! Now what?

1. Verify Everything Works
   → Access http://localhost:8080
   → Create test student/course
   → Check all features

2. Train the User
   → Show how to start: QUICKSTART.bat
   → Show how to stop: scripts\STOP.ps1
   → Show where documentation is
   → Demonstrate key features

3. Set Up Maintenance
   → Show backup procedure: SMS.ps1 → Backup
   → Schedule regular backups
   → Document troubleshooting steps

4. Provide Support
   → Share contact information
   → Share documentation links
   → Answer any questions

5. Document Installation
   → Fill out DEPLOYMENT_CHECKLIST.md
   → Note computer name, date, version
   → Keep for future reference
```

---

**Pro Tips:**

- 💡 Test on one computer before deploying to many
- 💡 Create deployment package once, use everywhere
- 💡 Keep package on network share for easy access
- 💡 Document any computer-specific issues
- 💡 Take notes during first deployment for reference

**Remember:**

- ✅ Installer handles most issues automatically
- ✅ Clear error messages guide you when issues occur
- ✅ Comprehensive documentation available
- ✅ Can switch between Docker and Native modes
- ✅ Full diagnostic tools included

---

For detailed instructions, see:

- **QUICK_DEPLOYMENT.md** - One-page reference
- **DEPLOYMENT_GUIDE.md** - Complete guide
- **DEPLOYMENT_CHECKLIST.md** - Step-by-step checklist
