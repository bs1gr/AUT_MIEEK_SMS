from passlib.context import CryptContext

# Default to PBKDF2-SHA256 with bcrypt as an allowed alternative for migrated hashes
pwd_context = CryptContext(schemes=["pbkdf2_sha256", "bcrypt"], deprecated="auto")


def get_password_hash(password: str) -> str:
    """Return a hashed password suitable for storage."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against the stored hash."""
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False
