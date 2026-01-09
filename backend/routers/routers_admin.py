"""
Admin user management endpoints.
"""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from backend.db import get_session as get_db
from backend.models import User
from backend.routers.routers_auth import require_role
from backend.schemas.users import UserResponse

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/users", response_model=list[UserResponse])
def list_users(
    request: Request,
    db: Session = Depends(get_db),
    current_admin=Depends(require_role("admin")),
):
    """List all users (admin only)."""
    return db.query(User).all()
