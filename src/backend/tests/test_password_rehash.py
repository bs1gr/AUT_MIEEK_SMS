"""
Tests for the password hashing layer.

New hashes are bcrypt ($2b$).  Legacy PBKDF2-SHA256 hashes are still verified
but are flagged for upgrade via needs_rehash().
"""

from backend.security.password_hash import (
    get_password_hash,
    needs_rehash,
    verify_password,
)


def test_new_hash_is_bcrypt():
    h = get_password_hash("testpassword123")
    assert h.startswith("$2b$"), f"Expected bcrypt hash, got: {h[:20]}"


def test_bcrypt_hash_does_not_need_rehash():
    h = get_password_hash("testpassword123")
    assert needs_rehash(h) is False


def test_pbkdf2_hash_needs_rehash():
    from passlib.context import CryptContext
    pbkdf2_hash = CryptContext(schemes=["pbkdf2_sha256"]).hash("testpassword123")
    assert needs_rehash(pbkdf2_hash) is True


def test_verify_bcrypt_hash():
    password = "testpassword123"
    h = get_password_hash(password)
    assert verify_password(password, h) is True
    assert verify_password("wrongpassword", h) is False


def test_verify_legacy_pbkdf2_hash():
    from passlib.context import CryptContext
    password = "testpassword123"
    pbkdf2_hash = CryptContext(schemes=["pbkdf2_sha256"]).hash(password)
    assert verify_password(password, pbkdf2_hash) is True
    assert verify_password("wrongpassword", pbkdf2_hash) is False


def test_verify_invalid_hash_returns_false():
    assert verify_password("password", "not-a-valid-hash") is False
    assert verify_password("password", "") is False
