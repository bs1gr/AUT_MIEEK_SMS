import bcrypt as _bcrypt
from passlib.context import CryptContext as _CryptContext

# Passlib is only kept for verifying legacy PBKDF2-SHA256 hashes already in
# the database.  All NEW hashes use bcrypt directly (below).  Once all users
# have logged in at least once the auto-rehash path will have migrated every
# row, at which point passlib can be removed entirely.
_legacy_ctx = _CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

_BCRYPT_PREFIXES = ("$2b$", "$2a$", "$2y$")


def get_password_hash(password: str) -> str:
    return _bcrypt.hashpw(password.encode(), _bcrypt.gensalt(rounds=12)).decode()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        if hashed_password.startswith(_BCRYPT_PREFIXES):
            return _bcrypt.checkpw(plain_password.encode(), hashed_password.encode())
        return bool(_legacy_ctx.verify(plain_password, hashed_password))
    except Exception:
        return False


def needs_rehash(hashed_password: str) -> bool:
    """True when the stored hash should be upgraded to bcrypt at next login."""
    return not hashed_password.startswith(_BCRYPT_PREFIXES)
