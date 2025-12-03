"""Generic base service helpers.

Provides minimal shared helpers for services that wrap SQLAlchemy models.
This is intentionally small to avoid over-abstraction.
"""
from __future__ import annotations

from typing import Generic, Type, TypeVar
from sqlalchemy.orm import Session

T = TypeVar("T")


class BaseService(Generic[T]):
    def __init__(self, model: Type[T], db: Session) -> None:
        self.model = model
        self.db = db

    def get_all(self, skip: int = 0, limit: int = 100):
        return (
            self.db.query(self.model)
            .filter(getattr(self.model, "deleted_at", None).is_(None) if hasattr(self.model, "deleted_at") else True)
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_by_id(self, entity_id: int):
        return self.db.query(self.model).filter(getattr(self.model, "id") == entity_id).first()
