# Release Manifest - vv1.18.21

**Release Version**: 1.18.6
**Release Date**: March 2, 2026
**Release Type**: Feature Release
**Git Tag**: vv1.18.21

---

## 📦 Release Artifacts

### Primary Artifacts

| Artifact | Size | Purpose | Status |
|----------|------|---------|--------|
| `SMS_Installer_1.18.6.exe` | TBD | Windows installer | ⏳ Building |
| `SMS_Installer_1.18.6.exe.sha256` | ~90 bytes | SHA256 checksum | ⏳ Building |

**Artifact Location**: https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/vv1.18.21

### Code Signing

**Certificate Details**:
- **Issuer**: AUT MIEEK
- **Algorithm**: SHA256RSA
- **Status**: ⏳ Awaiting signature verification

**Verification Command**:
```powershell
Get-AuthenticodeSignature "SMS_Installer_1.18.6.exe"
```

**Expected Output**:
```
Status: Valid
StatusMessage: Signature verified
SignerCertificate: CN=AUT MIEEK
```

---

## 🔐 Integrity Verification

### SHA256 Checksums

**Installer Checksum** (to be updated after build):
```
Filename: SMS_Installer_1.18.6.exe
SHA256: <pending build>
```

**Verification Steps**:
1. Download both `SMS_Installer_1.18.6.exe` and `SMS_Installer_1.18.6.exe.sha256`
2. Run PowerShell command:
   ```powershell
   $actual = (Get-FileHash "SMS_Installer_1.18.6.exe" -Algorithm SHA256).Hash
   $expected = (Get-Content "SMS_Installer_1.18.6.exe.sha256").Split()[0]
   if ($actual -eq $expected) { "✅ Checksum verified" } else { "❌ Checksum mismatch!" }
   ```

### Release Asset Policy

**Allowlist** (Policy 9 enforcement):
- ✅ `SMS_Installer_*.exe` - Signed Windows installer
- ✅ `SMS_Installer_*.exe.sha256` - Checksum verification file
- ❌ Any other artifacts - Rejected by asset sanitizer

**Automated Enforcement**:
- Workflow: `release-asset-sanitizer.yml`
- Trigger: Release asset upload complete
- Action: Remove non-allowlisted assets

---

## 📋 Release Workflow Status

### Automated Workflows

1. **Create GitHub Release on tag** (`.github/workflows/release-on-tag.yml`)
   - Status: ⏳ Triggered by tag push
   - Input: Git tag `vv1.18.21`
   - Output: GitHub release page created
   - Expected Duration: ~2 minutes

2. **Build & Upload Installer with SHA256** (`.github/workflows/release-installer-with-sha.yml`)
   - Status: ⏳ Waiting for release creation
   - Build Process: Inno Setup compilation
   - Code Signing: AUT MIEEK certificate
   - Assets: Installer + SHA256 file
   - Expected Duration: ~5-8 minutes

3. **Release Asset Sanitizer** (`.github/workflows/release-asset-sanitizer.yml`)
   - Status: ⏳ Waiting for asset upload
   - Validation: Installer-only policy
   - Action: Clean non-allowlisted assets
   - Expected Duration: ~1 minute

**Total Expected Time**: ~10-12 minutes from tag push

### Manual Verification Points

- [ ] GitHub release page exists at vv1.18.21 URL
- [ ] Release is marked as "Latest"
- [ ] Release body matches GITHUB_RELEASE_vv1.18.21.md
- [ ] Installer asset uploaded successfully
- [ ] SHA256 checksum file uploaded
- [ ] No unapproved assets present (sanitizer enforced)
- [ ] Installer signature valid (AUT MIEEK certificate)
- [ ] SHA256 checksum matches actual file

---

## 🎯 Release Validation Gates

### Pre-Release Gates (✅ All Passed)

- [x] **Version Bump**: VERSION file updated to 1.18.6
- [x] **Package Version**: frontend/package.json updated to 1.18.6
- [x] **CHANGELOG**: vv1.18.21 entry complete with analytics features
- [x] **Git Tag**: vv1.18.21 created with comprehensive message
- [x] **Tag Push**: Pushed to origin (triggers workflows)
- [x] **Test Coverage**: 23/23 analytics tests passing (100%)
- [x] **Linting**: All code quality checks passed
- [x] **Documentation**: Release notes and guides created

### Post-Release  Gates (⏳ Pending)

- [ ] **Workflow Success**: All 3 GitHub Actions completed
- [ ] **Installer Build**: SMS_Installer_1.18.6.exe created
- [ ] **Code Signing**: Signature valid and verified
- [ ] **Checksum**: SHA256 file present and accurate
- [ ] **Asset Policy**: Only installer+checksum present
- [ ] **Release Page**: Published and marked "Latest"
- [ ] **Fresh Install**: Tested on clean Windows system
- [ ] **Upgrade Test**: Tested upgrade from vv1.18.21

