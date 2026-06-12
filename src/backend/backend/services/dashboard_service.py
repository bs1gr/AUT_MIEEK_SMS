"""Service for managing custom dashboard configurations.

Provides CRUD operations for user-specific dashboard configurations,
including validation, permission checks, and default dashboard handling.
"""

from typing import Any, Dict, List, Optional

from sqlalchemy import and_
from sqlalchemy.orm import Session

from backend.models import CustomDashboard, User


class DashboardService:
    """Service for managing custom user dashboards."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def create_dashboard(
        self, user_id: int, name: str, configuration: Dict[str, Any], description: Optional[str] = None
    ) -> CustomDashboard:
        """Create a new dashboard for a user.

        Args:
            user_id: ID of the dashboard owner
            name: Dashboard name (must be unique per user)
            configuration: Dashboard configuration (charts, layout, etc.)
            description: Optional dashboard description

        Returns:
            Created CustomDashboard instance

        Raises:
            ValueError: If user doesn't exist
        """
        # Verify user exists
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError(f"User {user_id} not found")

        # Create dashboard
        dashboard = CustomDashboard(
            user_id=user_id, name=name, configuration=configuration, description=description, is_default=False
        )
        self.db.add(dashboard)
        self.db.commit()
        self.db.refresh(dashboard)
        return dashboard

    def get_dashboard(self, dashboard_id: int) -> Optional[CustomDashboard]:
        """Get a dashboard by ID."""
        return self.db.query(CustomDashboard).filter(CustomDashboard.id == dashboard_id).first()

    def get_user_dashboards(self, user_id: int) -> List[CustomDashboard]:
        """Get all dashboards for a user, ordered by creation date."""
        return (
            self.db.query(CustomDashboard)
            .filter(CustomDashboard.user_id == user_id)
            .order_by(CustomDashboard.created_at.desc())
            .all()
        )

    def get_default_dashboard(self, user_id: int) -> Optional[CustomDashboard]:
        """Get the default dashboard for a user."""
        return (
            self.db.query(CustomDashboard)
            .filter(and_(CustomDashboard.user_id == user_id, CustomDashboard.is_default))  # type: ignore
            .first()
        )

    def update_dashboard(
        self,
        dashboard_id: int,
        user_id: int,
        name: Optional[str] = None,
        description: Optional[str] = None,
        configuration: Optional[Dict[str, Any]] = None,
    ) -> Optional[CustomDashboard]:
        """Update a dashboard (name, description, or configuration).

        Args:
            dashboard_id: ID of dashboard to update
            user_id: ID of dashboard owner (for permission check)
            name: New dashboard name (optional)
            description: New description (optional)
            configuration: New configuration (optional)

        Returns:
            Updated CustomDashboard or None if not found
        """
        dashboard = self.db.query(CustomDashboard).filter(
            and_(CustomDashboard.id == dashboard_id, CustomDashboard.user_id == user_id)
        ).first()

        if not dashboard:
            return None

        if name is not None:
            dashboard.name = name  # type: ignore
        if description is not None:
            dashboard.description = description  # type: ignore
        if configuration is not None:
            dashboard.configuration = configuration  # type: ignore

        self.db.commit()
        self.db.refresh(dashboard)
        return dashboard

    def delete_dashboard(self, dashboard_id: int, user_id: int) -> bool:
        """Delete a dashboard (permission check included).

        Args:
            dashboard_id: ID of dashboard to delete
            user_id: ID of dashboard owner (for permission check)

        Returns:
            True if deleted, False if not found
        """
        dashboard = self.db.query(CustomDashboard).filter(
            and_(CustomDashboard.id == dashboard_id, CustomDashboard.user_id == user_id)
        ).first()

        if not dashboard:
            return False

        self.db.delete(dashboard)
        self.db.commit()
        return True

    def set_default_dashboard(self, dashboard_id: int, user_id: int) -> Optional[CustomDashboard]:
        """Set a dashboard as the user's default.

        Ensures only one dashboard per user is marked as default.

        Args:
            dashboard_id: ID of dashboard to set as default
            user_id: ID of dashboard owner (for permission check)

        Returns:
            Updated dashboard or None if not found
        """
        # Verify dashboard exists and belongs to user
        dashboard = self.db.query(CustomDashboard).filter(
            and_(CustomDashboard.id == dashboard_id, CustomDashboard.user_id == user_id)
        ).first()

        if not dashboard:
            return None

        # Unset any existing default for this user
        self.db.query(CustomDashboard).filter(
            and_(CustomDashboard.user_id == user_id, CustomDashboard.is_default)  # type: ignore
        ).update({CustomDashboard.is_default: False})

        # Set new default
        dashboard.is_default = True  # type: ignore
        self.db.commit()
        self.db.refresh(dashboard)
        return dashboard

    def validate_dashboard_name(self, user_id: int, name: str, exclude_id: Optional[int] = None) -> bool:
        """Check if a dashboard name is available for a user.

        Args:
            user_id: User ID
            name: Dashboard name to check
            exclude_id: Dashboard ID to exclude from check (for updates)

        Returns:
            True if name is available, False if already exists
        """
        query = self.db.query(CustomDashboard).filter(
            and_(CustomDashboard.user_id == user_id, CustomDashboard.name == name)
        )

        if exclude_id is not None:
            query = query.filter(CustomDashboard.id != exclude_id)

        return query.first() is None
