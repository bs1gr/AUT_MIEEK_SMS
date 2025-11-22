from datetime import datetime, timedelta, timezone
from typing import Optional, Any, TYPE_CHECKING

from fastapi import APIRouter, Depends, HTTPException, status, Request, Body, Response
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer
import jwt
from jwt import InvalidTokenError
from passlib.context import CryptContext
import hashlib
import uuid
from sqlalchemy.orm import Session
from backend.errors import ErrorCode, http_error, internal_server_error
from backend.security import issue_csrf_cookie, clear_csrf_cookie
import logging

logger = logging.getLogger(__name__)


# Login / lockout helpers


# Local imports resilient to run path - use importlib to avoid redefinition warnings
import importlib
import importlib.util


def _resolve_backend_import(name: str, attr: str | None = None):
    """Attempt to import `backend.<name>` and fall back to `<name>` when running from backend/ directly."""
    try:
        module = importlib.import_module(f"backend.{name}")
    except Exception:
        module = importlib.import_module(name)
    return getattr(module, attr) if attr else module


get_db: Any = _resolve_backend_import("db", "get_session")
settings: Any = _resolve_backend_import("config", "settings")
models = (
    importlib.import_module("backend.models")
    if importlib.util.find_spec("backend.models")
    else importlib.import_module("models")
)

# For static type checking, import symbols into the TYPE_CHECKING block so mypy
# can resolve types like models.User and schema classes while runtime still
# uses dynamic imports to support different execution entry paths.
if TYPE_CHECKING:
    from backend import models as models  # type: ignore
    from backend.schemas import (
        UserCreate,
        UserUpdate,
        UserLogin,
        UserResponse,
        Token,
        PasswordResetRequest,
        PasswordChangeRequest,
    )  # type: ignore

    # Advanced auth schemas used by refresh/logout endpoints
    from backend.schemas import (
        RefreshRequest,
        RefreshResponse,
        LogoutRequest,
    )  # type: ignore
else:
    schemas_mod = None
    try:
        schemas_mod = importlib.import_module("backend.schemas")
    except Exception:
        schemas_mod = importlib.import_module("schemas")

    UserCreate = getattr(schemas_mod, "UserCreate")
    UserUpdate = getattr(schemas_mod, "UserUpdate")
    UserLogin = getattr(schemas_mod, "UserLogin")
    UserResponse = getattr(schemas_mod, "UserResponse")
    Token = getattr(schemas_mod, "Token")
    PasswordResetRequest = getattr(schemas_mod, "PasswordResetRequest")
    PasswordChangeRequest = getattr(schemas_mod, "PasswordChangeRequest", None)
    # Advanced auth schemas
    RefreshRequest = getattr(schemas_mod, "RefreshRequest")
    RefreshResponse = getattr(schemas_mod, "RefreshResponse")
    LogoutRequest = getattr(schemas_mod, "LogoutRequest")

try:
    rl_mod = importlib.import_module("backend.rate_limiting")
except Exception:
    rl_mod = importlib.import_module("rate_limiting")

limiter = getattr(rl_mod, "limiter")
RATE_LIMIT_AUTH = getattr(rl_mod, "RATE_LIMIT_AUTH")
RATE_LIMIT_WRITE = getattr(rl_mod, "RATE_LIMIT_WRITE")
login_throttle = _resolve_backend_import("security.login_throttle", "login_throttle")

router = APIRouter()


def _get_client_identifier(request: Request | None) -> Optional[str]:
    if request is None:
        return None

    forwarded = request.headers.get("x-forwarded-for", "").strip()
    if forwarded:
        first = forwarded.split(",", 1)[0].strip()
        if first:
            return first

    real_ip = request.headers.get("x-real-ip", "").strip()
    if real_ip:
        return real_ip

    client = getattr(request, "client", None)
    if client and getattr(client, "host", None):
        return str(client.host)

    return None


def _normalize_datetime(value: Optional[datetime]) -> Optional[datetime]:
    if value is None:
        return None
    if value.tzinfo is None:
        try:
            return value.replace(tzinfo=timezone.utc)
        except Exception:
            return datetime.fromtimestamp(value.timestamp(), timezone.utc)
    return value


