from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    role: str
    is_active: bool
    full_name: Optional[str] = None
    # The frontend's ChangePasswordPromptModal keys off this; without it the prompt
    # could never appear (this is the UserResponse that backend.schemas exports).
    password_change_required: bool = False
