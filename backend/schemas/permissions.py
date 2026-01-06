"""
Pydantic schemas for RBAC permission management (new structure).

Supports the enhanced permission model with key, resource, action fields.
"""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class PermissionBase(BaseModel):
    """Base permission schema with common fields."""

    key: str = Field(..., description="Unique permission key (e.g., 'students:view')")
    resource: str = Field(..., description="Resource name (e.g., 'students')")
    action: str = Field(..., description="Action name (e.g., 'view', 'edit')")
    description: Optional[str] = Field(None, description="Human-readable description")


class PermissionCreate(PermissionBase):
    """Schema for creating a new permission."""

    pass


class PermissionUpdate(BaseModel):
    """Schema for updating a permission."""

    description: Optional[str] = None
    is_active: Optional[bool] = None


class PermissionDetail(PermissionBase):
    """Detailed permission response with metadata."""

    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PermissionListItem(BaseModel):
    """Simplified permission for list responses."""

    id: int
    key: str
    resource: str
    action: str
    description: Optional[str] = None
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class UserPermissionGrant(BaseModel):
    """Schema for granting a permission directly to a user."""

    user_id: int = Field(..., description="ID of the user to grant permission to")
    permission_key: str = Field(..., description="Permission key to grant")
    expires_at: Optional[datetime] = Field(None, description="Optional expiration datetime")


class UserPermissionRevoke(BaseModel):
    """Schema for revoking a direct user permission."""

    user_id: int
    permission_key: str


class RolePermissionGrant(BaseModel):
    """Schema for granting a permission to a role."""

    role_name: str = Field(..., description="Name of the role")
    permission_key: str = Field(..., description="Permission key to grant")


class RolePermissionRevoke(BaseModel):
    """Schema for revoking a permission from a role."""

    role_name: str
    permission_key: str


class UserPermissionsResponse(BaseModel):
    """Response showing all permissions for a user."""

    user_id: int
    email: str
    role: str
    permissions: list[str] = Field(..., description="List of permission keys")
    direct_permissions: list[dict] = Field(..., description="Direct user permission assignments")
    role_permissions: list[dict] = Field(..., description="Permissions via roles")


class PermissionsByResourceResponse(BaseModel):
    """Permissions grouped by resource."""

    resource: str
    permissions: list[PermissionListItem]


class PermissionStatsResponse(BaseModel):
    """Statistics about permissions in the system."""

    total_permissions: int
    active_permissions: int
    inactive_permissions: int
    permissions_by_resource: dict[str, int]
    most_common_actions: list[tuple[str, int]]