def _build_lockout_exception(request: Request, lockout_until: datetime) -> HTTPException:
    lockout_ts = _normalize_datetime(lockout_until) or datetime.now(timezone.utc)
    now = datetime.now(timezone.utc)
    retry_after_seconds = max(1, int((lockout_ts - now).total_seconds())) if lockout_ts > now else 1
    headers = {"Retry-After": str(retry_after_seconds)}
    context = {"lockout_until": lockout_ts.isoformat()}
    return http_error(
        status.HTTP_429_TOO_MANY_REQUESTS,
        ErrorCode.AUTH_ACCOUNT_LOCKED,
        "Too many failed login attempts. Please try again later.",
        request,
        context=context,
        headers=headers,
    )


def _enforce_throttle_guards(keys: list[Optional[str]], request: Request) -> None:
    for key in keys:
        if not key:
            continue
        lockout_until = login_throttle.get_lockout_until(key)
        if lockout_until:
            raise _build_lockout_exception(request, lockout_until)


def _register_throttle_failure(keys: list[Optional[str]]) -> Optional[datetime]:
    lockouts: list[datetime] = []
    for key in keys:
        if not key:
            continue
        lockout_until = login_throttle.register_failure(key)
        if lockout_until:
            lockouts.append(lockout_until)
    if lockouts:
        return min(lockouts)
    return None


def _reset_throttle_entries(keys: list[Optional[str]]) -> None:
    for key in keys:
        if key:
            login_throttle.reset(key)


def _enforce_user_lockout(user: Any, request: Request, db: Session) -> None:
    if not user:
        return
    lockout_until = _normalize_datetime(getattr(user, "lockout_until", None))
    if not lockout_until:
        return

    now = datetime.now(timezone.utc)
    if lockout_until > now:
        raise _build_lockout_exception(request, lockout_until)

    # Lockout expired – clear state for future attempts
    user.lockout_until = None
    user.failed_login_attempts = 0
    try:
        db.add(user)
        db.commit()
    except Exception:
        db.rollback()
        raise


def _register_user_failed_attempt(user: Any, db: Session) -> Optional[datetime]:
    if not user:
        return None

    now = datetime.now(timezone.utc)
    max_attempts = max(1, int(getattr(settings, "AUTH_LOGIN_MAX_ATTEMPTS", 5)))
    window_seconds = max(1, int(getattr(settings, "AUTH_LOGIN_TRACKING_WINDOW_SECONDS", 300)))
    lockout_seconds = max(1, int(getattr(settings, "AUTH_LOGIN_LOCKOUT_SECONDS", 300)))
    window_delta = timedelta(seconds=window_seconds)

    last_failure = _normalize_datetime(getattr(user, "last_failed_login_at", None))
    attempts = int(getattr(user, "failed_login_attempts", 0) or 0)
    if last_failure and now - last_failure > window_delta:
        attempts = 0

    attempts += 1
    lockout_until: Optional[datetime] = None
    if attempts >= max_attempts:
        lockout_until = now + timedelta(seconds=lockout_seconds)
        user.lockout_until = lockout_until
        attempts = 0
    else:
        user.lockout_until = getattr(user, "lockout_until", None)

    user.failed_login_attempts = attempts
    user.last_failed_login_at = now

    try:
        db.add(user)
        db.commit()
    except Exception:
        db.rollback()
        raise

    return lockout_until


def _reset_user_login_state(user: Any, db: Session) -> None:
    if not user:
        return
    user.failed_login_attempts = 0
    user.last_failed_login_at = None
    user.lockout_until = None
    try:
        db.add(user)
        db.commit()
    except Exception:
        db.rollback()
        raise
@router.get("/security/csrf")
@limiter.limit(RATE_LIMIT_AUTH)
async def fetch_csrf_token(request: Request, response: Response):
    _ = request
    token = issue_csrf_cookie(response, include_header=True)
    response.headers["Cache-Control"] = "no-store, max-age=0"
    response.headers["Pragma"] = "no-cache"
    return {
        "csrf_token": token,
        "header_name": settings.CSRF_HEADER_NAME,
        "cookie_name": settings.CSRF_COOKIE_NAME,
        "expires_in": settings.CSRF_COOKIE_MAX_AGE,
    }



