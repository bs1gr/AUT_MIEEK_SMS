from __future__ import annotations

from typing import Callable, List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


def _validate_password_strength(value: str, field_name: str = "password") -> str:
    if any(c.isspace() for c in value):
        raise ValueError(f"{field_name.capitalize()} must not contain whitespace")

    checks: List[tuple[str, Callable[[str], bool]]] = [
        ("uppercase letter", lambda ch: ch.isupper()),
        ("lowercase letter", lambda ch: ch.islower()),
        ("digit", lambda ch: ch.isdigit()),
        ("special character", lambda ch: not ch.isalnum()),
    ]

    missing = [name for name, predicate in checks if not any(predicate(ch) for ch in value)]
    if missing:
        if len(missing) == 1:
            detail = missing[0]
        else:
            detail = ", ".join(missing[:-1]) + f", and {missing[-1]}"
        raise ValueError(f"{field_name.capitalize()} must contain at least one {detail}.")

    return value


class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    role: Optional[str] = Field(default="teacher", pattern=r"^(admin|teacher|student)$")


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        return _validate_password_strength(v, "password")


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, max_length=200)
    role: Optional[str] = Field(default=None, pattern=r"^(admin|teacher|student)$")
    is_active: Optional[bool] = None


class PasswordResetRequest(BaseModel):
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        return _validate_password_strength(v, "new password")


class PasswordChangeRequest(BaseModel):
    """Authenticated user password change request.

    Requires providing the current password (to prevent unauthorized changes)
    and the desired new password which must satisfy the same strength rules.
    """

    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        return _validate_password_strength(v, "new password")

    @field_validator("current_password")
    @classmethod
    def validate_current_password(cls, v: str) -> str:
        # Do not enforce strength for current password (could be legacy weak one)
        # But still disallow whitespace for consistency.
        if any(c.isspace() for c in v):
            raise ValueError("Current password must not contain whitespace")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(UserBase):
    id: int
    is_active: bool
    password_change_required: bool = False

    # Pydantic v2 style configuration
    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    refresh_token: Optional[str] = None


class RefreshRequest(BaseModel):
    refresh_token: Optional[str] = None


class RefreshResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LogoutRequest(BaseModel):
    refresh_token: Optional[str] = None
