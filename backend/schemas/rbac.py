from __future__ import annotations

from pydantic import BaseModel, Field
from pydantic import ConfigDict
from typing import List, Optional


class PermissionResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class RoleResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class AssignRoleRequest(BaseModel):
    user_id: int
    role_name: str = Field(..., description="Existing role name to assign")


class GrantPermissionToRoleRequest(BaseModel):
    role_name: str
    permission_name: str


class RBACSummary(BaseModel):
    roles: List[RoleResponse]
    permissions: List[PermissionResponse]
    role_permissions: List[dict]
    user_roles: List[dict]
