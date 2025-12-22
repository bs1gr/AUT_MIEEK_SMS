
from passlib.context import CryptContext
from passlib.exc import UnknownHashError

# Support both pbkdf2_sha256 (default) and bcrypt, with bcrypt deprecated
pwd_context = CryptContext(
    schemes=["pbkdf2_sha256", "bcrypt"],
    default="pbkdf2_sha256",
    deprecated="bcrypt"
)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except UnknownHashError:
        return False
