# Authentication & Authorization Critical Fixes - v1.8.6.4

## 🚨 Issues Identified

### Problem 1: Inconsistent Authorization State
**Symptoms:**
- Users can log in but cannot perform actions they should be allowed to
- Admin cannot change own password
- Teacher role cannot enroll students despite having permission
- Logging out and back in changes authorization state

**Root Cause:**
- `optional_require_role()` returns dummy user when `AUTH_ENABLED=False`
- When `AUTH_ENABLED=True`, it becomes strict role enforcement via `require_role()`
- No middle ground for "auth enabled but permissive"
- Role checks fail silently or return confusing 403 errors

### Problem 2: Token Refresh/Session Management
**Symptoms:**
- After logout, cannot login as different user type
- Docker restart changes user permissions
- Refresh tokens may persist after logout

**Root Cause:**
- Refresh tokens stored in HttpOnly cookies may not clear properly
- Token validation doesn't check for stale sessions
- CSRF tokens may interfere with re-authentication

### Problem 3: Missing Password Management
**Symptoms:**
- No way to reset forgotten password
- Admin cannot force password reset
- No username/email change functionality
- Users locked out after failed attempts cannot recover

**Root Cause:**
- `/auth/change-password` exists but requires current password
- No `/auth/forgot-password` endpoint
- No admin endpoint to unlock accounts
- No email verification system

### Problem 4: Unclear Permission Errors
**Symptoms:**
- 403 Forbidden without explanation of which permission failed
- No indication of required role vs current role
- No audit trail of failed authorization attempts

**Root Cause:**
- Generic error messages
- No context in error responses
- Frontend doesn't display role requirements

---

## 🔧 Comprehensive Fixes

### Fix 1: Hybrid Authorization Mode

**Add new AUTH_MODE setting:**
```python
# backend/config.py
class Settings(BaseSettings):
    AUTH_MODE: Literal["disabled", "permissive", "strict"] = "permissive"
    # disabled: No auth checks (legacy mode)
    # permissive: Auth required but role checks lenient
    # strict: Full role enforcement
```

**Update optional_require_role:**
```python
def optional_require_role(*roles: str):
    auth_mode = getattr(settings, "AUTH_MODE", "permissive")
    
    if auth_mode == "disabled":
        # Legacy mode - return dummy user
        def _noop():
            class _Dummy:
                role = "admin"
                email = "anonymous@example.com"
                is_active = True
            return _Dummy()
        return _noop
    
    elif auth_mode == "permissive":
        # Auth required, but if user is authenticated, allow all roles
        async def _permissive_check(
            request: Request,
            user: Any = Depends(get_current_user)
        ) -> Any:
            # If user is authenticated and active, allow regardless of role
            if user and getattr(user, "is_active", False):
                return user
            # If not authenticated, enforce role check
            return await require_role(*roles)(request, user)
        return _permissive_check
    
    else:  # strict
        # Full role enforcement
        return require_role(*roles)
```

### Fix 2: Enhanced Token Management

**Add token revocation list:**
```python
# backend/models.py (add field to RefreshToken)
class RefreshToken(Base):
    # ... existing fields ...
    revoked_reason: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
```

**Improve logout:**
```python
@router.post("/auth/logout")
async def logout(
    request: Request, 
    response: Response,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)  # Ensure user is authenticated
):
    try:
        # Revoke all refresh tokens for this user
        db.query(models.RefreshToken).filter(
            models.RefreshToken.user_id == current_user.id,
            models.RefreshToken.revoked == False
        ).update({
            "revoked": True,
            "revoked_reason": "explicit_logout",
            "revoked_at": datetime.now(timezone.utc)
        })
        db.commit()
        
        # Clear cookies
        response.delete_cookie("refresh_token")
        clear_csrf_cookie(response)
        
        return {"ok": True, "message": "Logged out successfully"}
    except Exception as e:
        logger.error(f"Logout error: {e}")
        # Still clear cookies even if DB update fails
        response.delete_cookie("refresh_token")
        clear_csrf_cookie(response)
        return {"ok": True, "message": "Logged out"}
```

### Fix 3: Password Reset System

**Add forgot password endpoint:**
```python
@router.post("/auth/forgot-password")
@limiter.limit(RATE_LIMIT_AUTH)
async def forgot_password(
    request: Request,
    payload: ForgotPasswordRequest = Body(...),
    db: Session = Depends(get_db),
):
    """
    Generate password reset token (stored in DB, not emailed for now).
    Admin must provide reset token to user manually.
    """
    try:
        normalized_email = payload.email.lower().strip()
        user = db.query(models.User).filter(models.User.email == normalized_email).first()
        
        if not user:
            # Don't reveal if email exists (security)
            return {"status": "reset_requested", "message": "If email exists, reset instructions sent"}
        
        # Generate secure reset token (24 hour expiry)
        reset_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(reset_token.encode()).hexdigest()
        expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
        
        # Store in new PasswordResetToken table
        reset_entry = models.PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
            used=False
        )
        db.add(reset_entry)
        db.commit()
        
        # In production, email the token to user
        # For now, return it (admin must provide to user)
        return {
            "status": "reset_requested",
            "reset_token": reset_token,  # Remove in production
            "expires_at": expires_at.isoformat(),
            "message": "Provide this token to the user"
        }
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise internal_server_error("Password reset failed", request) from exc


@router.post("/auth/reset-password")
@limiter.limit(RATE_LIMIT_AUTH)
async def reset_password(
    request: Request,
    payload: PasswordResetConfirm = Body(...),
    db: Session = Depends(get_db),
):
    """Reset password using token from forgot-password."""
    try:
        token_hash = hashlib.sha256(payload.reset_token.encode()).hexdigest()
        
        reset_entry = db.query(models.PasswordResetToken).filter(
            models.PasswordResetToken.token_hash == token_hash,
            models.PasswordResetToken.used == False,
            models.PasswordResetToken.expires_at > datetime.now(timezone.utc)
        ).first()
        
        if not reset_entry:
            raise http_error(
                status.HTTP_400_BAD_REQUEST,
                ErrorCode.AUTH_INVALID_TOKEN,
                "Invalid or expired reset token",
                request
            )
        
        user = db.query(models.User).filter(models.User.id == reset_entry.user_id).first()
        if not user:
            raise http_error(status.HTTP_404_NOT_FOUND, ErrorCode.AUTH_USER_NOT_FOUND, "User not found", request)
        
        # Update password and clear lockout
        user.hashed_password = get_password_hash(payload.new_password)
        user.failed_login_attempts = 0
        user.lockout_until = None
        user.last_failed_login_at = None
        
        # Mark token as used
        reset_entry.used = True
        reset_entry.used_at = datetime.now(timezone.utc)
        
        # Revoke all refresh tokens (force re-login)
        db.query(models.RefreshToken).filter(
            models.RefreshToken.user_id == user.id
        ).update({"revoked": True})
        
        db.commit()
        
        return {"status": "password_reset", "message": "Password reset successfully. Please login."}
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise internal_server_error("Password reset failed", request) from exc
```

