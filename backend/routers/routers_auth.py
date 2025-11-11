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
import logging

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
        UserLogin,
        UserResponse,
        Token,
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
    UserLogin = getattr(schemas_mod, "UserLogin")
    UserResponse = getattr(schemas_mod, "UserResponse")
    Token = getattr(schemas_mod, "Token")
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

router = APIRouter()

# Use PBKDF2-SHA256 to avoid platform-specific bcrypt backend issues.
# It is widely supported, battle-tested, and avoids the 72-byte bcrypt limit.
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


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
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Any:
    credentials_exception = http_error(
        status.HTTP_401_UNAUTHORIZED,
        ErrorCode.UNAUTHORIZED,
        "Could not validate credentials",
        request,
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        email_val = payload.get("sub")  # we store email as subject
        email: str = str(email_val) if email_val is not None else ""
        if not email:
            raise credentials_exception
    except InvalidTokenError:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None or not bool(getattr(user, "is_active", False)):
        raise credentials_exception
    return user


def require_role(*roles: str):
    def _dep(request: Request, user: Any = Depends(get_current_user)) -> Any:
        if roles and user.role not in roles:
            raise http_error(
                status.HTTP_403_FORBIDDEN,
                ErrorCode.FORBIDDEN,
                "Insufficient permissions",
                request,
                context={"required_roles": roles, "current_role": getattr(user, "role", None)},
            )
        return user

    return _dep


def optional_require_role(*roles: str):
    """Return an auth dependency that is a no-op when AUTH_ENABLED is False.

    When auth is disabled, returns a lightweight dummy user-like object to satisfy
    downstream code expecting a user, without hitting the database.
    """
    if not getattr(settings, "AUTH_ENABLED", False):

        def _noop():
            class _Dummy:
                role = "admin"
                email = "anonymous@example.com"
                is_active = True

            return _Dummy()

        return _noop
    return require_role(*roles)


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
    request: Request, payload: UserLogin = Body(...), db: Session = Depends(get_db), response: Response = None
):
    try:
        user = db.query(models.User).filter(models.User.email == payload.email.lower().strip()).first()
        hashed_pw = str(getattr(user, "hashed_password", "")) if user else ""
        if not user or not verify_password(payload.password, hashed_pw):
            raise http_error(
                status.HTTP_400_BAD_REQUEST,
                ErrorCode.AUTH_INVALID_CREDENTIALS,
                "Invalid email or password",
                request,
            )

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
            # Do NOT include refresh_token in JSON responses; clients must rely on HttpOnly cookie
            return Token(access_token=access_token)
        except Exception:
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
async def refresh(request: Request, payload: RefreshRequest = Body(None), db: Session = Depends(get_db), response: Response = None):
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
async def logout(request: Request, payload: LogoutRequest = Body(None), db: Session = Depends(get_db)):
    try:
        raw = (payload.refresh_token if payload is not None else None) or request.cookies.get("refresh_token")
        if not raw:
            raise http_error(
                status.HTTP_401_UNAUTHORIZED,
                ErrorCode.UNAUTHORIZED,
                "Invalid token",
                request,
            )
        payload_decoded = decode_token(raw)
        jti = payload_decoded.get("jti")
        if not jti:
            raise http_error(
                status.HTTP_401_UNAUTHORIZED,
                ErrorCode.UNAUTHORIZED,
                "Invalid token",
                request,
            )
        revoked = revoke_refresh_token_by_jti(db, jti)
        # Clear refresh cookie on logout
        resp = JSONResponse(content={"ok": True})
        resp.delete_cookie("refresh_token")
        return resp
    except Exception:
        # On unexpected errors, still return 200 to keep logout idempotent
        resp = JSONResponse(content={"ok": True})
        resp.delete_cookie("refresh_token")
        return resp
