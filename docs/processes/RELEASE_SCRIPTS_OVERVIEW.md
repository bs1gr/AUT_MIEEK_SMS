# Release Scripts Overview

**Last Updated**: March 12, 2026
**Purpose**: Clarify the current purpose and relationship between active release-related scripts

---

## 📋 Script Inventory

### 1. RELEASE_READY.ps1 ⭐ **PRIMARY ORCHESTRATOR**

**Purpose**: Primary policy-aligned release orchestrator
**Current Status**: Active and authoritative
**Scope**: End-to-end release validation, tagging, installer workflow trigger, and release execution

**What it does**:
1. Runs release validation and version checks
2. Updates version references
3. Coordinates installer build/verification flow
4. Runs workspace/release preparation steps
5. Tags the release and triggers GitHub Actions release workflows

**Use when**: You are performing the standard production release path

**Command**:

```powershell
.\RELEASE_READY.ps1 -ReleaseVersion "1.18.12" -TagRelease

```text
---

### 2. RELEASE_WITH_DOCS.ps1 ⭐ **ALTERNATIVE WRAPPER**

**Purpose**: Convenience wrapper around release-doc generation plus `RELEASE_READY.ps1`
**Current Status**: Active, but secondary to `RELEASE_READY.ps1`
**Scope**: Combined documentation generation + release execution workflow

**What it does**:
1. Organizes documentation/cleanup pre-steps
2. Generates release documentation (`GENERATE_RELEASE_DOCS.ps1`)
3. Optionally commits documentation changes
4. Delegates final release execution to `RELEASE_READY.ps1`

**Use when**: You specifically want the combined wrapper workflow instead of running `RELEASE_READY.ps1` directly

**Command**:

```powershell
.\RELEASE_WITH_DOCS.ps1 -ReleaseVersion "1.18.12" -Mode Quick

```text
---

### 3. ~~RELEASE_PREPARATION.ps1~~ (DEPRECATED)

**⚠️ DEPRECATED**: Archived Feb 13, 2026 - **Use `RELEASE_READY.ps1` instead**

This script is no longer part of the active release surface.

- **Historical role**: pre-release validation before consolidation
- **Current replacement**: `RELEASE_READY.ps1`
- **Where to look if needed**: this document plus `docs/RELEASE_PROCEDURE_MANDATORY.md`; consult the historical deprecation notice only when auditing archive-era references

**Operator guidance**: do not follow old `RELEASE_PREPARATION.ps1` commands from historical docs; use the canonical current release flow instead:

```powershell
.\RELEASE_READY.ps1 -ReleaseVersion "1.18.12" -TagRelease
```

---

### 4. GENERATE_RELEASE_DOCS.ps1

**Purpose**: Automatic documentation generation from git commits
**Scope**: Release notes and changelog creation

**What it does**:
- Analyzes git commits since last release tag
- Generates `RELEASE_NOTES_v{version}.md`
- Updates `CHANGELOG.md` with new entries
- Creates `GITHUB_RELEASE_v{version}.md` template

**Use when**: You need to generate release documentation from git history

**Command**:

```powershell
.\GENERATE_RELEASE_DOCS.ps1 -Version "1.16.0"

```text
---

### 5. RELEASE_HELPER.ps1 ⭐ **FALLBACK / MANUAL HELPER**

**Purpose**: Manual/fallback release helper utilities
**Current Status**: Active helper, not the primary release path
**Scope**: Validation, GitHub release interaction, convenience actions

**What it does**:
- Validates release readiness
- Copies release body to clipboard (manual workflow)
- Opens GitHub Release UI
- Can create/update GitHub Release via `gh` when needed
- Updates existing GitHub Releases
- Helps create GitHub Issues from templates

**Use when**:
- Automation needs manual assistance or fallback actions
- Code is already tagged/released and you need GitHub UI or CLI assistance
- You need helper actions outside the main orchestrator flow

**Commands**:

```powershell
# Manual workflow

.\RELEASE_HELPER.ps1 -Action ValidateRelease
.\RELEASE_HELPER.ps1 -Action OpenGitHub
.\RELEASE_HELPER.ps1 -Action CopyRelease

# Automated workflow (NEW - Jan 6, 2026)

.\RELEASE_HELPER.ps1 -Action CreateRelease
.\RELEASE_HELPER.ps1 -Action CreateRelease -Tag v1.18.12

```text
---

## 🎯 Complete Release Workflows

### Workflow A: Primary policy-aligned release workflow (Recommended)

**Use Case**: Standard release from corrected lineage

