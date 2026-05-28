# GitHub Actions Workflow Triggers Guide

**Last Updated:** May 28, 2026

---

## Quick Reference

### 1. Manual Trigger (One-Click via GitHub UI)
Go to: `GitHub → Actions → Select Workflow → Run Workflow`

### 2. Command Line Trigger (CLI)
```bash
gh workflow run <workflow-name> --ref main
```

### 3. Scheduled Triggers (Automatic)
All three new workflows run on schedules. See schedule section below.

---

## How to Trigger Each Workflow

## NEW WORKFLOWS (With Cleanup & Organization)

### 1. Orchestrated Maintenance Workflow

**File:** `.github/workflows/orchestrated-maintenance.yml`

#### Option A: Schedule (Automatic - Daily)
- **Time:** 2 AM UTC every day
- **What it does:** Cleanup runs, artifacts, stale items, verify security
- **No action needed** - runs automatically

#### Option B: Manual Trigger via CLI
```bash
# Minimal cleanup
gh workflow run orchestrated-maintenance.yml --ref main

# With cleanup level input
gh workflow run orchestrated-maintenance.yml \
  -f cleanup_level=standard \
  --ref main
```

#### Option C: Manual Trigger via GitHub UI
1. Go to: https://github.com/bs1gr/AUT_MIEEK_SMS/actions
2. Find: "Orchestrated Maintenance & Cleanup"
3. Click: "Run workflow"
4. Select cleanup level: `minimal`, `standard`, or `aggressive`
5. Click: "Run workflow"

#### Option D: PowerShell (From Project)
```powershell
cd d:\SMS\student-management-system
gh workflow run orchestrated-maintenance.yml --ref main
```

#### What Gets Cleaned Up
- Workflow runs older than 30 days
- Artifacts older than 14 days
- Stale issues/PRs
- Verifies branch protection
- Audits dependencies
- Validates documentation

---

### 2. Documentation Organization Workflow

**File:** `.github/workflows/docs-organization.yml`

#### Option A: Schedule (Automatic - Weekly)
- **Time:** 6 AM UTC every Monday
- **What it does:** Organize docs, archive old ones, validate links
- **No action needed** - runs automatically

#### Option B: Manual Trigger via CLI
```bash
gh workflow run docs-organization.yml --ref main
```

#### Option C: Manual Trigger via GitHub UI
1. Go to: https://github.com/bs1gr/AUT_MIEEK_SMS/actions
2. Find: "Documentation Organization & Cleanup"
3. Click: "Run workflow"
4. Click: "Run workflow"

#### Option D: PowerShell
```powershell
cd d:\SMS\student-management-system
gh workflow run docs-organization.yml --ref main
```

#### What Gets Organized
- Generates documentation index
- Archives docs older than 6 months
- Creates table of contents
- Detects orphaned documentation
- Validates documentation links
- Checks metadata completeness

---

### 3. Codebase Cleanup Workflow

**File:** `.github/workflows/codebase-cleanup.yml`

#### Option A: Schedule (Automatic - Weekly)
- **Time:** 3 AM UTC every Wednesday
- **What it does:** Code analysis, detect dead code, check structure
- **No action needed** - runs automatically

#### Option B: Manual Trigger via CLI
```bash
gh workflow run codebase-cleanup.yml --ref main
```

#### Option C: Manual Trigger via GitHub UI
1. Go to: https://github.com/bs1gr/AUT_MIEEK_SMS/actions
2. Find: "Codebase Cleanup & Organization"
3. Click: "Run workflow"
4. Click: "Run workflow"

#### Option D: PowerShell
```powershell
cd d:\SMS\student-management-system
gh workflow run codebase-cleanup.yml --ref main
```

#### What Gets Analyzed
- Backend code quality (ruff, pylint, mypy)
- Frontend code quality
- Dead code detection (vulture)
- Large files (>10MB)
- Duplicate files
- Backend/Frontend structure verification
- Module imports validation

---

## EXISTING KEY WORKFLOWS

### Main CI/CD Pipeline

**File:** `.github/workflows/ci-cd-pipeline.yml`

#### Manual Trigger
```bash
gh workflow run ci-cd-pipeline.yml --ref main
```

#### Or via UI
1. GitHub → Actions → "CI/CD Pipeline - Student Management System"
2. "Run workflow" button
3. Deploy environment: `staging` or `production` (optional)
4. Run workflow