# Use PBKDF2-SHA256 to avoid platform-specific bcrypt backend issues.
# It is widely supported, battle-tested, and avoids the 72-byte bcrypt limit.
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")  # retained for OpenAPI but not relied upon internally


# Password hashing helpers


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


# JWT helpers


def create_access_token(subject: str, expires_delta: Optional[timedelta] = None) -> str:
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode = {"sub": subject, "exp": expire}
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def _hash_token(raw: str) -> str:
    # Use SHA-256 hex digest for DB-stored token fingerprint
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def create_refresh_token_for_user(db: Session, user, expires_delta: Optional[timedelta] = None) -> str:
    # Create a JWT refresh token with a jti claim and longer expiry
    jti = uuid.uuid4().hex
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(days=getattr(settings, "REFRESH_TOKEN_EXPIRE_DAYS", 7))
    )
    to_encode = {"sub": str(getattr(user, "email", "")), "jti": jti, "type": "refresh", "exp": expire}
    token = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    # Persist token fingerprint
    try:
        rt = models.RefreshToken(
            user_id=getattr(user, "id"),
            jti=jti,
            token_hash=_hash_token(token),
            expires_at=expire,
            revoked=False,
        )
        db.add(rt)
        db.commit()
    except Exception:
        db.rollback()
        # If DB persistence fails, do not leak details - still return token (best-effort)
    return token


def revoke_refresh_token_by_jti(db: Session, jti: str) -> bool:
    try:
        tok = db.query(models.RefreshToken).filter(models.RefreshToken.jti == jti).first()
        if not tok:
            return False
        tok.revoked = True
        db.add(tok)
        db.commit()
        return True
    except Exception:
        db.rollback()
        return False


def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])


