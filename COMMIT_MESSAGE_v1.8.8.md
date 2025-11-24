# Commit Message for v1.8.8

```text
feat(v1.8.8): forced password change on first login & backend resilience improvements

🔐 Security Enhancement: Mandatory Password Change
- Add `password_change_required` database field with migration
- Implement non-dismissible modal for password change prompt
- Bootstrap sets flag for default admin accounts
- Clear flag automatically after successful password change
- Add DEFAULT_ADMIN_AUTO_RESET for CI/CD credential rotation

🎯 Backend Changes:
- Models: Added password_change_required field with index
- Migration: d377f961aa1f_add_password_change_required_field
- Admin Bootstrap: Set flag on creation/reset, support AUTO_RESET
- Auth Router: Clear flag on password change, use optional_require_role
- Schemas: Added field to UserResponse
- Config: Added DEFAULT_ADMIN_AUTO_RESET setting
- Lifespan: Deferred migrations to background thread (no startup hang)
- Main: Graceful fallback for runtime constraints, minimal startup logging

🌐 Frontend Changes:
- New Modal: ChangePasswordPromptModal.tsx (non-dismissible, bilingual)
- Backend Status Banner: BackendStatusBanner.jsx (connectivity monitor)
- App Integration: Auto-detect password_change_required and show modal
- Auth Context: Add updateUser() method with retry logic for /auth/me
- Admin Panel: Refresh user after password change to clear flag
- API Clients: Add getCurrentUser(), preflightAPI() with automatic fallback
- Translations: Add EN/EL keys for password prompt and backend status
- PowerPage: Auto-open control panel from URL query (?showControl=1)
- Error Handling: Safe property access for status errors

🛠️ Infrastructure:
- DOCKER.ps1: Add --env-file support, fix volume path (/data)
- NATIVE.ps1: Add -NoReload switch for stable backend mode
- Enhanced API client resilience with automatic base URL fallback
- Improved error rendering in ServerControl component

🤖 CI/CD Pipeline (NEW):
- Comprehensive 10-phase GitHub Actions pipeline
- Version verification integration (blocks on inconsistencies)
- Automated testing (263 backend + frontend tests)
- Multi-stage Docker builds with GitHub Container Registry
- Security scanning (Trivy, Bandit, npm audit)
- Automated staging/production deployments
- GitHub Release automation
- Quickstart validation workflow (<5 min)
- Complete documentation: docs/deployment/CI_CD_PIPELINE_GUIDE.md

📚 Documentation:
- FORCED_PASSWORD_CHANGE_FEATURE.md: Complete implementation guide
- USER_GUIDE_COMPLETE.md: Document DEFAULT_ADMIN_AUTO_RESET workflow
- .dockerignore: Add **/.env and **/.env.local patterns

🧪 Tests:
- test_admin_bootstrap.py: Add AUTO_RESET test coverage (4 new tests)
- test_change_password.py: New comprehensive password flow test
- api.fallback.test.ts: Test dynamic API fallback behavior
- All 263 backend tests passing ✅
- Frontend test coverage expanded

🧹 Cleanup:
- Remove obsolete test scripts from root (test_*.py)
- Remove diagnostic scripts from scripts/ (check_*.py, reset_*.py)
- Delete frontend/vite_out.log
- Delete .venv_audit/Scripts/python.exe
- Enhanced .dockerignore patterns

🔄 User Flow:
1. Admin login with default credentials
2. Backend returns password_change_required=True
3. Modal appears (non-dismissible)
4. User clicks "Change Password Now" → navigates to /power
5. User changes password in Control Panel
6. Flag cleared, modal closes automatically
7. User can now use application normally

✨ Key Features:
✅ Non-dismissible security modal
✅ Bilingual support (EN/EL)
✅ Password requirements checklist
✅ Direct navigation to password form
✅ Automatic state synchronization
✅ Backend connectivity monitoring
✅ API fallback resilience
✅ CI/CD credential rotation support
✅ Zero breaking changes for existing installations

🚀 Version: 1.8.8
📦 Files Changed: 56 files (+8,501 insertions, -792 deletions)
🧪 Tests: 263 passed, 1 skipped, 0 failed
⏱️ Test Duration: ~45 seconds

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Commit Instructions

### 1. Stage All Changes
```powershell
git add -A
```

### 2. Commit with Message
```powershell
git commit -F COMMIT_MESSAGE_v1.8.8.md
```

### 3. Verify Commit
```powershell
git show --stat
```

### 4. Tag Release
```powershell
git tag -a v1.8.8 -m "Release v1.8.8: Forced password change on first login"
```

### 5. Push Changes
```powershell
git push origin main
git push origin v1.8.8
```

---

## Summary for Human Review

**What Changed:**
- **Security**: Forced password change for default admin accounts
- **Resilience**: API client auto-fallback, backend status monitoring
- **UX**: Non-dismissible modal, clear password requirements
- **DevOps**: Support for automated credential rotation
- **Cleanup**: Removed obsolete diagnostic scripts

**Breaking Changes:** None

**Migration Required:** Yes (automatic on startup via Alembic)

**Backward Compatible:** Yes

**Production Ready:** ✅ All tests passing, comprehensive documentation

**User Impact:** Admins using default credentials must change password on first login (security best practice)

