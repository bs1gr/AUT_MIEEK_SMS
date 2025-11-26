# Release v1.8.7 - Documentation Cleanup & Verification

## Documentation Updates

### Version Alignment
- Updated all version references from 1.6.5/1.8.6.4 to 1.8.7
- Updated VERSION file to 1.8.7
- Removed version-specific headers to make documentation evergreen
- Updated QNAP documentation to current version (November 23, 2025)

### Link Fixes
- Fixed broken link to `CODEBASE_ANALYSIS_REPORT.md` → corrected to `archive/sessions_2025-11/CODEBASE_ANALYSIS_REPORT.md`
- Fixed broken link to `CLEANUP_SUMMARY.md` → corrected to `archive/CLEANUP_SUMMARY.md`
- Ensured all documentation reflects consolidated script structure (DOCKER.ps1, NATIVE.ps1)

### Template Cleanup
- Removed duplicate sections from Pull Request template
- Eliminated redundant "Summary", "Changes", "Operator checklist", "Testing", and "Notes" sections

### QNAP Documentation
- Updated QNAP_INSTALLATION_GUIDE.md to v1.8.7
- Updated QNAP_MANAGEMENT_GUIDE.md - removed version-specific subtitle
- Updated QNAP_TROUBLESHOOTING_GUIDE.md - removed version-specific subtitle
- Updated markdown lint report with current issues

## Verification

- ✅ Confirmed obsolete files properly archived in `archive/obsolete/`
- ✅ Verified deprecated script references documented in archive READMEs
- ✅ Ensured all active documentation references consolidated scripts
- ✅ Validated system operational status

## Improvements

- Better documentation maintainability with version-independent headers
- Improved link hygiene with proper paths to archived files
- Cleaner PR template without duplication
- More accurate documentation alignment with codebase

**Full Changelog**: https://github.com/bs1gr/AUT_MIEEK_SMS/compare/v1.8.6.4...v1.8.7
