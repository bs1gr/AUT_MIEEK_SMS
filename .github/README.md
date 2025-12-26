# GitHub Configuration

This directory contains all GitHub-specific configuration for the Student Management System project.

## 📁 Directory Structure

```
.github/
├── workflows/              # 21 GitHub Actions workflows
│   ├── ci-cd-pipeline.yml             # ⭐ Main CI/CD pipeline
│   ├── docker-publish.yml             # ⭐ Docker image publishing
│   ├── release-on-tag.yml             # ⭐ Release automation
│   ├── commit-ready-cleanup-smoke.yml # Pre-commit validation
│   ├── codeql.yml                     # Code security scanning
│   ├── dependency-review.yml          # Dependency security
│   ├── e2e-tests.yml                  # End-to-end testing
│   ├── quickstart-validation.yml      # Onboarding validation
│   ├── doc-audit.yml                  # Documentation checks
│   ├── markdown-lint.yml              # Markdown validation
│   ├── apply-branch-protection.yml    # Branch rule enforcement
│   ├── operator-approval.yml          # Multi-approval gates
│   ├── labeler.yml                    # Auto issue labeling
│   ├── stale.yml                      # Stale issue handling
│   ├── dependabot-auto.yml            # Dependency updates
│   ├── backend-deps.yml               # Backend dependencies
│   ├── frontend-deps.yml              # Frontend dependencies
│   ├── native-setup-smoke.yml         # Native dev validation
│   ├── native-deepclean-safety.yml    # Cleanup safety
│   ├── commit-ready-smoke.yml         # Smoke testing
│   └── archive-legacy-releases.yml    # Release archival
├── CODEOWNERS             # Team responsibility assignment
├── GITHUB_QUICK_START.md  # 5-minute quick start guide
└── README.md              # This file

📄 Root-level related:
├── GITHUB_DEPLOYMENT_SETUP_COMPLETE.md    # Setup completion guide
├── GITHUB_DEPLOYMENT_SUMMARY.md            # Detailed configuration
├── COMMIT_READY.ps1                       # Pre-commit validation
├── DOCKER.ps1                             # Docker deployment
├── NATIVE.ps1                             # Native development
└── VERSION                                # Current version
```

## 🚀 Quick Start

### 5-Minute Setup
See `GITHUB_QUICK_START.md` for quick reference.

### Full Documentation
See `GITHUB_DEPLOYMENT_SUMMARY.md` for complete details.

### Setup Completion Guide
See `GITHUB_DEPLOYMENT_SETUP_COMPLETE.md` for verification steps.

## 🔄 CI/CD Pipeline

### Main Pipeline (`ci-cd-pipeline.yml`) ⭐
Runs on: Push to main, Pull Requests, Release tags

**Stages:**
1. Setup (Python, Node.js, cache)
2. Validation (type check, lint, format)
3. Testing (pytest, vitest, smoke tests)
4. Security (CodeQL, dependency review)
5. Build (Docker images)
6. Publish (GHCR, release)

**Duration:** ~30-50 minutes

### Docker Publishing (`docker-publish.yml`) ⭐
Runs on: Successful ci-cd-pipeline on main branch

**Actions:**
- Build backend Docker image
- Build frontend Docker image
- Scan for vulnerabilities
- Push to GHCR (ghcr.io)
- Generate SBOM

**Tags:**
- `latest` - Latest stable build
- `v{VERSION}-build.{BUILD_NUMBER}` - Specific build

### Release Automation (`release-on-tag.yml`) ⭐
Runs on: Tag push matching `v*` pattern

**Actions:**
- Create GitHub Release
- Generate release notes from commits
- Build final Docker images
- Publish Docker images
- Upload artifacts

## 🔐 Security Workflows

### CodeQL (`codeql.yml`)
Continuous code vulnerability scanning using SAST analysis.

- Triggers on: Push, Pull requests
- Languages: Python, JavaScript/TypeScript
- Severity levels: Critical, High, Medium
- Reports in: Security tab → Code scanning

### Dependency Review (`dependency-review.yml`)
Prevents PRs with risky or vulnerable dependencies.

- Triggers on: Pull requests
- Checks: License compatibility, known vulnerabilities
- Blocks merge: If high-risk found
- Reports in: PR checks

### Dependabot Auto (`dependabot-auto.yml`)
Automated dependency updates with auto-approval.

- Triggers daily
- Checks: Python, Node.js, Docker, GitHub Actions
- Approves: Patch and minor versions
- Requires review: Major versions

## 📋 Quality Gates

### Commit Ready (`commit-ready-cleanup-smoke.yml`)
Pre-commit validation and cleanup.

- Code formatting (black, prettier)
- Import organization (isort, eslint)
- Type checking (mypy)
- Linting (ruff, eslint)
- Smoke tests (pytest, vitest)

**Run locally:** `.\COMMIT_READY.ps1 -Quick`

### Doc Audit (`doc-audit.yml`)
Documentation completeness verification.

- Checks required docs exist
- Validates markdown format
- Verifies code examples
- Checks cross-references

### Markdown Lint (`markdown-lint.yml`)
Markdown format validation.

- Rule enforcement
- Link validation
- Code block checking
- Line length verification

## 🔧 Operational Workflows

### Branch Protection (`apply-branch-protection.yml`)
Enforces branch protection rules.

- Main branch rules:
  - Require 1 PR review
  - Require status checks pass
  - Require branch up to date
  - Auto-delete head branches

### Multi-Approval Gate (`operator-approval.yml`)
Requires multiple approvals for sensitive changes.

