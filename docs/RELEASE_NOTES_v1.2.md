# Release Notes — v1.2.0 (October 30, 2025)

This release introduces optional authentication with role-based access control, improves timestamp handling, cleans up legacy scripts, and strengthens documentation.

## Highlights

- Optional JWT authentication (disabled by default)
- Role-based access control (admin/teacher/student)
- Timezone-aware timestamps for new and updated records
- Comprehensive authentication guide and fresh-clone test report

## New

- Authentication system with JWT tokens and PBKDF2-SHA256 password hashing
- RBAC enforcement when `AUTH_ENABLED=True`
- New users table and Alembic migrations
- Complete documentation: see [docs/AUTHENTICATION.md](./AUTHENTICATION.md)
- Fresh-clone validation report: see [FRESH_CLONE_TEST_REPORT_V1.2.md](../FRESH_CLONE_TEST_REPORT_V1.2.md)

## Changes

- Models now use `DateTime(timezone=True)` with UTC defaults
- Added indexes for `users.created_at` and `users.updated_at`
- All write/heavy endpoints have rate limiting applied
- README updated with authentication references

## Removed

- Deleted deprecated scripts under `scripts/legacy/` (use `QUICKSTART.ps1` and `SMS.ps1`)

## Migrations

Run database migrations after updating:

```powershell
cd backend
alembic upgrade head
```

Migration order:

```text
(empty)
  ↓
3f2b1a9c0d7e (base)
  ↓
9a1d2b3c4d56 (users)
  ↓
039d0af51aab (tz-aware indexes)
```

## Compatibility

- Backward compatible by default (`AUTH_ENABLED=False`) — existing flows unchanged
- SQLite and Docker volume migrations supported

## Security

- Secure password hashing (PBKDF2-SHA256)
- JWT token expiration (30 minutes default)
- Clear production warnings to update `SECRET_KEY` and CORS

## How to Upgrade

```powershell
# Update code
git pull

# Backend deps
cd backend
pip install -r requirements.txt

# Frontend deps
cd ../frontend
npm install

# DB migrations
cd ../backend
alembic upgrade head

# Start
cd ..
./QUICKSTART.ps1
```

## Known Issues

- Previously, `python-jose` emitted a deprecation warning about `datetime.utcnow()` (upstream). We have since migrated to PyJWT and use timezone-aware `datetime.now(timezone.utc)` for the `exp` claim.

## Acknowledgements

Thanks to contributors and testers for feedback and validation.
