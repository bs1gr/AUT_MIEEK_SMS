## What's New in v1.8.8

### GitHub Actions Admin Password Rotation Guide

This release adds comprehensive documentation for automating admin credential rotation using GitHub Actions and the `DEFAULT_ADMIN_AUTO_RESET` feature.

### Added

- **Comprehensive GitHub Actions Admin Password Rotation Guide**
  - New dedicated documentation: `docs/deployment/GITHUB_ACTIONS_ADMIN_PASSWORD_ROTATION.md`
  - Complete workflow examples for secure password rotation using GitHub Secrets
  - Integration patterns for AWS Secrets Manager and HashiCorp Vault
  - Security best practices and troubleshooting guidance
  - Ready-to-use workflow templates for basic, scheduled, and multi-environment rotation

### Documentation Improvements

- Enhanced `README.md` with clearer documentation about admin password rotation capabilities
- Improved inline documentation in `backend/admin_bootstrap.py` for `DEFAULT_ADMIN_AUTO_RESET`
- Added workflow examples for CI/CD and secret-manager driven credential updates
- Included comprehensive security best practices and FAQ section

### Changed

- Updated version references to 1.8.8 in README.md and backend/main.py
- Updated CHANGELOG.md with detailed v1.8.8 release notes

### Technical Details

- **All tests passing:** 52/52 tests ✅
- **Files changed:** 4 files (+792 insertions, -13 deletions)
- **New documentation:** ~800+ lines of comprehensive guides and examples

### Key Features

The new guide provides:
- ✅ Quick start templates for immediate use
- ✅ Scheduled monthly rotation workflows
- ✅ Multi-environment deployment patterns
- ✅ Integration with major secret management platforms
- ✅ Comprehensive troubleshooting and FAQ sections
- ✅ Security best practices and password generation examples

### Links

- 📖 [GitHub Actions Admin Password Rotation Guide](https://github.com/bs1gr/AUT_MIEEK_SMS/blob/main/docs/deployment/GITHUB_ACTIONS_ADMIN_PASSWORD_ROTATION.md)
- 📝 [Full CHANGELOG](https://github.com/bs1gr/AUT_MIEEK_SMS/blob/main/CHANGELOG.md#188---2025-11-23)
- 🐛 [Report Issues](https://github.com/bs1gr/AUT_MIEEK_SMS/issues)

---

**Full Changelog**: https://github.com/bs1gr/AUT_MIEEK_SMS/compare/v1.8.7...v1.8.8

🤖 Generated with [Claude Code](https://claude.com/claude-code)
