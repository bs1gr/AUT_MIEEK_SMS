# CI/CD Troubleshooting Guide

**Purpose:** Quickly diagnose and resolve CI/CD issues  
**Audience:** Developers, DevOps engineers, QA  
**Updated:** 2026-06-07

---

## Quick Diagnosis

### Is the problem in...

**1. Configuration?**
→ Check [Configuration Issues](#configuration-issues)

**2. A specific workflow?**
→ Jump to [Workflow-Specific Issues](#workflow-specific-issues)

**3. The test suite?**
→ Go to [Test Issues](#test-issues)

**4. Deployment?**
→ See [Deployment Issues](#deployment-issues)

**5. Something else?**
→ Check [Other Issues](#other-issues)

---

## Configuration Issues

### Problem: "Secret not found"

**Error:** `CODESIGN_CERT_THUMBPRINT secret is not configured`

**Root cause:** Secret not set in GitHub

**Fix:**
```
1. Settings → Secrets and variables → Actions
2. New repository secret
3. Name: CODESIGN_CERT_THUMBPRINT
4. Value: Your certificate thumbprint (e.g., 2693C1B15C8A8E5E45...)
5. Re-run workflow
```

**Verify:**
```bash
gh secret list | grep CODESIGN
# Should show: CODESIGN_CERT_THUMBPRINT
```

---

### Problem: "VERSION file not found"

**Error:** `VERSION file not found in repository root`

**Root cause:** File missing or wrong path

**Fix:**
```bash
# Check current VERSION
cat VERSION

# Should output: v1.18.24

# If missing, create it
echo "v1.18.24" > VERSION
git add VERSION
git commit -m "fix: Add VERSION file"
git push
```

**Verify:**
```bash
# File should exist with correct format
test -f VERSION && echo "✅ Found"
grep -E "^v[0-9]+\.[0-9]+\.[0-9]+$" VERSION && echo "✅ Valid format"
```

---

### Problem: "Invalid version format"

**Error:** `Invalid version format. Required format: v1.x.x`

**Root cause:** VERSION file has wrong format

**Fix:**
```bash
# Current (wrong)
cat VERSION  # Returns: 1.18.24 (missing 'v')

# Fix
echo "v1.18.24" > VERSION  # Add 'v' prefix
git add VERSION
git commit -m "fix: Correct VERSION format"
git push
```

**Valid formats:**
- ✅ `v1.18.24` (correct)
- ✅ `v1.20.0` (correct)
- ❌ `1.18.24` (missing v)
- ❌ `v1.18` (incomplete)
- ❌ `version 1.18.24` (extra text)

---

### Problem: "Docker push failed: invalid credentials"

**Error:** `Error response from daemon: unauthorized`

**Root cause:** GHCR_TOKEN not set or invalid

**Fix:**
```bash
# Create personal access token
1. GitHub → Settings → Developer settings → Personal access tokens
2. Generate new token (classic)
3. Scope: write:packages, read:packages
4. Copy token value

# Set secret
5. Settings → Secrets and variables → Actions
6. New secret: GHCR_TOKEN
7. Value: [paste token]

# Verify
gh secret list | grep GHCR
```

---

## Workflow-Specific Issues

### Version Verification Job Failing

**Error:** `❌ Critical version inconsistencies found`

**Root cause:** VERSION file doesn't match other version references

**What to check:**
```bash
# 1. Check VERSION file
cat VERSION  # e.g., v1.18.24

# 2. Check package.json
grep '"version"' frontend/package.json  # Should be: "1.18.24" (no v)

# 3. Check other files that might have version
grep -r "1\.18\." . --include="*.py" --include="*.java" --include="*.rs"
```

**Fix:**
```bash
# Ensure all versions are in sync
# VERSION file:        v1.18.24 (with 'v')
# package.json:        1.18.24 (without 'v')
# Other files:         1.18.24 (without 'v')

# If mismatch, update files
sed -i 's/"version": "1.18.23"/"version": "1.18.24"/g' frontend/package.json
echo "v1.18.24" > VERSION
git add VERSION frontend/package.json
git commit -m "fix: Sync version to 1.18.24"
git push
```

---

### Linting Job Failing

#### Backend Linting (Ruff)

**Error:** `E501 Line too long (XXX > 88 characters)`

**Fix:**
```bash
cd src/backend
ruff check . --fix  # Auto-fix what's possible

# For remaining issues, manually break lines
# Before:
def my_function_with_long_name(param1, param2, param3, param4, param5, param6):

# After:
def my_function_with_long_name(
    param1, param2, param3, param4, param5, param6
):
```

#### Frontend Linting (ESLint)

**Error:** `error 'MyComponent' is assigned a value but never used (no-unused-vars)`

**Fix:**
```bash
cd src/frontend
npm run lint -- --fix  # Auto-fix what's possible

# For remaining:
// If unused, remove it
// If intentionally unused, add:
// eslint-disable-next-line no-unused-vars
const MyComponent = () => { ... }
```

---

### Test Job Failing

#### Backend Tests (Pytest)

**Error:** `FAILED tests/test_user.py::test_create_user`

**Debug:**
```bash
# Run test locally
pytest tests/test_user.py::test_create_user -v

# With output
pytest tests/test_user.py::test_create_user -v -s

# With debugging
pytest tests/test_user.py::test_create_user -v --pdb
```

#### Frontend Tests (Vitest)

**Error:** `AssertionError: expected 1 to equal 2`

**Debug:**
```bash
cd src/frontend
npm run test -- --run test/MyComponent.test.ts  # Run one test
npm run test -- --reporter=verbose  # Detailed output
npm run test -- --reporter=html  # HTML report
```

---

### Security Scanning Failing

#### Gitleaks: Secret Found

**Error:** `[SECRET] Github Token detected`

**Fix:**
```bash
# 1. Find the secret in code
git log -p | grep -A5 -B5 "ghp_"

# 2. Remove it from git history
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch <secret>' \
  HEAD

# 3. Force push (careful!)
git push origin main --force

# 4. Rotate the secret in GitHub
# Settings → Developer settings → Personal access tokens
```

#### Trivy: Vulnerability Found

**Error:** `CVE-2024-12345: High severity vulnerability`

**Fix:**
```bash
# 1. Update the vulnerable package
docker/requirements.txt  # Update version

# 2. Rebuild Docker image
docker build -t myapp .

# 3. Re-scan
trivy image myapp

# 4. If unfixable, add to .trivyignore
echo "CVE-2024-12345" >> .trivyignore
```

---

## Test Issues

### E2E Tests Timing Out

**Error:** `Timeout waiting for backend health check`

**Root cause:** Backend not starting in time

**Debug:**
```bash
# 1. Check backend startup
cd src/backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000

# 2. Monitor in another terminal
curl -v http://127.0.0.1:8000/health

# 3. Check for errors in backend logs
# Look for database connection errors
# Look for missing dependencies
```

**Fix:**
```bash
# Increase timeout in e2e-tests.yml
timeout-minutes: 60  # Increase from 30

# Or fix the actual issue (usually database)
# 1. Check DATABASE_URL environment variable
# 2. Verify database is running
# 3. Check migrations completed
```

---

### E2E Tests: Page Not Found

**Error:** `Navigation to http://127.0.0.1:8000/login failed`

**Root cause:** Backend didn't start, or port is wrong

**Debug:**
```bash
# 1. Check if backend is running
curl http://127.0.0.1:8000/health

# 2. Check if frontend is being served
curl http://127.0.0.1:8000/

# 3. Check for port conflicts
lsof -i :8000  # What's using port 8000?
```

**Fix:**
```bash
# Kill any existing processes on port
lsof -i :8000 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Or use a different port
export BACKEND_PORT=8001

# Retry tests
```

---

### Load Tests: Performance Regression

**Error:** `❌ Performance regression detected: baseline 100ms, current 150ms`

**Debug:**
```bash
# 1. Check what changed
git log --oneline -10  # Recent commits

# 2. Profile the endpoint
# Add timing logs
# Run with profiler
python -m cProfile script.py

# 3. Compare baseline
load-testing/baseline.json  # Previous metrics
```

**Fix:**
```bash
# Identify the slow code
# Options:
# 1. Optimize the code
# 2. Update baseline if regression is acceptable
echo '{"endpoint": "/api/users", "p99": 150}' > load-testing/baseline.json
```

---

## Deployment Issues

### Deployment Fails: "Docker not running"

**Error:** `Docker failed to start after 12 attempts`

**Affects:** Windows self-hosted runners (staging/production)

**Fix:**
```powershell
# On the Windows runner machine
1. Start Docker Desktop manually
2. Verify with: docker ps
3. Retry deployment

# Or configure Docker to start automatically
Services → Docker Desktop → Set to Automatic
```

---

### Deployment Fails: "No suitable node found"

**Error:** `No hosts matched in deployment`

**Root cause:** Self-hosted runner offline

**Fix:**
```bash
# Check runner status
1. Settings → Actions → Runners
2. Look for green checkmark
3. If offline, restart runner agent
4. Check runner logs: ~/.actions-runner/_diag

# Restart locally
./run.sh  # On the runner machine
```

---

### Health Check Fails: Service returns 500

**Error:** `❌ Staging health check failed after 20 attempts`

**Debug:**
```bash
# 1. SSH to staging server
ssh staging-server

# 2. Check service status
docker ps
docker logs [container-id]

# 3. Check database
psql -h localhost -U user -d database -c "SELECT version();"

# 4. Check logs
tail -f /var/log/app/app.log
```

**Fix:**
```bash
# Common causes and fixes
# 1. Database not running
docker-compose up db

# 2. Migrations not run
docker exec app alembic upgrade head

# 3. Missing environment variables
docker exec app env | grep DATABASE
# If missing, update .env and restart

# 4. Port conflict
netstat -tulpn | grep :8000  # What's using port?
```

---

## Other Issues

### Pipeline Hangs Without Output

**Error:** Job runs but produces no output for 10+ minutes

**Root cause:** Usually a hang in a subprocess

**Debug:**
```bash
# Check recent workflow
git log --oneline -5

# Look for what changed
git show --stat HEAD

# Run locally with debugging
bash -x scripts/deploy.sh  # Enable debug output
```

**Fix:**
```bash
# Add timeouts
timeout 30s docker pull image:latest  # Kill after 30 seconds

# Add verbose output
set -x  # Bash: show each command
$VerbosePreference = "Continue"  # PowerShell: verbose output

# Reduce subprocess waits
for i in {1..5}; do
  curl -f http://localhost:8000/health && break
  sleep 2
done
```

---

### Permission Denied Error

**Error:** `Permission denied while trying to connect to Docker daemon`

**Root cause:** User not in docker group (Linux)

**Fix:**
```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Apply new group
newgrp docker

# Verify
docker ps  # Should work without sudo
```

---

### Out of Disk Space

**Error:** `No space left on device`

**Root cause:** Build artifacts accumulating

**Fix:**
```bash
# Check disk usage
df -h

# Clean Docker
docker system prune -a --volumes  # Remove unused images/volumes

# Clean artifacts
rm -rf .next build dist coverage

# Clean cache
npm cache clean --force
pip cache purge
```

---

## When All Else Fails

### Emergency Reset

**If nothing works, try a clean slate:**

```bash
# 1. Stash local changes
git stash

# 2. Clean working directory
git clean -fdx  # Remove untracked files

# 3. Reset to remote
git fetch origin
git reset --hard origin/main

# 4. Verify
git status  # Should be clean
```

### Get Help

**If you're stuck:**

1. **Check the logs thoroughly**
   - GitHub Actions → Job → Full output
   - Application logs
   - System logs

2. **Check recent changes**
   ```bash
   git log --oneline -10
   git show HEAD  # What changed?
   ```

3. **Search documentation**
   - CI-CD-AUDIT-FIXES.md
   - CI-CD-QUICK-REFERENCE.md
   - This guide

4. **Ask for help**
   - #devops Slack channel
   - GitHub issue with [help] tag
   - Include: error message, logs, recent changes

---

## Useful Commands

### View Logs

```bash
# GitHub Actions logs
gh run view <run-id> --log

# Docker logs
docker logs <container-id> -f  # Follow output

# Application logs
tail -f /var/log/app/error.log
```

### Debug Environment

```bash
# Check environment variables
env | grep -E "DATABASE|API|TOKEN"  # Show relevant vars
echo $DATABASE_URL  # Check specific variable

# Check file permissions
ls -la config.json
chmod 644 config.json  # Make readable
```

### Monitor Resources

```bash
# CPU and memory
top -b -n 1 | head -20

# Disk space
df -h /

# Network
netstat -tulpn | grep LISTEN
```

---

## Before Escalating

**Confirm you've tried:**

- [ ] Read error message carefully (what does it actually say?)
- [ ] Checked the logs (grep for ERROR, FATAL, exception)
- [ ] Googled the error message
- [ ] Checked this guide
- [ ] Run command locally with `-v` or `--debug` flags
- [ ] Tried a clean checkout
- [ ] Checked if service is running (docker ps, systemctl status)
- [ ] Verified environment variables are set
- [ ] Confirmed secrets are configured

**When asking for help, provide:**

1. **Error message** (full output, not just summary)
2. **Steps to reproduce** (exact commands/actions)
3. **Recent changes** (what changed since last success?)
4. **Environment** (OS, Docker version, Node version, etc.)
5. **Logs** (relevant excerpts, not entire dump)
6. **What you've tried** (what fixes did you attempt?)

---

**Last Updated:** 2026-06-07  
**Next Review:** 2026-09-07 (quarterly)  
**Maintained By:** DevOps Team
