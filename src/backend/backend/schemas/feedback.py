"""
Feedback schemas for unified feedback inbox.
"""

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


class FeedbackEntry(BaseModel):
    """Feedback entry for app and GitHub sources."""

    model_config = ConfigDict(from_attributes=True)

    id: int = Field(..., description="Audit log ID")
    source: str = Field(..., description="Source system (app/github)")
    kind: Optional[str] = Field(None, description="Feedback type (issue, pr, discussion, etc.)")
    title: Optional[str] = Field(None, description="Short title or summary")
    body: Optional[str] = Field(None, description="Full feedback body")
    url: Optional[str] = Field(None, description="Source URL")
    author: Optional[str] = Field(None, description="Author or reporter")
    created_at: Optional[datetime] = Field(None, description="Original creation time")
    received_at: datetime = Field(..., description="When the system received the entry")
    repository: Optional[str] = Field(None, description="Repository identifier")
    metadata: Optional[dict[str, Any]] = Field(None, description="Additional metadata")
    archived: bool = Field(False, description="Whether the entry is archived")


class FeedbackImportItem(BaseModel):
    """Single GitHub feedback item payload."""

    kind: str = Field(..., description="Item type (issue, pr, review_comment, discussion, etc.)")
    title: str = Field(..., description="Item title")
    body: Optional[str] = Field(None, description="Item body")
    url: Optional[str] = Field(None, description="Source URL")
    author: Optional[str] = Field(None, description="Author name")
    created_at: Optional[datetime] = Field(None, description="Original creation timestamp")
    repository: Optional[str] = Field(None, description="Repository identifier")
    source_id: Optional[str] = Field(None, description="External identifier")
    metadata: Optional[dict[str, Any]] = Field(None, description="Additional metadata")


class FeedbackImportRequest(BaseModel):
    """Import request containing GitHub items."""

    items: list[FeedbackImportItem] = Field(default_factory=list, description="Items to import")


class FeedbackImportResponse(BaseModel):
    """Response for feedback imports."""

    imported: int = Field(..., description="Number of imported items")
