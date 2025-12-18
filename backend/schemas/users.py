from pydantic import BaseModel, EmailStr
from typing import Optional

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    role: str
    is_active: bool
    full_name: Optional[str] = None

    @classmethod
    def model_validate(cls, user):
        return cls(
            id=getattr(user, "id", None),
            email=getattr(user, "email", None),
            role=getattr(user, "role", None),
            is_active=getattr(user, "is_active", None),
            full_name=getattr(user, "full_name", None),
        )