---

## 📊 Release Content Summary

### Code Changes

**Modified Files**: 36
**Lines Added**: 5,587+
**Lines Deleted**: Minimal (refactoring only)

**Backend Services**:
- `routers_analytics.py` (442 lines) - NEW
- `analytics_export_service.py` (378 lines) - NEW
- `predictive_analytics_service.py` (387 lines) - NEW
- 3 test files (471 total lines) - NEW

**Frontend Components**:
- 15+ React components (2,000+ lines) - NEW
- 2 custom hooks (204 lines) - NEW
- TypeScript types (136 lines) - NEW
- Utilities (589 lines) - NEW
- 4 test suites - NEW

**Internationalization**:
- EN translations (108 lines) - NEW
- EL translations (108 lines) - NEW

**Documentation**:
- Analytics guides (395 lines) - NEW
- Release documentation (this manifest + notes + checklist)

### Feature Categories

**Analytics Dashboard**:
- Multi-chart visualization
- Interactive drill-down
- Performance optimization
- Responsive design

**Report Builder**:
- 5-step wizard
- Custom configurations
- Template management
- Real-time preview

**Predictive Analytics**:
- ML-based risk assessment
- Performance predictions
- Intervention suggestions
- Trend analysis

**Export Capabilities**:
- PDF generation
- Excel workbooks
- CSV files
- Unique filename handling

---

## 🔗 Related Documentation

- [RELEASE_NOTES_vv1.18.21.md](RELEASE_NOTES_vv1.18.21.md) - Complete release notes
- [GITHUB_RELEASE_vv1.18.21.md](GITHUB_RELEASE_vv1.18.21.md) - GitHub release body
- [DEPLOYMENT_CHECKLIST_vv1.18.21.md](DEPLOYMENT_CHECKLIST_vv1.18.21.md) - Post-release verification
- [CHANGELOG.md](../../CHANGELOG.md) - Version history
- [docs/analytics/](../analytics/) - Analytics feature documentation

---

## ⚙️ Build Configuration

### Installer Build

**Tool**: Inno Setup 6+
**Script**: `installer/SMS_Installer.iss`
**Version**: 1.18.6 (auto-detected from VERSION file)

**Compiler Options**:
- Compression: LZMA2/max
- Signing: AUT MIEEK certificate
- Architecture: x64
- Output: `SMS_Installer_1.18.6.exe`

**Post-Build**:
- Calculate SHA256 checksum
- Generate `.sha256` sidecar file
- Upload both to GitHub release

### GitHub Actions Environment

**Runner**: `ubuntu-latest` (workflow creation/sanitizer)
**Runner**: `windows-latest` (installer build)
**Timeout**: 15 minutes per workflow
**Concurrency**: Sequential execution required

---

## 📝 Release Timeline

| Timestamp | Event | Status |
|-----------|-------|--------|
| 2026-03-02 ~10:00 UTC | Feature branch created | ✅ Complete |
| 2026-03-02 ~11:00 UTC | Analytics code committed | ✅ Complete |
| 2026-03-02 ~11:30 UTC | Branch merged to main | ✅ Complete |
| 2026-03-02 ~11:45 UTC | Version bumped to 1.18.6 | ✅ Complete |
| 2026-03-02 ~12:00 UTC | Tag vv1.18.21 created | ✅ Complete |
| 2026-03-02 ~12:05 UTC | Tag pushed to origin | ✅ Complete |
| 2026-03-02 ~12:10 UTC | CHANGELOG enhanced | ✅ Complete |
| 2026-03-02 ~12:15 UTC | Release docs created | ⏳ In Progress |
| 2026-03-02 ~12:20 UTC | GitHub Actions triggered | ⏳ Pending |
| 2026-03-02 ~12:30 UTC | Installer build complete | ⏳ Pending |
| 2026-03-02 ~12:35 UTC | Release published | ⏳ Pending |

---

## ✅ Completion Criteria

Release is considered **complete and verified** when:

1. ✅ All 3 GitHub Actions workflows succeeded
2. ✅ Release page exists and marked "Latest"
3. ✅ Installer asset present and code-signed
4. ✅ SHA256 checksum file present and accurate
5. ✅ No unapproved assets (sanitizer enforced)
6. ✅ Fresh installation tested successfully
7. ✅ Upgrade from vv1.18.21 tested successfully
8. ✅ Analytics features functional in both Docker and Native
9. ✅ Documentation complete and accessible
10. ✅ UNIFIED_WORK_PLAN.md updated with release status

---

**Manifest Version**: 1.0
**Last Updated**: 2026-03-02
**Maintained By**: Solo Developer + AI Assistant