- Triggers on: PR to main
- Requires: 2 approvals (configurable)
- Blocks: Merge until satisfied

### Auto Labeler (`labeler.yml`)
Automatically labels issues and PRs.

- By file changes
- By PR size
- By issue template
- By commit message

### Stale Issue Management (`stale.yml`)
Automatically closes stale issues.

- Inactivity period: 30 days
- Reminder period: 14 days
- Labels: `stale`, `no-response`
- Excludes: Pinned, labeled `keep-alive`

## 📊 Dependency Management

### Backend Dependencies (`backend-deps.yml`)
Python package management.

- Runs: Weekly, on demand
- Checks: requirements.txt, constraints.txt
- Updates: Creates PRs for updates
- Approval: Auto-approved for patches

### Frontend Dependencies (`frontend-deps.yml`)
Node.js package management.

- Runs: Weekly, on demand
- Checks: package.json, package-lock.json
- Updates: Creates PRs for updates
- Approval: Auto-approved for patches

## 🧪 Testing Workflows

### E2E Tests (`e2e-tests.yml`)
End-to-end application testing.

- Runs: Manual trigger, releases
- Steps:
  1. Start Docker container
  2. Wait for application ready
  3. Run Playwright tests
  4. Generate report
  5. Cleanup

- Duration: ~15-20 minutes

### Quickstart Validation (`quickstart-validation.yml`)
New developer onboarding validation.

- Runs: Manual trigger, on demand
- Tests:
  1. Clone repository
  2. Run setup script
  3. Start application
  4. Run smoke tests
  5. Verify health endpoints

## 🏗️ Development Workflows

### Native Setup Smoke (`native-setup-smoke.yml`)
Validates native development environment.

- Runs: On demand, release
- Tests:
  1. Install dependencies
  2. Start backend
  3. Start frontend
  4. Run pytest
  5. Run vitest

### Native Deepclean Safety (`native-deepclean-safety.yml`)
Safe native environment cleanup.

- Runs: On demand
- Actions:
  1. Kill running processes
  2. Clean node_modules
  3. Clean Python cache
  4. Verify safety

## 📦 Release Management

### Archive Legacy Releases (`archive-legacy-releases.yml`)
Archives old releases.

- Runs: Nightly
- Actions:
  1. List releases
  2. Archive pre-v1.8.0
  3. Mark as deprecated
  4. Add notice in description

## 🔐 Team Assignment

See `CODEOWNERS` file for:
- Code review requirements
- Team assignments
- Required reviewers per area

## 🛠️ Local Validation

Before committing, run:

```powershell
# Quick validation (2-3 min)
.\COMMIT_READY.ps1 -Quick

# Standard validation (5-8 min)
.\COMMIT_READY.ps1 -Standard

# Full validation (15-20 min)
.\COMMIT_READY.ps1 -Full
```

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| `GITHUB_QUICK_START.md` | 5-minute developer reference |
| `GITHUB_DEPLOYMENT_SUMMARY.md` | Complete setup & pipeline details |
| `GITHUB_DEPLOYMENT_SETUP_COMPLETE.md` | Setup verification guide |
| `docs/development/GIT_WORKFLOW.md` | Git conventions & branching |
| `docs/development/ARCHITECTURE.md` | System architecture |
| `.github/workflows/*/` | Individual workflow documentation |

## ✅ Setup Checklist

For admins setting up the repository:

- [ ] Configure GitHub Secrets
  - [ ] `GHCR_TOKEN` - Container registry token
  - [ ] `REGISTRY_USERNAME` - GitHub username
- [ ] Enable Branch Protection (main)
  - [ ] Require PR review
  - [ ] Require status checks
  - [ ] Require branches up to date
- [ ] Enable CodeQL (Security tab)
- [ ] Enable Dependabot (Security tab)
- [ ] Configure CODEOWNERS
- [ ] Set notification preferences

## 🆘 Troubleshooting

### Pipeline Not Triggering
1. Check `.github/workflows/` files exist
2. Verify workflow YAML syntax
3. Check branch protection rules
4. Verify GitHub Actions enabled in repo settings

### Tests Failing in Pipeline
1. Review error logs in Actions tab
2. Reproduce locally: `.\COMMIT_READY.ps1 -Full`
3. Check environment differences
4. Verify dependencies up to date

### Docker Build Failing
1. Check Dockerfile syntax
2. Verify dependencies in requirements.txt
3. Check Docker image size limits
4. Review build logs for specific errors

### Release Not Publishing
1. Verify tag format matches `v*`
2. Check GHCR_TOKEN secret configured
3. Review docker-publish.yml logs
4. Verify image build succeeded

## 📞 Support

- **Documentation**: See GITHUB_DEPLOYMENT_SUMMARY.md
- **Quick Help**: See GITHUB_QUICK_START.md
- **Workflow Issues**: Check specific .yml file
- **GitHub Actions Logs**: Actions tab → Select workflow → View logs

## 🎯 Key Metrics

| Metric | Value |
|--------|-------|
| Total Workflows | 21 |
| Pipeline Duration | 30-50 min |
| Parallel Jobs | 6+ |
| Test Coverage Target | >80% |
| Security Scans | 2 (CodeQL, Dependencies) |
| Artifact Retention | 90 days |

---

**Configuration Version:** 1.0
**Last Updated:** 2025-01-08
**Status:** ✅ Production Ready

See `GITHUB_DEPLOYMENT_SETUP_COMPLETE.md` for setup verification and next steps.