# Dependency: get current user (optional require)
async def get_current_user(
    request: Request,
    token: str | None = None,
    db: Session = Depends(get_db),
) -> Any:
    """Retrieve the current authenticated user.

    Compatibility notes:
    - Tests call this dependency directly with a positional/keyword `token` argument; preserve that API.
    - When `token` is not provided, fall back to Authorization header parsing.
    - When AUTH_ENABLED=False AND no auth attempted AND not auth endpoint: return dummy admin user for test compatibility.
    - Auth endpoints (like /me) always require authentication even when AUTH_ENABLED=False.
    - When token is provided OR AUTH_ENABLED=True: always validate the token properly.
    """
    if token is None:
        # Only access headers when token not provided (avoid KeyError on minimal Request objects)
        try:
            auth_header = str(request.headers.get("Authorization", "")).strip()
        except (KeyError, AttributeError):
            auth_header = ""
        
        # Check if we're on an auth-specific endpoint (like /me)
        try:
            path = str(getattr(request.url, "path", ""))
        except:
            path = ""
        is_auth_endpoint = "/auth/" in path
        
        # When auth is disabled, no auth header provided, and not an auth endpoint, return dummy user
        if not getattr(settings, "AUTH_ENABLED", False) and not auth_header and not is_auth_endpoint:
            from types import SimpleNamespace
            return SimpleNamespace(
                id=1,
                email="test@example.com",
                role="admin",
                is_active=True,
                full_name="Test User"
            )
        
        if not auth_header.startswith("Bearer "):
            raise http_error(
                status.HTTP_401_UNAUTHORIZED,
                ErrorCode.UNAUTHORIZED,
                "Missing bearer token",
                request,
                headers={"WWW-Authenticate": "Bearer"},
            )
        token = auth_header.split(" ", 1)[1].strip()

    # If we get here, we have a token (either from parameter or header) - validate it
    credentials_exception = http_error(
        status.HTTP_401_UNAUTHORIZED,
        ErrorCode.UNAUTHORIZED,
        "Could not validate credentials",
        request,
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        email_val = payload.get("sub")
        email: str = str(email_val) if email_val is not None else ""
        if not email:
            raise credentials_exception
    except InvalidTokenError:
        raise credentials_exception
    except Exception:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None or not bool(getattr(user, "is_active", False)):
        raise credentials_exception
    return user


def require_role(*roles: str):
    def _dep(request: Request, user: Any = Depends(get_current_user)) -> Any:
        user_role = getattr(user, "role", None)
        user_email = getattr(user, "email", "unknown")
        # Safely derive endpoint path even for synthetic Request objects used in tests
        endpoint_path = "unknown"
        try:
            # Prefer scope path to avoid KeyError when minimal scope provided
            endpoint_path = getattr(request, "scope", {}).get("path", "unknown") or "unknown"
        except Exception:
            try:
                endpoint_path = getattr(getattr(request, "url", None), "path", "unknown") or "unknown"
            except Exception:
                endpoint_path = "unknown"

        if roles and user_role not in roles:
            roles_str = " or ".join(roles)
            raise http_error(
                status.HTTP_403_FORBIDDEN,
                ErrorCode.FORBIDDEN,
                f"Access denied. Required role: {roles_str}. Your role: {user_role}",
                request,
                context={
                    "required_roles": list(roles),
                    "current_role": user_role,
                    "user_email": user_email,
                    "endpoint": endpoint_path,
                },
            )
        return user

    return _dep


def optional_require_role(*roles: str):
    """Adaptive auth dependency.

    Simplified semantics aligned with test expectations:
    - When AUTH_ENABLED is False: bypass auth entirely, return provided user if any, else dummy admin.
    - When AUTH_ENABLED is True: always require authentication and enforce roles (strict) if roles provided.
      This treats any enabled mode ('disabled', 'permissive', 'strict') uniformly to avoid ambiguity
      and ensures security in tests that only toggle AUTH_ENABLED.
    """
    auth_enabled = bool(getattr(settings, "AUTH_ENABLED", False))

    if not auth_enabled:
        # Return a dependency that tolerates absence of user param
        def _bypass(request: Request | None = None, user: Any | None = None):  # type: ignore[unused-ignore]
            if user is not None:
                return user
            class _Dummy:
                role = "admin"
                email = "anonymous@example.com"
                is_active = True
            return _Dummy()
        return _bypass

    # Auth enabled → enforce authentication & roles
    def _enforce(request: Request, user: Any = Depends(get_current_user)) -> Any:  # pragma: no cover - simple wrapper
        user_role = getattr(user, "role", None)
        if roles and user_role not in roles:
            roles_str = " or ".join(roles)
            raise http_error(
                status.HTTP_403_FORBIDDEN,
                ErrorCode.FORBIDDEN,
                f"Access denied. Required role: {roles_str}. Your role: {user_role}",
                request,
                context={
                    "required_roles": list(roles),
                    "current_role": user_role,
                    "user_email": getattr(user, "email", "unknown"),
                },
            )
        return user
    return _enforce


@router.post("/auth/register", response_model=UserResponse)
@limiter.limit(RATE_LIMIT_AUTH)
async def register_user(request: Request, payload: UserCreate = Body(...), db: Session = Depends(get_db)):
    try:
        existing = db.query(models.User).filter(models.User.email == payload.email).first()
        if existing:
            raise http_error(
                status.HTTP_400_BAD_REQUEST,
                ErrorCode.AUTH_EMAIL_EXISTS,
                "Email already registered",
                request,
                context={"email": payload.email},
            )

        # Security: Do not allow public registration to assign elevated roles.
        # Default to 'teacher' for anonymous registrations. If the request
        # includes a valid admin Authorization: Bearer <token>, allow the
        # caller to set the role (useful for internal admin flows).
        assigned_role = "teacher"
        try:
            auth_header = request.headers.get("Authorization", "")
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ", 1)[1].strip()
                payload_decoded = decode_token(token)
                email_val = payload_decoded.get("sub")
                if email_val:
                    admin_user = db.query(models.User).filter(models.User.email == email_val).first()
                    if (
                        admin_user
                        and getattr(admin_user, "is_active", False)
                        and getattr(admin_user, "role", None) == "admin"
                    ):
                        # Admin can set role explicitly
                        assigned_role = payload.role or "teacher"
        except Exception:
            # Any failure validating admin token -> treat as anonymous
            assigned_role = "teacher"

        user = models.User(
            email=payload.email.lower().strip(),
            full_name=(payload.full_name or "").strip() or None,
            role=assigned_role,
            hashed_password=get_password_hash(payload.password),
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise internal_server_error("Registration failed", request) from exc


@router.post("/auth/login", response_model=Token)
@limiter.limit(RATE_LIMIT_AUTH)
async def login(
    request: Request,
    response: Response,
    payload: UserLogin = Body(...),
    db: Session = Depends(get_db),
):
    try:
        normalized_email = payload.email.lower().strip()
        client_identifier = _get_client_identifier(request)
        throttle_keys: list[str | None] = [f"email:{normalized_email}" if normalized_email else None]
        if client_identifier:
            throttle_keys.append(f"ip:{client_identifier}")

        _enforce_throttle_guards(throttle_keys, request)

        user = db.query(models.User).filter(models.User.email == normalized_email).first()
        hashed_pw = str(getattr(user, "hashed_password", "")) if user else ""

        if user:
            _enforce_user_lockout(user, request, db)

        password_valid = bool(user and verify_password(payload.password, hashed_pw))
        if not password_valid:
            user_lockout_until = _register_user_failed_attempt(user, db) if user else None
            throttle_lockout_until = _register_throttle_failure(throttle_keys)
            lockout_until = user_lockout_until or throttle_lockout_until
            if lockout_until:
                raise _build_lockout_exception(request, lockout_until)
            raise http_error(
                status.HTTP_400_BAD_REQUEST,
                ErrorCode.AUTH_INVALID_CREDENTIALS,
                "Invalid email or password",
                request,
            )

        _reset_user_login_state(user, db)
        _reset_throttle_entries(throttle_keys)

        access_token = create_access_token(subject=str(getattr(user, "email", "")))
        # Also issue a refresh token and set it as HttpOnly cookie when possible
        try:
            refresh_token = create_refresh_token_for_user(db, user)
            # Set cookie for refresh token (HttpOnly, Secure when configured)
            secure_flag = getattr(settings, "COOKIE_SECURE", False)
            # Use SameSite Lax to allow top-level POST refresh while mitigating CSRF for most flows
            if response is not None:
                # Compute max_age for cookie; if configured expiry is <= 0 use a session cookie
                _days = getattr(settings, "REFRESH_TOKEN_EXPIRE_DAYS", 7)
                try:
                    _days_val = int(_days)
                except Exception:
                    _days_val = 7
                max_age_val = int(_days_val * 24 * 60 * 60) if _days_val > 0 else None
                response.set_cookie(
                    key="refresh_token",
                    value=refresh_token,
                    httponly=True,
                    secure=secure_flag,
                    samesite="lax",
                    max_age=max_age_val,
                )
        except Exception:
            pass

        issue_csrf_cookie(response, include_header=True)
        # Do NOT include refresh_token in JSON responses; clients must rely on HttpOnly cookie
        return Token(access_token=access_token)
    except HTTPException:
        raise
    except Exception as exc:
        raise internal_server_error("Login failed", request) from exc


@router.get("/auth/me", response_model=UserResponse)
@limiter.limit(RATE_LIMIT_AUTH)
async def me(request: Request, current_user: Any = Depends(get_current_user)):
    return current_user


@router.post("/auth/refresh", response_model=Token)
@limiter.limit(RATE_LIMIT_AUTH)
async def refresh(
    request: Request,
    response: Response,
    payload: RefreshRequest = Body(None),
    db: Session = Depends(get_db),
):
    try:
        raw = (payload.refresh_token if payload is not None else None) or request.cookies.get("refresh_token")
        if not raw:
            raise http_error(
                status.HTTP_401_UNAUTHORIZED,
                ErrorCode.UNAUTHORIZED,
                "Invalid refresh token",
                request,
            )
        payload_decoded = decode_token(raw)
        if payload_decoded.get("type") != "refresh":
            raise http_error(
                status.HTTP_401_UNAUTHORIZED,
                ErrorCode.UNAUTHORIZED,
                "Invalid refresh token",
                request,
            )
        jti = payload_decoded.get("jti")
        email = payload_decoded.get("sub")
        if not jti or not email:
            raise http_error(
                status.HTTP_401_UNAUTHORIZED,
                ErrorCode.UNAUTHORIZED,
                "Invalid refresh token",
                request,
            )

        # Verify stored token exists and not revoked/expired
        stored = db.query(models.RefreshToken).filter(models.RefreshToken.jti == jti).first()
        if not stored or stored.revoked:
            raise http_error(
                status.HTTP_401_UNAUTHORIZED,
                ErrorCode.UNAUTHORIZED,
                "Refresh token expired or revoked",
                request,
            )
        # Normalize stored.expires_at to timezone-aware for comparison
        stored_expires = stored.expires_at
        try:
            if getattr(stored_expires, "tzinfo", None) is None:
                # assume UTC when naive
                stored_expires = stored_expires.replace(tzinfo=timezone.utc)
        except Exception:
            stored_expires = stored_expires
        if stored_expires < datetime.now(timezone.utc):
            raise http_error(
                status.HTTP_401_UNAUTHORIZED,
                ErrorCode.UNAUTHORIZED,
                "Refresh token expired or revoked",
                request,
            )

        # Issue new access token and rotate refresh token (revoke old, insert new)
        user = db.query(models.User).filter(models.User.email == email).first()
        if not user:
            raise http_error(
                status.HTTP_401_UNAUTHORIZED,
                ErrorCode.UNAUTHORIZED,
                "User not found",
                request,
            )

        # Revoke old token
        stored.revoked = True
        db.add(stored)
        db.commit()

        new_access = create_access_token(subject=str(getattr(user, "email", "")))
        new_refresh = create_refresh_token_for_user(db, user)
        # Rotate cookie to new refresh token and do not include it in JSON body
        secure_flag = getattr(settings, "COOKIE_SECURE", False)
        if response is not None:
            # Compute max_age for cookie; if configured expiry is <= 0 use a session cookie
            _days = getattr(settings, "REFRESH_TOKEN_EXPIRE_DAYS", 7)
            try:
                _days_val = int(_days)
            except Exception:
                _days_val = 7
            max_age_val = int(_days_val * 24 * 60 * 60) if _days_val > 0 else None
            response.set_cookie(
                key="refresh_token",
                value=new_refresh,
                httponly=True,
                secure=secure_flag,
                samesite="lax",
                max_age=max_age_val,
            )
            issue_csrf_cookie(response, include_header=True)
        return Token(access_token=new_access)
    except HTTPException:
        raise
    except InvalidTokenError:
        raise http_error(
            status.HTTP_401_UNAUTHORIZED,
            ErrorCode.UNAUTHORIZED,
            "Invalid refresh token",
            request,
        )
    except Exception:
        logging.getLogger(__name__).exception("Refresh failed")
        raise internal_server_error("Refresh failed", request)


@router.post("/auth/logout")
@limiter.limit(RATE_LIMIT_AUTH)
async def logout(
    request: Request,
    response: Response,
    payload: LogoutRequest = Body(None),
    db: Session = Depends(get_db),
):
    """Logout a user and revoke all their refresh tokens.

    Authentication sources:
    - Authorization: Bearer access token (preferred)
    - HttpOnly refresh_token cookie (fallback when bearer is absent and auth disabled in tests)

    If no user can be resolved, still clear cookies to complete client-side logout.
    """
    try:
        user_email: str | None = None
        # Attempt bearer token resolution first
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            raw = auth_header.split(" ", 1)[1].strip()
            try:
                payload_decoded = decode_token(raw)
                user_email = payload_decoded.get("sub") or None
            except Exception:
                user_email = None
        # Fallback: refresh token cookie
        if not user_email:
            rt_cookie = request.cookies.get("refresh_token")
            if rt_cookie:
                try:
                    payload_decoded = decode_token(rt_cookie)
                    if payload_decoded.get("type") == "refresh":
                        user_email = payload_decoded.get("sub") or None
                except Exception:
                    user_email = None

        user = None
        if user_email:
            user = db.query(models.User).filter(models.User.email == user_email).first()

        if user:
            # Revoke ALL refresh tokens for this user
            tokens = db.query(models.RefreshToken).filter(models.RefreshToken.user_id == getattr(user, "id", None)).all()
            for t in tokens:
                t.revoked = True
                db.add(t)
            db.commit()
            db.refresh(user)
            logger.info(f"User {getattr(user, 'email', 'unknown')} logged out successfully")
        else:
            logger.info("Logout invoked without resolvable user; clearing cookies only")

        # Clear cookies regardless of user resolution
        response.delete_cookie("refresh_token", path="/", samesite="lax")
        clear_csrf_cookie(response)
        return {"ok": True, "message": "Logged out successfully"}
    except Exception as exc:
        logger.error(f"Logout error: {exc}")
        db.rollback()
        response.delete_cookie("refresh_token", path="/", samesite="lax")
        clear_csrf_cookie(response)
        return {"ok": True, "message": "Logged out (with errors)"}


@router.get("/admin/users", response_model=list[UserResponse])
@limiter.limit(RATE_LIMIT_WRITE)
async def admin_list_users(
    request: Request,
    db: Session = Depends(get_db),
    current_admin: Any = Depends(optional_require_role("admin")),
):
    _ = request  # placeholder to avoid unused warnings until logging is added
    _ = current_admin
    users = (
        db.query(models.User)
        .order_by(models.User.role.desc(), models.User.email.asc())
        .all()
    )
    return users


@router.post("/admin/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(RATE_LIMIT_WRITE)
async def admin_create_user(
    request: Request,
    payload: UserCreate = Body(...),
    db: Session = Depends(get_db),
    current_admin: Any = Depends(optional_require_role("admin")),
):
    _ = current_admin
    normalized_email = payload.email.lower().strip()
    existing = db.query(models.User).filter(models.User.email == normalized_email).first()
    if existing:
        raise http_error(
            status.HTTP_400_BAD_REQUEST,
            ErrorCode.AUTH_EMAIL_EXISTS,
            "Email already registered",
            request,
            context={"email": normalized_email},
        )

    user = models.User(
        email=normalized_email,
        full_name=(payload.full_name or "").strip() or None,
        role=payload.role or "teacher",
        hashed_password=get_password_hash(payload.password),
        is_active=True,
    )

    try:
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    except Exception as exc:
        db.rollback()
        raise internal_server_error("Unable to create user", request) from exc


@router.patch("/admin/users/{user_id}", response_model=UserResponse)
@limiter.limit(RATE_LIMIT_WRITE)
async def admin_update_user(
    request: Request,
    user_id: int,
    payload: UserUpdate = Body(...),
    db: Session = Depends(get_db),
    current_admin: Any = Depends(optional_require_role("admin")),
):
    _ = current_admin
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise http_error(status.HTTP_404_NOT_FOUND, ErrorCode.AUTH_USER_NOT_FOUND, "User not found", request)

    original_role = user.role
    original_active = bool(user.is_active)

    if payload.full_name is not None:
        cleaned = payload.full_name.strip()
        user.full_name = cleaned or None
    if payload.role is not None:
        user.role = payload.role
    if payload.is_active is not None:
        user.is_active = payload.is_active

    if original_role == "admin" and original_active:
        still_admin_and_active = user.role == "admin" and bool(user.is_active)
        if not still_admin_and_active:
            remaining_admins = (
                db.query(models.User)
                .filter(
                    models.User.role == "admin",
                    models.User.is_active.is_(True),
                    models.User.id != user.id,
                )
                .count()
            )
            if remaining_admins == 0:
                db.rollback()
                raise http_error(
                    status.HTTP_400_BAD_REQUEST,
                    ErrorCode.AUTH_LAST_ADMIN,
                    "Cannot remove the last active admin",
                    request,
                )

    try:
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise internal_server_error("Unable to update user", request) from exc


@router.delete("/admin/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(RATE_LIMIT_WRITE)
async def admin_delete_user(
    request: Request,
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: Any = Depends(optional_require_role("admin")),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise http_error(status.HTTP_404_NOT_FOUND, ErrorCode.AUTH_USER_NOT_FOUND, "User not found", request)

    if getattr(current_admin, "id", None) == user_id:
        raise http_error(
            status.HTTP_400_BAD_REQUEST,
            ErrorCode.AUTH_CANNOT_DELETE_SELF,
            "Administrators cannot delete their own account",
            request,
        )

    if user.role == "admin" and bool(user.is_active):
        remaining_admins = (
            db.query(models.User)
            .filter(
                models.User.role == "admin",
                models.User.is_active.is_(True),
                models.User.id != user.id,
            )
            .count()
        )
        if remaining_admins == 0:
            raise http_error(
                status.HTTP_400_BAD_REQUEST,
                ErrorCode.AUTH_LAST_ADMIN,
                "Cannot delete the last active admin",
                request,
            )

    try:
        db.query(models.RefreshToken).filter(models.RefreshToken.user_id == user.id).delete(synchronize_session=False)
        db.delete(user)
        db.commit()
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise internal_server_error("Unable to delete user", request) from exc


@router.post("/admin/users/{user_id}/reset-password")
@limiter.limit(RATE_LIMIT_WRITE)
async def admin_reset_password(
    request: Request,
    user_id: int,
    payload: PasswordResetRequest = Body(...),
    db: Session = Depends(get_db),
    current_admin: Any = Depends(optional_require_role("admin")),
):
    _ = current_admin
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise http_error(status.HTTP_404_NOT_FOUND, ErrorCode.AUTH_USER_NOT_FOUND, "User not found", request)

    try:
        user.hashed_password = get_password_hash(payload.new_password)
        user.failed_login_attempts = 0
        user.lockout_until = None
        user.last_failed_login_at = None
        db.query(models.RefreshToken).filter(models.RefreshToken.user_id == user.id).update({"revoked": True})
        db.add(user)
        db.commit()
        return {"status": "password_reset"}
    except Exception as exc:
        db.rollback()
        raise internal_server_error("Unable to reset password", request) from exc


@router.post("/admin/users/{user_id}/unlock")
@limiter.limit(RATE_LIMIT_WRITE)
async def admin_unlock_account(
    request: Request,
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: Any = Depends(optional_require_role("admin")),
):
    """Admin endpoint to unlock a locked user account.
    
    Resets failed login attempts, clears lockout timestamp.
    """
    _ = current_admin
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise http_error(status.HTTP_404_NOT_FOUND, ErrorCode.AUTH_USER_NOT_FOUND, "User not found", request)

    try:
        user.failed_login_attempts = 0
        user.lockout_until = None
        user.last_failed_login_at = None
        db.add(user)
        db.commit()
        logger.info(f"Admin {getattr(current_admin, 'email', 'unknown')} unlocked account for user {user.email}")
        return {
            "status": "unlocked",
            "user_id": user.id,
            "email": user.email,
            "message": f"Account for {user.email} has been unlocked"
        }
    except Exception as exc:
        db.rollback()
        raise internal_server_error("Unable to unlock account", request) from exc


@router.post("/auth/change-password")
@limiter.limit(RATE_LIMIT_WRITE)
async def change_password(
    request: Request,
    payload: PasswordChangeRequest = Body(...),
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
):
    """Allow an authenticated user to change their own password.

    Security considerations:
    - Requires current password to mitigate token theft scenarios.
    - Resets failed attempt counters and revokes existing refresh tokens.
    - Issues a fresh access token; client should discard the old one.
    """
    try:
        user = db.query(models.User).filter(models.User.id == getattr(current_user, "id", None)).first()
        if not user:
            raise http_error(status.HTTP_404_NOT_FOUND, ErrorCode.AUTH_USER_NOT_FOUND, "User not found", request)

        # Verify current password
        if not verify_password(payload.current_password, getattr(user, "hashed_password", "")):
            raise http_error(
                status.HTTP_400_BAD_REQUEST,
                ErrorCode.AUTH_INVALID_CREDENTIALS,
                "Current password is incorrect",
                request,
            )

        # Prevent reusing the same password hash (avoid meaningless change)
        if verify_password(payload.new_password, getattr(user, "hashed_password", "")):
            raise http_error(
                status.HTTP_400_BAD_REQUEST,
                ErrorCode.VALIDATION_FAILED,
                "New password must be different from current password",
                request,
            )

        # Update password & reset lockout state
        user.hashed_password = get_password_hash(payload.new_password)
        user.failed_login_attempts = 0
        user.lockout_until = None
        user.last_failed_login_at = None
        db.query(models.RefreshToken).filter(models.RefreshToken.user_id == user.id).update({"revoked": True})
        db.add(user)
        db.commit()

        # Issue new access token so client can continue without relogin
        new_access = create_access_token(subject=str(getattr(user, "email", "")))
        return {"status": "password_changed", "access_token": new_access, "token_type": "bearer"}
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise internal_server_error("Unable to change password", request) from exc
