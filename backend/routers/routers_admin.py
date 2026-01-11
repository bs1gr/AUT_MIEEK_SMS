"""
Admin user management endpoints.
"""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from backend.db import get_session as get_db
from backend.models import User
from backend.rbac import require_permission
from backend.schemas.users import UserResponse

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/users", response_model=list[UserResponse])
@require_permission("users:view")
def list_users(
    request: Request,
    db: Session = Depends(get_db),
):
    """List all users (admin only)."""
    return db.query(User).all()
