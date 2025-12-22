"""Smoke tests for JWT (PyJWT) functionality.
Guards against regressions in the python-jose → PyJWT migration."""

from datetime import datetime, timedelta, timezone
import jwt

# Secret key for testing (matches backend config pattern)
SECRET_KEY = "test-secret-key-for-jwt-smoke-tests"  # pragma: allowlist secret
ALGORITHM = "HS256"


def test_jwt_encode_decode():
    payload = {
        "sub": "user@example.com",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    decoded = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    assert decoded["sub"] == "user@example.com"
