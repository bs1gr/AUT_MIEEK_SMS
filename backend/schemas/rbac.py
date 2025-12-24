from __future__ import annotations
from typing import List, Optional
from pydantic import BaseModel, Field
from pydantic import ConfigDict


# Bulk assignment schemas
class BulkAssignRolesRequest(BaseModel):
    user_ids: List[int] = Field(..., description="List of user IDs to assign role to")
    role_name: str = Field(..., description="Role name to assign")


class BulkGrantPermissionsRequest(BaseModel):
    role_names: List[str] = Field(..., description="List of role names to grant permission to")
    permission_name: str = Field(..., description="Permission name to grant")


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
