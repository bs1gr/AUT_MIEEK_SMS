"""Passwords that have been published in this (public) repository.

They were shipped as bootstrap/default admin passwords in templates, docs and
the SMS_Lite entrypoint, so anyone can know them. A successful login with one
of them forces a password change (see routers_auth.login and
security.current_user.password_change_blocks), and none of them may be chosen
as a new password.
"""

from __future__ import annotations

PUBLISHED_DEFAULT_PASSWORDS: frozenset[str] = frozenset(
    {
        "AdminPassword123!",  # SMS_Lite default + old src/backend/.env.example
        "YourSecurePassword123!",  # old config/.env.example, E2E seed admin
        "ChangeMe123!",
        "Qw9E4rT7yU2iO5pA1sD8fG6hJ3kL0zX_",  # was committed in production.env.SECURE
        "change-me-generated-on-first-run",  # template placeholder
    }
)
_LOWERED = frozenset(p.lower() for p in PUBLISHED_DEFAULT_PASSWORDS)


def is_published_default_password(password: str | None) -> bool:
    """Case-insensitive match against passwords published in the repository."""
    return bool(password) and str(password).lower() in _LOWERED
