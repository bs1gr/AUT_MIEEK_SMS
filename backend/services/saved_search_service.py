"""
Saved Search Service for Student Management System.

Handles CRUD operations for saved search queries, allowing users to
save and reuse complex search criteria.

Author: AI Agent
Date: January 22, 2026
Version: 1.0.0
"""

from typing import Optional, List, Dict
from sqlalchemy.orm import Session
from sqlalchemy import desc
import logging

from backend.models import SavedSearch
from backend.schemas.search import SavedSearchCreateSchema, SavedSearchUpdateSchema

logger = logging.getLogger(__name__)


class SavedSearchService:
    """Service for managing saved searches."""

    def __init__(self, db: Session):
        """
        Initialize SavedSearchService with database session.

        Args:
            db: SQLAlchemy database session
        """
        self.db = db

    # ============================================================================
    # CREATE OPERATIONS
    # ============================================================================

    def create_saved_search(self, user_id: int, create_data: SavedSearchCreateSchema) -> Optional[SavedSearch]:
        """
        Create a new saved search.

        Args:
            user_id: User ID who owns the search
            create_data: SavedSearchCreateSchema with search details

        Returns:
            Created SavedSearch object or None if error

        Raises:
            Exception: If database operation fails
        """
        try:
            saved_search = SavedSearch(
                user_id=user_id,
                name=create_data.name,
                description=create_data.description,
                search_type=create_data.search_type,
                query=create_data.query,
                filters=create_data.filters,
                is_favorite=create_data.is_favorite,
            )
            self.db.add(saved_search)
            self.db.commit()
            self.db.refresh(saved_search)
            logger.info(f"Created saved search: {saved_search.id} for user {user_id}")
            return saved_search
        except Exception as e:
            logger.error(f"Error creating saved search: {str(e)}")
            self.db.rollback()
            raise

    # ============================================================================
    # READ OPERATIONS
    # ============================================================================

    def get_saved_search(self, search_id: int, user_id: int) -> Optional[SavedSearch]:
        """
        Get a saved search by ID (verify user ownership).

        Args:
            search_id: Saved search ID
            user_id: User ID (for verification)

        Returns:
            SavedSearch object or None if not found or unauthorized
        """
        try:
            saved_search = (
                self.db.query(SavedSearch)
                .filter(
                    SavedSearch.id == search_id,
                    SavedSearch.user_id == user_id,
                    SavedSearch.deleted_at.is_(None),
                )
                .first()
            )
            return saved_search
        except Exception as e:
            logger.error(f"Error getting saved search {search_id}: {str(e)}")
            return None

    def get_user_saved_searches(
        self, user_id: int, search_type: Optional[str] = None, is_favorite: Optional[bool] = None, limit: int = 100
    ) -> List[SavedSearch]:
        """
        Get all saved searches for a user (with optional filtering).

        Args:
            user_id: User ID
            search_type: Optional filter by search type
            is_favorite: Optional filter by favorite status
            limit: Maximum results (default: 100)

        Returns:
            List of SavedSearch objects
        """
        try:
            query = (
                self.db.query(SavedSearch)
                .filter(
                    SavedSearch.user_id == user_id,
                    SavedSearch.deleted_at.is_(None),
                )
                .order_by(desc(SavedSearch.updated_at))
            )

            if search_type:
                query = query.filter(SavedSearch.search_type == search_type)

            if is_favorite is not None:
                query = query.filter(SavedSearch.is_favorite == is_favorite)

            return query.limit(limit).all()
        except Exception as e:
            logger.error(f"Error getting saved searches for user {user_id}: {str(e)}")
            return []

    def get_favorite_saved_searches(self, user_id: int, limit: int = 50) -> List[SavedSearch]:
        """
        Get user's favorite saved searches.

        Args:
            user_id: User ID
            limit: Maximum results (default: 50)

        Returns:
            List of favorite SavedSearch objects
        """
        return self.get_user_saved_searches(user_id, is_favorite=True, limit=limit)

    # ============================================================================
    # UPDATE OPERATIONS
    # ============================================================================

    def update_saved_search(
        self, search_id: int, user_id: int, update_data: SavedSearchUpdateSchema
    ) -> Optional[SavedSearch]:
        """
        Update a saved search.

        Args:
            search_id: Saved search ID
            user_id: User ID (for verification)
            update_data: SavedSearchUpdateSchema with updated fields

        Returns:
            Updated SavedSearch object or None if not found

        Raises:
            Exception: If database operation fails
        """
        try:
            saved_search = (
                self.db.query(SavedSearch)
                .filter(
                    SavedSearch.id == search_id,
                    SavedSearch.user_id == user_id,
                    SavedSearch.deleted_at.is_(None),
                )
                .first()
            )

            if not saved_search:
                logger.warning(f"Saved search {search_id} not found or unauthorized for user {user_id}")
                return None

            # Update only provided fields
            update_dict = update_data.dict(exclude_unset=True)
            for key, value in update_dict.items():
                setattr(saved_search, key, value)

            self.db.commit()
            self.db.refresh(saved_search)
            logger.info(f"Updated saved search: {search_id}")
            return saved_search
        except Exception as e:
            logger.error(f"Error updating saved search {search_id}: {str(e)}")
            self.db.rollback()
            raise

    def toggle_favorite(self, search_id: int, user_id: int) -> Optional[SavedSearch]:
        """
        Toggle favorite status of a saved search.

        Args:
            search_id: Saved search ID
            user_id: User ID (for verification)

        Returns:
            Updated SavedSearch object or None if not found

        Raises:
            Exception: If database operation fails
        """
        try:
            saved_search = (
                self.db.query(SavedSearch)
                .filter(
                    SavedSearch.id == search_id,
                    SavedSearch.user_id == user_id,
                    SavedSearch.deleted_at.is_(None),
                )
                .first()
            )

            if not saved_search:
                return None

            saved_search.is_favorite = not saved_search.is_favorite
            self.db.commit()
            self.db.refresh(saved_search)
            logger.info(f"Toggled favorite for saved search {search_id}: {saved_search.is_favorite}")
            return saved_search
        except Exception as e:
            logger.error(f"Error toggling favorite for search {search_id}: {str(e)}")
            self.db.rollback()
            raise

    # ============================================================================
    # DELETE OPERATIONS
    # ============================================================================

    def delete_saved_search(self, search_id: int, user_id: int, hard_delete: bool = False) -> bool:
        """
        Delete a saved search (soft delete by default).

        Args:
            search_id: Saved search ID
            user_id: User ID (for verification)
            hard_delete: If True, permanently delete; if False, soft delete

        Returns:
            True if deleted successfully, False otherwise

        Raises:
            Exception: If database operation fails
        """
        try:
            saved_search = (
                self.db.query(SavedSearch)
                .filter(
                    SavedSearch.id == search_id,
                    SavedSearch.user_id == user_id,
                    SavedSearch.deleted_at.is_(None),
                )
                .first()
            )

            if not saved_search:
                logger.warning(f"Saved search {search_id} not found or unauthorized for user {user_id}")
                return False

            if hard_delete:
                self.db.delete(saved_search)
                logger.info(f"Hard deleted saved search: {search_id}")
            else:
                saved_search.mark_deleted()
                logger.info(f"Soft deleted saved search: {search_id}")

            self.db.commit()
            return True
        except Exception as e:
            logger.error(f"Error deleting saved search {search_id}: {str(e)}")
            self.db.rollback()
            raise

    def delete_all_user_searches(self, user_id: int, hard_delete: bool = False) -> int:
        """
        Delete all saved searches for a user.

        Args:
            user_id: User ID
            hard_delete: If True, permanently delete; if False, soft delete

        Returns:
            Number of searches deleted

        Raises:
            Exception: If database operation fails
        """
        try:
            searches = self.get_user_saved_searches(user_id, limit=1000)

            for search in searches:
                self.delete_saved_search(int(search.id), user_id, hard_delete=hard_delete)

            logger.info(f"Deleted {len(searches)} saved searches for user {user_id}")
            return len(searches)
        except Exception as e:
            logger.error(f"Error deleting all searches for user {user_id}: {str(e)}")
            self.db.rollback()
            raise

    # ============================================================================
    # UTILITY METHODS
    # ============================================================================

    def get_search_stats(self, user_id: int) -> Dict[str, int]:
        """
        Get saved search statistics for a user.

        Args:
            user_id: User ID

        Returns:
            Dictionary with statistics
        """
        try:
            total = (
                self.db.query(SavedSearch)
                .filter(
                    SavedSearch.user_id == user_id,
                    SavedSearch.deleted_at.is_(None),
                )
                .count()
            )

            favorites = (
                self.db.query(SavedSearch)
                .filter(
                    SavedSearch.user_id == user_id,
                    SavedSearch.is_favorite.is_(True),
                    SavedSearch.deleted_at.is_(None),
                )
                .count()
            )

            by_type: Dict[str, int] = {}
            for search_type in ["students", "courses", "grades"]:
                count = (
                    self.db.query(SavedSearch)
                    .filter(
                        SavedSearch.user_id == user_id,
                        SavedSearch.search_type == search_type,
                        SavedSearch.deleted_at.is_(None),
                    )
                    .count()
                )
                by_type[search_type] = count

            return {
                "total": total,
                "favorites": favorites,
                "by_type": by_type,
            }
        except Exception as e:
            logger.error(f"Error getting search stats for user {user_id}: {str(e)}")
            return {"total": 0, "favorites": 0, "by_type": {}}

    def duplicate_saved_search(
        self, search_id: int, user_id: int, new_name: Optional[str] = None
    ) -> Optional[SavedSearch]:
        """
        Duplicate an existing saved search with a new name.

        Args:
            search_id: Original saved search ID
            user_id: User ID (for verification)
            new_name: Optional new name (defaults to "Copy of {original_name}")

        Returns:
            New SavedSearch object or None if original not found

        Raises:
            Exception: If database operation fails
        """
        try:
            original = self.get_saved_search(search_id, user_id)
            if not original:
                return None

            copy_name = new_name or f"Copy of {original.name}"
            create_data = SavedSearchCreateSchema(
                name=copy_name,
                description=str(original.description) if original.description else None,
                search_type=str(original.search_type),
                query=str(original.query) if original.query else None,
                filters=dict(original.filters) if original.filters else None,
                is_favorite=False,
            )

            new_search = self.create_saved_search(user_id, create_data)
            logger.info(f"Duplicated saved search {search_id} to {new_search.id}")
            return new_search
        except Exception as e:
            logger.error(f"Error duplicating saved search {search_id}: {str(e)}")
            raise
