# v1.18.23 - Infrastructure & Documentation Consolidation

**Release Date**: May 2026  
**Type**: Maintenance release  
**Status**: Production-ready

---

## 🎉 Highlights

- ✅ GitHub Actions upgraded for Node.js 24 compatibility
- ✅ CI/CD workflow improvements and error handling
- ✅ Documentation organization and indexing
- ✅ Workflow monitoring and orchestration enhancements
- ✅ Analytics export feature restoration with RBAC fixes

---

## ✨ What's Included

### CI/CD & Infrastructure
- Upgraded GitHub Actions workflows to Node.js 24-compatible versions
- Added proper error handling across critical workflow steps
- Improved workflow orchestration with automated cleanup jobs
- Enhanced documentation organization and indexing
- Added workflow triggers and scheduling guide

### Analytics & Features
- Fixed nested APIResponse wrapper unwrapping with regression tests
- Restored analytics export functionality with proper RBAC permissions
- Improved multi-language support for PDF/Excel exports with Greek diacritical characters
- Added timezone support to analytics exports
- Enhanced language parameter handling in export endpoints

### Documentation
- Created comprehensive workflow triggers and scheduling guide
- Added workflow orchestration and automation report
- Reorganized deployment documentation into docs folder
- Created main documentation index with permission matrix
- Updated stale documentation with current dates

### Bug Fixes
- Fixed Python process cleanup in Native mode
- Corrected gh (GitHub CLI) availability guards
- Fixed workflow jq filtering in cleanup operations
- Improved font registration robustness for PDF generation
- Enhanced error handling in CI/CD pipelines

### Dependencies
- Updated @babel/plugin-transform-modules-systemjs to 7.29.4
- Updated fast-uri to 3.1.2 (security release)
- Updated python-multipart from 0.0.26 to 0.0.27
- Updated axios in frontend from 1.15.0 to 1.15.2

---

## 🚀 Upgrade Notes

- Deploy frontend and backend together
- No database migrations required
- No breaking changes in this release
- Keep standard workflow:
  - Test/dev: `NATIVE.ps1 -Start`
  - Production: `DOCKER.ps1 -Start`

---

## 📊 Summary

This release focuses on infrastructure modernization and documentation consolidation. All 14 commits since v1.18.9 have been merged, including critical GitHub Actions upgrades for Node.js 24 compatibility, comprehensive CI/CD improvements, and enhanced analytics functionality restoration.

**Full Changelog**: https://github.com/bs1gr/AUT_MIEEK_SMS/compare/v1.18.9...v1.18.23
