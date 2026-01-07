from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    role: str
    is_active: bool
    full_name: Optional[str] = None