#### What It Does
- Version validation
- Linting (backend & frontend)
- Tests (pytest, vitest)
- Security scans (CodeQL, Trivy)
- Build Docker images
- Deploy to staging/production (if configured)

---

### CodeQL Security Analysis

**File:** `.github/workflows/codeql.yml`

#### Manual Trigger
```bash
gh workflow run codeql.yml --ref main
```

#### Schedule
- Runs on pull requests automatically
- Can be manually triggered any time

---

### Trivy Vulnerability Scan

**File:** `.github/workflows/trivy-scan.yml`

#### Manual Trigger
```bash
gh workflow run trivy-scan.yml --ref main
```

#### What It Does
- Scans Docker images for vulnerabilities
- Generates SARIF reports
- Uploads to GitHub Security tab

---

### Backend & Frontend Dependency Audits

#### Backend Dependencies
```bash
gh workflow run backend-deps.yml --ref main
```

#### Frontend Dependencies
```bash
gh workflow run frontend-deps.yml --ref main
```

---

### Cleanup Workflow Runs (Legacy - Now in Orchestrated)

**File:** `.github/workflows/cleanup-workflow-runs.yml`

```bash
gh workflow run cleanup-workflow-runs.yml --ref main
```

---

### Cleanup Deployments

**File:** `.github/workflows/cleanup-deployments.yml`

```bash
gh workflow run cleanup-deployments.yml --ref main
```

---

## Complete Workflow Schedule

```
┌─────────────────────────────────────────────────────────┐
│           GITHUB ACTIONS SCHEDULE REFERENCE             │
└─────────────────────────────────────────────────────────┘

TIME (UTC)    DAY           WORKFLOW
────────────────────────────────────────────────────────────
2:00 AM       Every Day     Orchestrated Maintenance
              (Daily)       ├─ Cleanup runs (>30 days)
                           ├─ Cleanup artifacts (>14 days)
                           ├─ Stale issues/PRs
                           ├─ Security audits
                           └─ Reports generated

6:00 AM       Every Monday  Documentation Organization
              (Weekly)      ├─ Generate index
                           ├─ Archive old docs (>6 months)
                           ├─ Validate links
                           └─ Reports generated

3:00 AM       Every Wed     Codebase Cleanup
              (Weekly)      ├─ Code quality analysis
                           ├─ Dead code detection
                           ├─ Structure verification
                           └─ Reports generated

On-Demand     Any Time      Manual Triggers Available:
                           ├─ CI/CD Pipeline
                           ├─ CodeQL Security
                           ├─ Trivy Scan
                           ├─ Dependency Audits
                           └─ All other workflows
```

---

## Monitoring Workflow Status

### Via GitHub UI
1. Go to: https://github.com/bs1gr/AUT_MIEEK_SMS/actions
2. See all workflows and their status
3. Click any workflow to see details
4. View logs, artifacts, and timing

### Via CLI
```bash
# List recent workflow runs
gh run list --repo bs1gr/AUT_MIEEK_SMS --limit 10

# View specific workflow run
gh run view <RUN_ID>

# Monitor in real-time (requires watch tool)
watch -n 5 'gh run list --repo bs1gr/AUT_MIEEK_SMS --limit 5'
```

### Via PowerShell
```powershell
# List workflows
gh workflow list

# Get recent runs
gh run list --repo bs1gr/AUT_MIEEK_SMS --limit 10

# Check specific run status
gh run view 26563059656
```

---

## View Reports & Artifacts

### Via GitHub UI
1. Go to: https://github.com/bs1gr/AUT_MIEEK_SMS/actions
2. Click on a completed workflow run
3. Scroll to "Artifacts" section
4. Download any report file

### Via CLI
```bash
# List artifacts from a run
gh run view <RUN_ID> --json artifacts

# Download artifact
gh run download <RUN_ID> -n <ARTIFACT_NAME>
```

### Available Reports (30-day retention)
- `maintenance-summary` - Cleanup summary
- `docs-organization-report` - Documentation status
- `codebase-cleanup-report` - Code quality findings
- `dead-code-report` - Unused code detected
- `large-files-report` - Files >10MB

---

## Bulk Trigger All Workflows

### Option 1: Trigger Main Workflows (PowerShell)
```powershell
cd d:\SMS\student-management-system

# Trigger new cleanup workflows
gh workflow run orchestrated-maintenance.yml --ref main
gh workflow run docs-organization.yml --ref main
gh workflow run codebase-cleanup.yml --ref main

# Trigger key existing workflows
gh workflow run ci-cd-pipeline.yml --ref main
gh workflow run codeql.yml --ref main
gh workflow run trivy-scan.yml --ref main
```

