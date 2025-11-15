from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field, field_validator, ConfigDict
from typing import Optional, Callable, List


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


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(UserBase):
    id: int
    is_active: bool

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
