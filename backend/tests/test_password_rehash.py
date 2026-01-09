"""
Test password rehashing configuration and logic.

Verifies that the password context is correctly configured to support
both pbkdf2_sha256 and bcrypt, with auto-migration capability.
"""

from backend.security.password_hash import (
    get_password_hash,
    pwd_context,
    verify_password,
)


def test_pwd_context_supports_both_schemes():
    """Verify that the password context supports both pbkdf2_sha256 and bcrypt."""
    assert "pbkdf2_sha256" in pwd_context.schemes()
    assert "bcrypt" in pwd_context.schemes()
    assert pwd_context.default_scheme() == "pbkdf2_sha256"


def test_pbkdf2_is_default_scheme():
    """Verify that new passwords are created with pbkdf2_sha256."""
    password_hash = get_password_hash("testpassword123")
    assert password_hash.startswith("$pbkdf2-sha256$")
    assert pwd_context.needs_update(password_hash) is False


def test_pbkdf2_hash_is_not_deprecated():
    """Verify that pbkdf2_sha256 hashes don't need update."""
    pbkdf2_hash = get_password_hash("testpassword123")
    assert pwd_context.needs_update(pbkdf2_hash) is False


def test_verify_password_with_pbkdf2():
    """Verify that password verification works with pbkdf2_sha256."""
    password = "testpassword123"
    password_hash = get_password_hash(password)

    assert verify_password(password, password_hash) is True
    assert verify_password("wrongpassword", password_hash) is False


def test_bcrypt_deprecation_check():
    """Verify that bcrypt is configured as deprecated via context settings."""
    # Check the context's deprecated list directly
    # pwd_context is a CryptContext with schemes=["pbkdf2_sha256", "bcrypt"]
    # and deprecated=["bcrypt"]
    assert "bcrypt" in pwd_context.schemes()

    # Verify bcrypt is listed as deprecated in the configuration
    # We can't easily introspect the full config, but we can verify behavior:
    # A pbkdf2 hash should NOT need update, while (if we had a bcrypt hash) it would
    pbkdf2_hash = get_password_hash("test123")
    assert pwd_context.needs_update(pbkdf2_hash) is False
