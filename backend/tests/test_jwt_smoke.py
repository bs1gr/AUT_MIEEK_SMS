"""
Smoke tests for JWT (PyJWT) functionality.
Guards against regressions in the python-jose → PyJWT migration.
"""

import jwt
import pytest
from datetime import datetime, timedelta, timezone


# Secret key for testing (matches backend config pattern)
SECRET_KEY = "test-secret-key-for-jwt-smoke-tests"
ALGORITHM = "HS256"


def test_jwt_encode_valid_payload():
    """Test encoding a valid JWT with timezone-aware expiration."""
    payload = {"sub": "test_user", "role": "admin", "exp": datetime.now(timezone.utc) + timedelta(hours=1)}

    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

    assert isinstance(token, str)
    assert len(token) > 0
    assert token.count(".") == 2  # JWT format: header.payload.signature


def test_jwt_decode_valid_token():
    """Test decoding a valid, unexpired token."""
    payload = {"sub": "test_user", "role": "admin", "exp": datetime.now(timezone.utc) + timedelta(hours=1)}
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

    decoded = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

    assert decoded["sub"] == "test_user"
    assert decoded["role"] == "admin"
    assert "exp" in decoded


def test_jwt_decode_expired_token():
    """Test that expired tokens raise InvalidTokenError."""
    payload = {
        "sub": "test_user",
        "exp": datetime.now(timezone.utc) - timedelta(hours=1),  # Expired 1 hour ago
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

    with pytest.raises(jwt.InvalidTokenError):
        jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])


def test_jwt_decode_invalid_signature():
    """Test that tokens with wrong signature raise InvalidTokenError."""
    payload = {"sub": "test_user", "exp": datetime.now(timezone.utc) + timedelta(hours=1)}
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

    wrong_secret = "wrong-secret-key"
    with pytest.raises(jwt.InvalidTokenError):
        jwt.decode(token, wrong_secret, algorithms=[ALGORITHM])


def test_jwt_decode_malformed_token():
    """Test that malformed tokens raise InvalidTokenError."""
    malformed_tokens = [
        "not.a.valid.jwt.token",
        "invalidtoken",
        "",
        "header.payload",  # Missing signature
    ]

    for malformed in malformed_tokens:
        with pytest.raises(jwt.InvalidTokenError):
            jwt.decode(malformed, SECRET_KEY, algorithms=[ALGORITHM])


def test_jwt_no_expiration():
    """Test token without expiration (should decode successfully)."""
    payload = {"sub": "test_user", "role": "viewer"}
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

    # Decode without expiration validation
    decoded = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], options={"verify_exp": False})

    assert decoded["sub"] == "test_user"
    assert decoded["role"] == "viewer"


def test_jwt_timezone_aware_expiration():
    """Test that timezone-aware datetime works correctly (no utcnow() deprecation)."""
    # This is the pattern we use in production to avoid datetime.utcnow() deprecation
    exp_time = datetime.now(timezone.utc) + timedelta(minutes=30)
    payload = {"sub": "test_user", "exp": exp_time}

    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    decoded = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

    assert decoded["sub"] == "test_user"
    # Verify exp is within expected range (allow 1 second tolerance)
    decoded_exp = datetime.fromtimestamp(decoded["exp"], tz=timezone.utc)
    time_diff = abs((decoded_exp - exp_time).total_seconds())
    assert time_diff < 1.0
