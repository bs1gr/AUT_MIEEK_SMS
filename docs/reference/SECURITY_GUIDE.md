# 🔒 Security Guide for Public Repository

## ✅ Actions Taken

### Personal Data Removed

- **File**: `templates/students/ΕΓΓΡΑΦΕΣ 2025-26 -AUTO.csv`
- **Status**: Completely removed from git history (all 835 commits rewritten)
- **Method**: git-filter-repo (BFG alternative)
- **Result**: File never existed in repository history

### .gitignore Updated

Added patterns to prevent future accidents:

```gitignore
templates/students/*.csv
*ΕΓΓΡΑΦΕΣ*.csv
*enrollment*.csv
*personal*.csv

```text
---

## 🛡️ Simple Security Measures for Public Repositories

### 1. Never Commit Sensitive Data

**What to NEVER commit:**

- ❌ Student personal information (names, emails, phone numbers)
- ❌ Database credentials (usernames, passwords)
- ❌ API keys and tokens
- ❌ Private keys (SSH, SSL/TLS certificates)
- ❌ OAuth secrets
- ❌ Email server credentials (SMTP passwords)
- ❌ Real `.env` files

**How to protect:**

```bash
# Always use .env.example as template

cp backend/.env.example backend/.env
# Edit .env with real credentials (never commit!)

```text
### 2. Review Before Committing

**Pre-commit checklist:**

```powershell
# Check what you're about to commit

git status
git diff --staged

# Review specific file

git diff --staged path/to/file

# If you see sensitive data, unstage it:

git reset HEAD path/to/sensitive/file

```text
### 3. Use .gitignore Properly

Already protected patterns in your repo:

- ✅ `.env` files (all environment configs)
- ✅ `*.db` (database files)
- ✅ `logs/` (application logs)
- ✅ `backups/` (database backups)
- ✅ `templates/students/*.csv` (personal data)

### 4. Regular Security Scans

**Check for accidentally committed secrets:**

```powershell
# Search for common patterns

git log --all -S "password" --source --all
git log --all -S "secret" --source --all
git log --all -S "api_key" --source --all

# Or use automated tools (already in your workflow)

# See: .github/workflows/secret-guard.yml

```text
### 5. Separate Test Data from Real Data

**Best practices:**

- ✅ Use fake/anonymized data for tests
- ✅ Keep real student data in local-only directories
- ✅ Document which directories contain sensitive data

**Example structure:**

```text
templates/
├── students/
│   ├── ΕΓΓΡΑΦΕΣ*.csv        # ← Real data (gitignored)
│   └── template.csv         # ← Template only (safe to commit)
├── test-data/
│   └── sample_students.csv  # ← Fake data (safe to commit)

```text
### 6. Emergency: If You Accidentally Commit Secrets

**Immediate actions:**

1. **Rotate the exposed secret** (change password/key immediately)
2. **Remove from git history** (what we just did)
3. **Force push** to overwrite remote
4. **Notify collaborators** to re-clone repository

**Command used today:**

```bash
git-filter-repo --invert-paths --path "path/to/secret/file" --force
git remote add origin <url>
git push origin main --force --tags

```text
### 7. GitHub Security Features (Already Enabled)

Your repository already has:

- ✅ **Secret scanning** (via secret-guard.yml workflow)
- ✅ **Dependabot** (dependency security updates)
- ✅ **Code scanning** (via CI/CD workflows)

**Additional recommendations:**

```bash
# Enable GitHub's built-in secret scanning

# Go to: Settings → Security → Code security and analysis
# Enable: "Secret scanning" (free for public repos)

```text
### 8. Environment Variables Best Practices

**Current setup (already secure):**

```bash
# backend/.env.example (safe to commit)

DATABASE_URL=sqlite:///data/student_management.db
SECRET_KEY=change-this-in-production
DEBUG=False

# backend/.env (never committed, gitignored)

DATABASE_URL=sqlite:///data/student_management.db
SECRET_KEY=actual-secret-key-here-32-chars-min
DEBUG=False

```text
**Key principle:**

- ✅ Commit `.env.example` with dummy values
- ❌ Never commit `.env` with real values

### 9. CSV Import Safety

**When importing student data:**

```python
# Good: Use local file that won't be committed

python backend/auto_import_courses.py --file /path/outside/repo/ΕΓΓΡΑΦΕΣ.csv

# Bad: Use file inside templates/students/ (now gitignored)

```text
### 10. Quick Security Audit

Run this monthly:

```powershell
# Check for accidentally tracked sensitive files

git ls-files | Select-String -Pattern "\.env$|password|secret|credential"

# Check .gitignore is working

git status --ignored

# Verify no large files committed

git rev-list --objects --all | `
  git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | `
  Where-Object { $_ -match '^blob' } | `
  Sort-Object { [int]($_ -split '\s+')[2] } -Descending | `
  Select-Object -First 10

```text
---

## 📋 Security Checklist for Public Repos

Before pushing:

- [ ] No `.env` files (only `.env.example`)
- [ ] No database files (`*.db`)
- [ ] No personal CSV files in `templates/students/`
- [ ] No hardcoded passwords in code
- [ ] No API keys in source code
- [ ] No email credentials
- [ ] `.gitignore` is up to date

Monthly maintenance:

- [ ] Review git history for accidents: `git log --oneline | head -20`
- [ ] Check GitHub Security tab for alerts
- [ ] Update dependencies: `npm audit`, `pip-audit`
- [ ] Review collaborator access

---

## 🚨 Current Status

✅ **Repository is now safe:**

- Personal CSV file removed from entire git history
- `.gitignore` updated to prevent future accidents
- Force-pushed cleaned history to GitHub
- No sensitive data exposed in public repository

✅ **Next steps:**

1. Keep using `.env.example` for templates
2. Store real student data outside repository or in gitignored directories
3. Review commits before pushing: `git diff --staged`
4. Enable GitHub's secret scanning in repository settings

---

## 📚 Additional Resources

- [GitHub Security Best Practices](https://docs.github.com/en/code-security/getting-started/securing-your-repository)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [git-filter-repo Documentation](https://github.com/newren/git-filter-repo)
- Your workflows: `.github/workflows/secret-guard.yml`

---

**Last Updated**: May 28, 2026
**Repository**: bs1gr/AUT_MIEEK_SMS (Public)
