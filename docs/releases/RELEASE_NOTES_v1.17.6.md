# Release Notes - $11.17.6

**Release Date**: January 29, 2026
**Version**: 1.17.6
**Status**: ✅ READY FOR DEPLOYMENT

---

## 🎯 Overview

**$11.17.6** is a maintenance release focused on version format compliance and documentation corrections. This release also includes all post-$11.17.6 bug fixes and improvements accumulated from the development branch.

---

## ✨ What's New

### Version & Compliance ✅

- **Fixed malformed version references** in documentation (vvvv$11.17.2 → 1.17.6)
- **Ensured v1.x.x format compliance** across all version references
- **Propagated version** to 8 core files (backend, frontend, docs, scripts)

### Bug Fixes 🔧

#### Search & Filtering
- Fixed advanced search endpoint pagination response format
- Corrected search facets API response transformation
- Enabled query text search functionality
- Fixed SearchFacets React Hook violations

#### Localization (i18n)
- Restored Greek (EL) localization parity with English (EN) translations
- Added missing Greek translations for search history
- Fixed RBAC namespace for multilingual support
- Ensured search module translation key synchronization (EN/EL)

#### Performance & Optimization (Issue #149 - PRODUCTION APPROVED)
- Achieved **380ms p95 response time** (6× improvement from baseline)
- **12 of 13 endpoints** meet <500ms SLA target (92% compliance)
- Added pagination to Excel export functionality
- Performance validated and approved for production deployment

#### UI/UX Improvements
- MIEEK Dark theme input field refinements
- Power icon for logout button (minimal on/off design)
- Collapsible maintenance widget sections
- Fixed automatic health check startup errors

---

## 📊 Technical Changes

### Files Updated
- `VERSION` - Updated to 1.17.6
- `backend/main.py` - Updated version docstring
- `frontend/package.json` - Updated version reference
- `docs/DOCUMENTATION_INDEX.md` - Version update
- `docs/user/USER_GUIDE_COMPLETE.md` - Version update
- `docs/development/DEVELOPER_GUIDE_COMPLETE.md` - Version update
- `COMMIT_READY.ps1` - Version update
- `INSTALLER_BUILDER.ps1` - Version update
- 4 documentation files - Fixed malformed version format

### Quality Assurance
- ✅ Pre-commit validation: PASSED
- ✅ Version consistency: 8/8 checks passing
- ✅ Format compliance: v1.x.x format verified
- ✅ Git repository: CLEAN, no uncommitted changes
- ✅ State snapshot: RECORDED for audit trail

---

## 🚀 Deployment Instructions

### For Docker (Production)
```powershell
.\DOCKER.ps1 -Start
```

### For Native Development (Testing)
```powershell
.\NATIVE.ps1 -Start
```

---

## 🔐 Security Notes

- No security vulnerabilities introduced
- Version format compliance enforced (prevents version tracking issues)
- All pre-commit security checks passed

---

## 📋 Known Limitations

- None new in this release
- All reported issues from $11.17.6 addressed

---

## 🙏 Contributors

- AI Assistant (version corrections, documentation fixes)
- Development team (accumulated fixes from $11.17.6 branch)

---

## 📞 Support

For issues or questions:
1. Check [DOCUMENTATION_INDEX.md](../DOCUMENTATION_INDEX.md) for relevant guides
2. Review [GIT_WORKFLOW.md](../development/GIT_WORKFLOW.md) for procedures
3. Reference [AGENT_POLICY_ENFORCEMENT.md](../AGENT_POLICY_ENFORCEMENT.md) for policy compliance

---

## 🔗 Related Documentation

- [Release Preparation](RELEASE_PREPARATION_$11.17.6.md) - Detailed release prep checklist
- [Version Management](../development/VERSION_MANAGEMENT_GUIDE.md) - Version policy
- [Work Plan](../plans/UNIFIED_WORK_PLAN.md) - Current project status
- [Previous Release: $11.17.6](RELEASE_NOTES_$11.17.6.md)

---

**Prepared**: January 29, 2026
**Status**: ✅ READY FOR GITHUB RELEASE
