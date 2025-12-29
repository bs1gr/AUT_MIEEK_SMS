# Automated CVE, Dependency, and License Scanning

**Purpose:** Ensure continuous monitoring for vulnerabilities and license compliance in all dependencies.

---

## 🛡️ Recommended Tools & Setup

### 1. GitHub Dependabot (Recommended)
- **Enables:** Automated PRs for vulnerable/outdated dependencies (npm, pip, GitHub Actions)
- **Setup:**
  1. Add a `.github/dependabot.yml` file (see below)
  2. Enable Dependabot alerts in repository settings
  3. Review and merge PRs as needed

### 2. npm audit (Frontend)
- **Command:** `npm audit --production`
- **CI Integration:** Add to frontend CI pipeline for every push/PR

### 3. pip-audit (Backend)
- **Command:** `pip-audit`
- **CI Integration:** Add to backend CI pipeline for every push/PR

### 4. License Checker
- **npm:** `npx license-checker --production --json`
- **pip:** `pip-licenses`
- **Purpose:** Ensure all dependencies have approved licenses

---

## ⚙️ Example: .github/dependabot.yml

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/frontend"
    schedule:
      interval: "weekly"
  - package-ecosystem: "pip"
    directory: "/backend"
    schedule:
      interval: "weekly"
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```

---

## 📋 Monitoring & Response
- Review Dependabot PRs and alerts weekly
- Address critical/high vulnerabilities immediately
- Document actions in security audit log
- Review license reports quarterly

_Last updated: 2025-12-18_
