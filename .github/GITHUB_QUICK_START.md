# GitHub Deployment Quick Start

## 🚀 5-Minute Setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- Docker & Docker Compose
- PowerShell 7+
- Git

### Step 1: Clone & Setup
```powershell
git clone https://github.com/yourorg/student-management-system.git
cd student-management-system
.\NATIVE.ps1 -Setup
```

### Step 2: Local Development
```powershell
# Start backend + frontend with hot reload
.\NATIVE.ps1 -Start

# In another terminal, run tests
.\COMMIT_READY.ps1 -Quick
```

### Step 3: Create Feature Branch
```powershell
git checkout -b feature/your-feature-name
# Make changes...
git commit -m "feat: your feature"
git push origin feature/your-feature-name
```

### Step 4: Create Pull Request
- Go to GitHub → Create Pull Request
- Pipeline runs automatically (takes ~30-50 min)
- Wait for all checks to pass
- Get 1 approval from team
- Merge!

### Step 5: Release
```powershell
# Update version
echo "2.0.0" > VERSION

# Tag release
git tag -a v2.0.0 -m "Release: version 2.0.0"
git push origin v2.0.0

# Pipeline handles the rest:
# - Builds Docker images
# - Publishes to GHCR
# - Creates GitHub Release
```

## 📋 Pre-Commit Checklist

Before every push:
```powershell
# 1. Validate code
.\COMMIT_READY.ps1 -Quick

# 2. Run tests locally
cd backend && pytest -q
cd ../frontend && npm test -- --run

# 3. Commit
git commit -m "feat: description"
git push origin your-branch
```

## 🔍 Monitoring Pipeline

1. **GitHub Actions Tab** - Watch tests run
2. **Workflow Status** - See which checks passed/failed
3. **Details Link** - Click to see logs
4. **Artifact Downloads** - Get coverage reports, SBOM

## ❌ If Tests Fail

```powershell
# 1. Check error details in GitHub Actions
# 2. Run same test locally to reproduce
cd backend && pytest tests/test_name.py -v

# 3. Fix and push
git add .
git commit --amend --no-edit
git push origin your-branch -f
```

## 🐳 Docker Images

After release, images are available:
```bash
docker pull ghcr.io/yourorg/student-management-system:v2.0.0-build.latest
docker pull ghcr.io/yourorg/student-management-system:latest
```

## 📚 Full Documentation

- **Detailed Pipeline**: `GITHUB_DEPLOYMENT_SUMMARY.md`
- **Workflows**: `.github/workflows/`
- **Git Workflow**: `docs/development/GIT_WORKFLOW.md`
- **Architecture**: `docs/development/ARCHITECTURE.md`

## 💡 Tips

- ✅ Use `COMMIT_READY.ps1 -Quick` before every push (saves CI time)
- ✅ Squash commits before merging (cleaner history)
- ✅ Write clear commit messages (used in releases)
- ✅ Check PR template for required sections
- ✅ Monitor Actions tab while pipeline runs

## 🆘 Common Issues

| Issue | Solution |
|-------|----------|
| Tests pass locally but fail in CI | Check test isolation, use clean DB fixture |
| Docker image build fails | Check Dockerfile, verify dependencies in requirements.txt |
| PR can't merge | Check branch protection rules, run tests locally |
| Release didn't publish | Check GHCR_TOKEN secret, verify tag format (v*) |

---

**Version:** 1.0
**Status:** ✅ Ready