### Option 2: Trigger All (Script)
```bash
#!/bin/bash
WORKFLOWS=(
  "orchestrated-maintenance.yml"
  "docs-organization.yml"
  "codebase-cleanup.yml"
  "ci-cd-pipeline.yml"
  "codeql.yml"
  "trivy-scan.yml"
  "backend-deps.yml"
  "frontend-deps.yml"
)

for workflow in "${WORKFLOWS[@]}"; do
  echo "Triggering: $workflow"
  gh workflow run "$workflow" --ref main
  sleep 2  # Brief delay between triggers
done
```

---

## Automation Settings

### Current Schedules (UTC)
All schedules use UTC time. To convert to your timezone:
- UTC-5 (EST): Subtract 5 hours
- UTC-7 (MST): Subtract 7 hours
- UTC+1 (CET): Add 1 hour
- UTC+8 (Singapore): Add 8 hours

### Modify Schedule
Edit the workflow files and update the `schedule` section:
```yaml
on:
  schedule:
    - cron: '0 2 * * *'  # Change these numbers
```

Cron format: `minute hour day-of-month month day-of-week`

Examples:
- `0 9 * * *` = 9 AM every day
- `0 3 * * 0` = 3 AM every Sunday
- `*/30 * * * *` = Every 30 minutes
- `0 0 1 * *` = Midnight on 1st of month

---

## Workflow Dependencies & Order

```
CI/CD Pipeline (Main)
├─ Version validation
├─ Linting
│  └─ Passed? → Continue
├─ Tests
│  └─ Passed? → Continue
├─ Security Scans (CodeQL, Trivy)
│  └─ Passed? → Continue
└─ Build & Deploy
   └─ Docker images
      └─ Staging/Production

Orchestrated Maintenance (Daily)
├─ Cleanup runs
├─ Cleanup artifacts
├─ Stale processing
├─ Branch protection
├─ Dependencies audit
├─ Docs validation
├─ Security audit
└─ Generate report

Documentation Org (Weekly - Monday)
├─ Index generation
├─ Legacy doc archival
├─ TOC creation
├─ Link validation
└─ Generate report

Codebase Cleanup (Weekly - Wednesday)
├─ Code quality analysis
├─ Dead code detection
├─ Large files identification
├─ Structure verification
└─ Generate report
```

---

## Troubleshooting

### Workflow Not Running on Schedule
1. Check if workflow file is valid YAML
2. Verify cron syntax is correct
3. Ensure workflow has `on: schedule:` section
4. Wait for next scheduled time
5. Can manually trigger meanwhile

### Workflow Run Fails
1. Check logs in GitHub UI
2. See "Annotations" for issues
3. Fix underlying issue
4. Re-trigger workflow manually

### Need to Skip a Scheduled Run
Edit workflow file and comment out schedule:
```yaml
# on:
#   schedule:
#     - cron: '0 2 * * *'
```

Re-enable when ready.

---

## Best Practices

✅ **Do:**
- Review workflow logs after runs
- Monitor artifact generation
- Check reports regularly
- Keep schedules UTC-aligned
- Document any custom schedules

❌ **Don't:**
- Modify workflows without testing locally first
- Trigger all workflows simultaneously (use staggered times)
- Ignore workflow failures
- Delete older runs without reviewing artifacts
- Set cron to `:00` minute mark (causes load spikes)

---

## Quick Command Reference

```bash
# List all workflows
gh workflow list

# Run a workflow
gh workflow run <workflow-file.yml> --ref main

# List recent runs
gh run list

# View run details
gh run view <RUN_ID>

# Download artifact
gh run download <RUN_ID> -n <ARTIFACT_NAME>

# Check workflow status
gh run list --workflow=<workflow-file.yml> --limit 1

# Watch runs
gh run list --watch
```

---

## Support & Debugging

**For issues with workflows:**
1. Check GitHub Actions logs
2. Review workflow file YAML syntax
3. Verify cron expression (crontab.guru)
4. Check branch name matches
5. Ensure file exists in `.github/workflows/`

**Documentation:**
- GitHub Actions Docs: https://docs.github.com/en/actions
- Cron Syntax: https://crontab.guru
- Workflow Syntax: https://docs.github.com/en/actions/using-workflows

---

**Status:** ✅ All workflows operational and triggerable
**Last Review:** 2026-05-28
