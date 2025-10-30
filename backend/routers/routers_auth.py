from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Request, Body
from fastapi.security import OAuth2PasswordBearer
import jwt
from jwt import InvalidTokenError
from passlib.context import CryptContext
from sqlalchemy.orm import Session

# Local imports resilient to run path
try:
    from backend.db import get_session as get_db
    from backend.config import settings
    from backend import models
    from backend.schemas import UserCreate, UserLogin, UserResponse, Token
    from backend.rate_limiting import limiter, RATE_LIMIT_AUTH
except ModuleNotFoundError:
    from db import get_session as get_db
    from config import settings
    import models
    from schemas import UserCreate, UserLogin, UserResponse, Token
    from rate_limiting import limiter, RATE_LIMIT_AUTH

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
async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
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
    def _dep(user: models.User = Depends(get_current_user)) -> models.User:
        if roles and user.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
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
    # Ensure email uniqueness
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create user
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


@router.post("/auth/login", response_model=Token)
@limiter.limit(RATE_LIMIT_AUTH)
async def login(request: Request, payload: UserLogin = Body(...), db: Session = Depends(get_db)):
    user: Optional[models.User] = (
        db.query(models.User).filter(models.User.email == payload.email.lower().strip()).first()
    )
    hashed_pw = str(getattr(user, "hashed_password", "")) if user else ""
    if not user or not verify_password(payload.password, hashed_pw):
        # Use same error for both cases to avoid user enumeration
        raise HTTPException(status_code=400, detail="Invalid email or password")

    access_token = create_access_token(subject=str(getattr(user, "email", "")))
    return Token(access_token=access_token)


@router.get("/auth/me", response_model=UserResponse)
@limiter.limit(RATE_LIMIT_AUTH)
async def me(request: Request, current_user: models.User = Depends(get_current_user)):
    return current_user
