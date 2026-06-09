# GitHub Configuration & Workflows

This directory contains all GitHub-specific configurations, workflows, and instructions for the SMS (Student Management System) project.

## Directory Structure

`
.github/
├── agents/                    # AI Agent definitions
│   ├── debug.agent.md        # Debugging assistant
│   ├── research.agent.md     # Research assistant
│   └── spec.agent.md         # Specification assistant
│
├── instructions/             # Development instructions
│   ├── code-review.instructions.md       # Code review guidelines
│   ├── git-message.instructions.md       # Git commit message standards
│   └── test-generation.instructions.md   # Test generation guidelines
│
├── prompts/                  # AI prompts for various tasks
│   ├── code-review.prompt.md # Code review prompt
│   ├── commit.prompt.md      # Commit message prompt
│   └── reflect.prompt.md     # Reflection prompt
│
├── pull_request_template/    # PR template resources
│   └── (templates for different scenarios)
│
├── workflows/                # GitHub Actions workflows
│   ├── archive/             # Archived workflows (reference)
│   ├── *.yml files          # Active CI/CD workflows
│   ├── README.md            # Workflow documentation
│   ├── ORGANIZATION.md      # Workflow organization guide
│   ├── MAINTENANCE.md       # Maintenance procedures
│   └── (other workflow docs)
│
├── release-drafts/          # Release draft templates
│
├── BRANCH_PROTECTION.md     # Branch protection policies
├── SECURITY.md              # Security policy
├── copilot-instructions.md  # GitHub Copilot instructions
├── GITHUB_QUICK_START.md    # Quick start guide
├── MAINTENANCE_QUICK_REFERENCE.md  # Maintenance reference
├── PULL_REQUEST_TEMPLATE.md # Main PR template
├── WORKSPACE_STATE.md       # Workspace state documentation
└── README.md                # This file

`

## Quick Navigation

### For Developers
- **Writing Code:** See [instructions/code-review.instructions.md](instructions/code-review.instructions.md)
- **Git Commits:** See [instructions/git-message.instructions.md](instructions/git-message.instructions.md)
- **Writing Tests:** See [instructions/test-generation.instructions.md](instructions/test-generation.instructions.md)
- **Creating PRs:** See [PULL_REQUEST_TEMPLATE.md](PULL_REQUEST_TEMPLATE.md)

### For Maintainers
- **Branch Protection:** See [BRANCH_PROTECTION.md](BRANCH_PROTECTION.md)
- **Workflow Organization:** See [workflows/ORGANIZATION.md](workflows/ORGANIZATION.md)
- **Maintenance:** See [workflows/MAINTENANCE.md](workflows/MAINTENANCE.md)
- **Quick Reference:** See [MAINTENANCE_QUICK_REFERENCE.md](MAINTENANCE_QUICK_REFERENCE.md)

### For Security
- **Security Policy:** See [SECURITY.md](SECURITY.md)
- **Security Alerts:** Check GitHub Security tab

### For Copilot Users
- **Copilot Setup:** See [copilot-instructions.md](copilot-instructions.md)

## Key Files by Purpose

### CI/CD & Automation
- workflows/ — GitHub Actions workflows for testing, building, deploying
- workflows/ORGANIZATION.md — How workflows are organized
- workflows/MAINTENANCE.md — Maintenance workflow documentation

### Code Quality
- instructions/code-review.instructions.md — Code review standards
- instructions/test-generation.instructions.md — Test requirements
- prompts/code-review.prompt.md — Code review prompts

### Git & Commits
- instructions/git-message.instructions.md — Commit message format
- prompts/commit.prompt.md — Commit message prompts

### Pull Requests
- PULL_REQUEST_TEMPLATE.md — Main PR template
- pull_request_template/ — Additional templates
- BRANCH_PROTECTION.md — Branch protection rules

### Project Setup
- GITHUB_QUICK_START.md — Getting started guide
- copilot-instructions.md — Copilot configuration
- WORKSPACE_STATE.md — Current workspace state

## Configuration Status

| Item | Status | Notes |
|------|--------|-------|
| Branch Protection | ✅ Configured | See BRANCH_PROTECTION.md |
| CI/CD Workflows | ✅ Active | Multiple workflows automated |
| Security Policy | ✅ Defined | See SECURITY.md |
| PR Template | ✅ Active | Main template in use |
| Copilot Integration | ✅ Configured | See copilot-instructions.md |
| Code Review | ✅ Guidelines | See instructions/code-review.instructions.md |

## Workflow Status

### Active Workflows
- ✅ Pull request validation
- ✅ Automated testing
- ✅ Code quality checks
- ✅ Security scanning
- ✅ Build & deployment

### Workflow Documentation
See workflows/ directory for:
- Detailed workflow descriptions
- Organization strategy
- Maintenance procedures
- Performance metrics

## Common Tasks

### Creating a Pull Request
1. Create feature branch: git checkout -b feature/description
2. Make changes and commit: Follow [instructions/git-message.instructions.md](instructions/git-message.instructions.md)
3. Push to remote: git push origin feature/description
4. Open PR and fill template
5. Address review feedback
6. Merge when approved

### Running Tests Locally
`ash
# Backend tests
pytest

# Frontend tests
npm test

# E2E tests
npx playwright test
`

### Debugging Issues
See [agents/debug.agent.md](agents/debug.agent.md) for debugging assistant guidance.

## Important Notes

- **Branch Protection:** main branch is protected. All changes require PR review.
- **Security:** Check [SECURITY.md](SECURITY.md) before any security-related changes.
- **Compliance:** Follow [instructions/](instructions/) for code quality standards.
- **Release:** See workflows/ for release procedures.

## Support

For questions about:
- **Workflows:** Check workflows/README.md
- **Security:** Check SECURITY.md
- **Development:** Check instructions/ directory
- **Getting Started:** Check GITHUB_QUICK_START.md

## Last Updated

Created: 2026-06-09  
Status: ✅ Complete & Current

---

**For questions:** Refer to the appropriate documentation file above or check the GitHub wiki.
