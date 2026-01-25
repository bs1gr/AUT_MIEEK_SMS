# Secret Scanning in Pre-Commit Hooks

**Purpose:** Prevent accidental commits of secrets, credentials, or sensitive data by scanning staged files before every commit.

---

## 🛡️ Recommended Tool: pre-commit + truffleHog

### 1. Install pre-commit (if not already used)

- `pip install pre-commit`
- Add `.pre-commit-config.yaml` to project root
- Run `pre-commit install` to activate hooks

### 2. Add truffleHog to Pre-Commit Config

Example `.pre-commit-config.yaml` snippet:

```yaml
repos:
  - repo: https://github.com/trufflesecurity/trufflehog

    rev: $11.14.0  # Use latest stable
    hooks:
      - id: trufflehog

        args: ["--fail", "--max-entropy=4.5"]
        stages: [commit]

```text
### 3. (Optional) Add git-secrets (alternative for PowerShell/Windows)

- See: https://github.com/awslabs/git-secrets

---

## ⚙️ Usage

- On every commit, truffleHog will scan staged files for secrets and block the commit if any are found.
- Review and remediate any findings before committing.

---

## 📋 Checklist

- [ ] Add `.pre-commit-config.yaml` to repo
- [ ] Install pre-commit and truffleHog
- [ ] Run `pre-commit install` on all developer machines
- [ ] Document secret scanning in onboarding and security docs

_Last updated: 2025-12-18_

