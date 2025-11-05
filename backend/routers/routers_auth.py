from datetime import datetime, timedelta, timezone
from typing import Optional, Any, TYPE_CHECKING

from fastapi import APIRouter, Depends, HTTPException, status, Request, Body
from fastapi.security import OAuth2PasswordBearer
import jwt
from jwt import InvalidTokenError
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from backend.errors import ErrorCode, http_error, internal_server_error

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
    from backend.schemas import UserCreate, UserLogin, UserResponse, Token  # type: ignore
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

    user: Optional[models.User] = db.query(models.User).filter(models.User.email == email).first()
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

        user = models.User(
            email=payload.email.lower().strip(),
            full_name=(payload.full_name or "").strip() or None,
            role=(payload.role or "teacher"),
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
async def login(request: Request, payload: UserLogin = Body(...), db: Session = Depends(get_db)):
    try:
        user: Optional[models.User] = (
            db.query(models.User).filter(models.User.email == payload.email.lower().strip()).first()
        )
        hashed_pw = str(getattr(user, "hashed_password", "")) if user else ""
        if not user or not verify_password(payload.password, hashed_pw):
            raise http_error(
                status.HTTP_400_BAD_REQUEST,
                ErrorCode.AUTH_INVALID_CREDENTIALS,
                "Invalid email or password",
                request,
            )

        access_token = create_access_token(subject=str(getattr(user, "email", "")))
        return Token(access_token=access_token)
    except HTTPException:
        raise
    except Exception as exc:
        raise internal_server_error("Login failed", request) from exc


@router.get("/auth/me", response_model=UserResponse)
@limiter.limit(RATE_LIMIT_AUTH)
async def me(request: Request, current_user: Any = Depends(get_current_user)):
    return current_user