```powershell
# Primary release command

.\RELEASE_READY.ps1 -ReleaseVersion "1.18.12" -TagRelease

# What happens:

# 1. Validates release readiness ✅
# 2. Coordinates version/release preparation ✅
# 3. Tags the release ✅
# 4. Triggers GitHub Actions release workflows ✅

```text
**Timeline**: Depends on installer/release workflow completion

---

### Workflow B: Wrapper-assisted release flow

**Use Case**: You want docs generation + release execution in one wrapper

```powershell
.\RELEASE_WITH_DOCS.ps1 -ReleaseVersion "1.18.12" -Mode Quick

```text
**Note**: This remains an alternative convenience path, not the policy-primary one.

---

### Workflow C: Manual/fallback helper actions

**Use Case**: GitHub release interaction or recovery-oriented helper tasks

```powershell
.\RELEASE_HELPER.ps1 -Action ValidateRelease
.\RELEASE_HELPER.ps1 -Action OpenGitHub
.\RELEASE_HELPER.ps1 -Action CreateRelease -Tag v1.18.12

```text
---

## 🔄 Differences Between Scripts

| Feature | RELEASE_READY.ps1 | RELEASE_WITH_DOCS.ps1 | RELEASE_HELPER.ps1 |
|---------|-------------------|-----------------------|--------------------|
| **Purpose** | Primary release orchestration | Convenience wrapper | Manual/fallback helper |
| **Scope** | Validation → tag/workflows | Docs + delegated release | GitHub/helper actions |
| **When to use** | Standard release path | Optional combined wrapper | Recovery/manual assistance |
| **Validates code** | ✅ Yes | ✅ Via delegated flow | ⚠️ Limited helper validation |
| **Generates docs** | ⚠️ Indirect workflow support | ✅ Yes | ❌ No |
| **Creates git tag** | ✅ Yes | ✅ Via delegated flow | ❌ No |
| **Triggers release workflows** | ✅ Yes | ✅ Via delegated flow | ❌ No |
| **Creates/updates GitHub Release UI** | ❌ Workflow-driven | ❌ Not primary responsibility | ✅ Yes |
| **Interactive** | ❌ No | ❌ No | ✅ Yes |
| **Status** | ✅ Primary | ✅ Active alternative | ✅ Active fallback |

---

## 📖 Quick Reference

### I want to...

**Run the standard release path**: `.\RELEASE_READY.ps1 -ReleaseVersion "1.18.12" -TagRelease`

**Run the combined wrapper flow**: `.\RELEASE_WITH_DOCS.ps1 -ReleaseVersion "1.18.12" -Mode Quick`

**Generate release notes/docs only**: `.\GENERATE_RELEASE_DOCS.ps1 -Version "1.18.12"`

**Create/update GitHub Release manually**: `.\RELEASE_HELPER.ps1 -Action CreateRelease -Tag v1.18.12`

**Create Phase 2 issues**: `.\RELEASE_HELPER.ps1 -Action CopyIssue`

---

## 🎯 Recommended Workflow for current releases

```powershell
# 1. Standard primary path

.\RELEASE_READY.ps1 -ReleaseVersion "1.18.12" -TagRelease

# Optional: if you specifically want docs generation wrapped in the same command
# .\RELEASE_WITH_DOCS.ps1 -ReleaseVersion "1.18.12" -Mode Quick

# Optional fallback/helper actions

.\RELEASE_HELPER.ps1 -Action ValidateRelease
.\RELEASE_HELPER.ps1 -Action CreateRelease -Tag v1.18.12

# Done! 🎉

```text
**Note**: Prefer the script-based release workflow documented in policy docs and `.github/copilot-instructions.md`.

---

## 🤖 Agent Guidance (Enforce This Order)

When automating releases, always follow this sequence and avoid duplicating logic:

1. **Primary orchestrator**: `RELEASE_READY.ps1`
   - This is the current primary release method

2. **Documentation generation when needed**: `GENERATE_RELEASE_DOCS.ps1`
   - Use directly or via `RELEASE_WITH_DOCS.ps1`

3. **Alternative wrapper**: `RELEASE_WITH_DOCS.ps1`
   - Valid convenience wrapper, but not the policy-primary path

4. **Fallback/manual helper**: `RELEASE_HELPER.ps1`
   - Use only for helper/recovery/manual GitHub release actions

Agents must not invent new release scripts when these existing roles already cover the workflow.

---

**See Also**:
- [Release Checklist Template](../releases/RELEASE_CHECKLIST_$11.18.3.md)
- [GitHub Release Template](../releases/GITHUB_RELEASE_$11.18.3.md)
- [Phase 2 Issues](../releases/GITHUB_ISSUES_PHASE2.md)