**Add admin unlock account:**
```python
@router.post("/admin/users/{user_id}/unlock")
@limiter.limit(RATE_LIMIT_WRITE)
async def admin_unlock_account(
    request: Request,
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: Any = Depends(require_role("admin")),
):
    """Unlock a locked user account and reset failed attempt counters."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise http_error(status.HTTP_404_NOT_FOUND, ErrorCode.AUTH_USER_NOT_FOUND, "User not found", request)
    
    try:
        user.failed_login_attempts = 0
        user.lockout_until = None
        user.last_failed_login_at = None
        db.commit()
        return {"status": "unlocked", "message": f"Account {user.email} unlocked"}
    except Exception as exc:
        db.rollback()
        raise internal_server_error("Unable to unlock account", request) from exc
```

### Fix 4: Better Error Messages

**Update require_role:**
```python
def require_role(*roles: str):
    def _dep(request: Request, user: Any = Depends(get_current_user)) -> Any:
        user_role = getattr(user, "role", None)
        if roles and user_role not in roles:
            raise http_error(
                status.HTTP_403_FORBIDDEN,
                ErrorCode.FORBIDDEN,
                f"Access denied. Required role: {' or '.join(roles)}. Your role: {user_role}",
                request,
                context={
                    "required_roles": list(roles),
                    "current_role": user_role,
                    "user_email": getattr(user, "email", None)
                },
            )
        return user
    return _dep
```

**Add admin audit log:**
```python
class AuthAuditLog(Base):
    __tablename__ = "auth_audit_log"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(50), index=True)  # login, logout, failed_login, permission_denied
    endpoint: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    details: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.now(timezone.utc))
```

---

## 📋 Implementation Plan

### Phase 1: Immediate Fixes (Deploy to Production)
1. ✅ Add `AUTH_MODE=permissive` setting
2. ✅ Update `optional_require_role()` to use hybrid mode
3. ✅ Fix logout to revoke all user tokens
4. ✅ Add admin unlock account endpoint
5. ✅ Improve error messages with role context

### Phase 2: Password Management (Next Release)
1. ⏳ Add `PasswordResetToken` model + migration
2. ⏳ Implement `/auth/forgot-password`
3. ⏳ Implement `/auth/reset-password`
4. ⏳ Add email integration (optional)
5. ⏳ Frontend UI for password reset flow

### Phase 3: Audit & Security (Future)
1. ⏳ Add `AuthAuditLog` model
2. ⏳ Log all auth events
3. ⏳ Admin dashboard for audit review
4. ⏳ Automated lockout alerts

---

## 🧪 Testing Checklist

### Scenario 1: Teacher Login → Enroll Students
- [ ] Login as teacher
- [ ] Navigate to course enrollment
- [ ] Select students
- [ ] Click "Enroll"
- [ ] Should succeed without 403 error

### Scenario 2: Admin Password Change
- [ ] Login as admin
- [ ] Go to profile settings
- [ ] Change password
- [ ] Should succeed
- [ ] Logout
- [ ] Login with new password

### Scenario 3: Logout → Re-login Different User
- [ ] Login as admin
- [ ] Logout
- [ ] Login as teacher
- [ ] Should not retain admin permissions

### Scenario 4: Account Lockout → Admin Unlock
- [ ] Attempt login with wrong password 5 times
- [ ] Account locks
- [ ] Admin unlocks account
- [ ] Login with correct password succeeds

### Scenario 5: Password Reset Flow
- [ ] Request password reset
- [ ] Receive reset token
- [ ] Reset password with token
- [ ] Login with new password

---

## 🚀 Deployment Steps

1. **Backup Database**
   ```bash
   docker exec sms-fullstack cp /data/student_management.db /data/backup_before_auth_fix.db
   ```

2. **Update Code**
   - Apply fixes from this document
   - Run migration: `alembic upgrade head`

3. **Update .env**
   ```bash
   # backend/.env
   AUTH_ENABLED=true
   AUTH_MODE=permissive  # NEW - allows authenticated users full access
   ```

4. **Restart Application**
   ```bash
   .\RUN.ps1 -Stop
   .\RUN.ps1
   ```

5. **Verify**
   - Test all scenarios above
   - Check logs for errors
   - Confirm users can perform expected actions

---

## 📝 Version History

- **v1.8.6.4** - Comprehensive auth fixes (this document)
- **v1.8.6.3** - Windows GUI installer
- **v1.8.6.2** - Auth enabled by default (introduced issues)

