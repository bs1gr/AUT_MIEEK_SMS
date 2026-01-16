from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


# Bulk assignment schemas
class BulkAssignRolesRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_ids: List[int] = Field(..., description="List of user IDs to assign role to")
    role_name: str = Field(..., description="Role name to assign")


class BulkGrantPermissionsRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    role_names: List[str] = Field(..., description="List of role names to grant permission to")
    permission_name: str = Field(..., description="Permission name to grant")


class PermissionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    key: str
    resource: str
    action: str
    description: Optional[str] = None
    is_active: bool = True


class RoleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: Optional[str] = None


class AssignRoleRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    role_name: str = Field(..., description="Existing role name to assign")


class GrantPermissionToRoleRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    role_name: str
    permission_name: str


class RBACSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    roles: List[RoleResponse]
    permissions: List[PermissionResponse]
    role_permissions: List[dict]
    user_roles: List[dict]
