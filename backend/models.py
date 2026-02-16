"""
IMPROVED: Student Management System - Enhanced Database Models
Features:
- Proper database indexing for performance
- Better type hints
- Docstrings for all models
- Index creation for frequently queried fields
"""

import logging
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any, ClassVar

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    create_engine,
    text,
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker

logger = logging.getLogger(__name__)
Base: Any = declarative_base()


class SoftDeleteQuery:
    """Custom query class that automatically filters soft-deleted records.

    OPTIMIZATION (v1.15.0): All queries on SoftDeleteMixin models will
    automatically exclude deleted_at IS NOT NULL records, preventing
    deleted items from appearing in results.
    """

    @staticmethod
    def _auto_filter_deleted(query):
        """Filter out soft-deleted records from query.

        This is called automatically on all queries involving SoftDeleteMixin models.
        """
        # Find all entities being queried that use SoftDeleteMixin
        for entity in query.column_descriptions:
            if hasattr(entity.get("entity", None), "deleted_at"):
                # Add filter: deleted_at IS NULL
                model = entity["entity"]
                query = query.filter(model.deleted_at.is_(None))
        return query


class SoftDeleteMixin:
    """Mixin providing soft-delete support with a nullable timestamp.

    All queries on models using this mixin automatically exclude
    soft-deleted records (deleted_at IS NOT NULL).
    """

    deleted_at = Column(DateTime(timezone=True), nullable=True, index=True)

    def mark_deleted(self) -> None:
        """Mark the instance as deleted using a timezone-aware timestamp."""
        self.deleted_at = datetime.now(timezone.utc)  # type: ignore[assignment]


class Student(SoftDeleteMixin, Base):
    """Student information table with indexes for common queries"""

    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(100), nullable=False, index=False)
    last_name = Column(String(100), nullable=False, index=False)
    email = Column(String(255), unique=True, nullable=False, index=True)  # ✅ ADDED INDEX
    student_id = Column(String(50), unique=True, nullable=False, index=True)  # ✅ ADDED INDEX
    # Remove Python-side default so that None stays None when not provided
    enrollment_date = Column(Date, index=True)  # ✅ ADDED INDEX
    is_active = Column(Boolean, default=True, index=True)  # ✅ ADDED INDEX for filtering

    # Extended profile fields
    father_name = Column(String(100))
    mobile_phone = Column(String(30))
    phone = Column(String(30))
    health_issue = Column(Text)
    note = Column(Text)
    study_year = Column(Integer)
    academic_year = Column(String(2), index=True)
    class_division = Column(String(50), index=True)

    # Relationships with cascade delete
    # These are runtime SQLAlchemy relationship() attributes. We avoid class-level
    # typing annotations here because SQLAlchemy's declarative mapper interprets
    # annotations as mapping hints; use SQLAlchemy's Mapped[] generics if stronger
    # typing is desired in future (requires sqlalchemy2-stubs). Keeping plain
    # assignments preserves runtime behavior and avoids mapper errors.
    attendances = relationship("Attendance", back_populates="student", cascade="all, delete-orphan")  # type: ignore[var-annotated]
    grades = relationship("Grade", back_populates="student", cascade="all, delete-orphan")  # type: ignore[var-annotated]
    highlights = relationship("Highlight", back_populates="student", cascade="all, delete-orphan")  # type: ignore[var-annotated]
    daily_performances = relationship("DailyPerformance", back_populates="student", cascade="all, delete-orphan")  # type: ignore[var-annotated]
    enrollments = relationship("CourseEnrollment", back_populates="student", cascade="all, delete-orphan")  # type: ignore[var-annotated]

    # Composite index for active students
    __table_args__ = (Index("idx_student_active_email", "is_active", "email"),)

    def __repr__(self):
        return f"<Student(id={self.id}, name={self.first_name} {self.last_name}, email={self.email})>"


class Course(SoftDeleteMixin, Base):
    """Course/Subject information with evaluation rules and schedule"""

    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    course_code = Column(String(20), unique=True, nullable=False, index=True)  # ✅ ADDED INDEX
    course_name = Column(String(200), nullable=False, index=False)
    semester = Column(String(50), nullable=False, index=True)  # ✅ ADDED INDEX
    credits = Column(Integer, default=3)
    description = Column(Text)
    evaluation_rules = Column(JSON)
    # Absence penalty: percentage points deducted from final grade per unexcused absence
    absence_penalty = Column(Float, default=0.0)

    # Teaching schedule fields
    hours_per_week = Column(Float, default=3.0)
    periods_per_week = Column(Integer, default=0)
    teaching_schedule = Column(JSON)

    # Relationships
    attendances = relationship("Attendance", back_populates="course")  # type: ignore[var-annotated]
    grades = relationship("Grade", back_populates="course")  # type: ignore[var-annotated]
    daily_performances = relationship("DailyPerformance", back_populates="course")  # type: ignore[var-annotated]
    enrollments = relationship("CourseEnrollment", back_populates="course", cascade="all, delete-orphan")  # type: ignore[var-annotated]
    enrolled_students = relationship("Student", secondary="course_enrollments", viewonly=True)  # type: ignore[var-annotated]

    def __repr__(self):
        return f"<Course(code={self.course_code}, name={self.course_name}, hours={self.hours_per_week}h/week)>"


class Attendance(SoftDeleteMixin, Base):
    """Daily attendance records with indexes for efficient querying"""

    __tablename__ = "attendances"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)  # ✅ ADDED INDEX for date queries
    status = Column(String(20), nullable=False)  # Present, Absent, Late, Excused
    period_number = Column(Integer, default=1)
    notes = Column(Text)

    # Relationships
    student = relationship("Student", back_populates="attendances")  # type: ignore[var-annotated]
    course = relationship("Course", back_populates="attendances")  # type: ignore[var-annotated]

    # Composite indexes for common queries
    # Three-column index for filtering by student, course, and date range
    __table_args__ = (
        Index("idx_attendance_student_date", "student_id", "date"),
        Index("idx_attendance_course_date", "course_id", "date"),
        Index("idx_attendance_student_course_date", "student_id", "course_id", "date"),
    )

    def __repr__(self):
        return (
            f"<Attendance(student={self.student_id}, course={self.course_id}, date={self.date}, status={self.status})>"
        )


class CourseEnrollment(SoftDeleteMixin, Base):
    """Enrollment linking students to courses"""

    __tablename__ = "course_enrollments"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False, index=True)
    enrolled_at = Column(Date, default=date.today, index=True)

    # Relationships
    student = relationship("Student", back_populates="enrollments")  # type: ignore[var-annotated]
    course = relationship("Course", back_populates="enrollments")  # type: ignore[var-annotated]

    __table_args__ = (Index("idx_enrollment_student_course", "student_id", "course_id", unique=True),)

    def __repr__(self):
        return f"<Enrollment(student={self.student_id}, course={self.course_id})>"


class DailyPerformance(SoftDeleteMixin, Base):
    """Daily performance tracking with proper indexing"""

    __tablename__ = "daily_performances"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)  # ✅ ADDED INDEX
    category = Column(String(100), nullable=False, index=True)  # ✅ ADDED INDEX
    score = Column(Float, nullable=False)
    max_score = Column(Float, default=10.0)
    notes = Column(Text)

    # Relationships
    student = relationship("Student", back_populates="daily_performances")  # type: ignore[var-annotated]
    course = relationship("Course", back_populates="daily_performances")  # type: ignore[var-annotated]

    # Composite index for common queries
    __table_args__ = (
        Index("idx_performance_student_course", "student_id", "course_id"),
        Index("idx_performance_student_date", "student_id", "date"),
    )

    @property
    def percentage(self):
        """Calculate percentage score"""
        # Access instance values directly to avoid SQLAlchemy Column type confusion for type checkers
        max_val = getattr(self, "__dict__", {}).get("max_score", 0.0) or 0.0
        score_val = getattr(self, "__dict__", {}).get("score", 0.0) or 0.0
        try:
            max_val = float(max_val)
            score_val = float(score_val)
        except Exception:
            return 0.0
        return (score_val / max_val) * 100 if max_val > 0 else 0.0

    def __repr__(self):
        return f"<DailyPerformance(student={self.student_id}, category={self.category}, score={self.score})>"


class Grade(SoftDeleteMixin, Base):
    """Student grades for assignments/exams with proper indexing"""

    __tablename__ = "grades"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False, index=True)
    assignment_name = Column(String(200), nullable=False)
    category = Column(String(100), index=True)  # ✅ ADDED INDEX for category queries
    grade = Column(Float, nullable=False)
    max_grade = Column(Float, default=100.0)
    weight = Column(Float, default=1.0)
    date_assigned = Column(Date, index=True)  # ✅ ADDED INDEX
    date_submitted = Column(Date, index=True)  # ✅ ADDED INDEX
    notes = Column(Text)

    # Relationships
    student = relationship("Student", back_populates="grades")  # type: ignore[var-annotated]
    course = relationship("Course", back_populates="grades")  # type: ignore[var-annotated]

    # Composite indexes for common queries
    __table_args__ = (
        Index("idx_grade_student_course", "student_id", "course_id"),
        Index("idx_grade_student_category", "student_id", "category"),
        Index("idx_grade_date_assigned", "date_assigned"),
        Index("idx_grade_date_submitted", "date_submitted"),
    )

    @property
    def percentage(self):
        """Calculate percentage score"""
        max_val = getattr(self, "__dict__", {}).get("max_grade", 0.0) or 0.0
        grade_val = getattr(self, "__dict__", {}).get("grade", 0.0) or 0.0
        try:
            max_val = float(max_val)
            grade_val = float(grade_val)
        except Exception:
            return 0.0
        return (grade_val / max_val) * 100 if max_val > 0 else 0.0

    def __repr__(self):
        return (
            f"<Grade(student={self.student_id}, assignment={self.assignment_name}, "
            f"grade={self.grade}/{self.max_grade})>"
        )


class Highlight(SoftDeleteMixin, Base):
    """Semester highlights and ratings for students"""

    __tablename__ = "highlights"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    semester = Column(String(50), nullable=False, index=True)  # ✅ ADDED INDEX
    rating = Column(Integer)
    category = Column(String(100), index=True)  # ✅ ADDED INDEX
    highlight_text = Column(Text, nullable=False)
    date_created = Column(Date, default=date.today)
    is_positive = Column(Boolean, default=True)

    # Relationships
    student = relationship("Student", back_populates="highlights")  # type: ignore[var-annotated]

    # Composite index for common queries
    __table_args__ = (Index("idx_highlight_student_semester", "student_id", "semester"),)

    def __repr__(self):
        return f"<Highlight(student={self.student_id}, category={self.category}, semester={self.semester})>"


class User(Base):
    """Application user accounts with roles and secure passwords.

    Roles: 'admin', 'teacher', 'student'
    Supports both legacy role string and new many-to-many role assignments.
    """

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(200))
    role = Column(String(50), nullable=False, index=True, default="teacher")  # Legacy role field
    is_active = Column(Boolean, default=True, index=True)
    password_change_required = Column(Boolean, default=False, nullable=False, index=True)
    failed_login_attempts = Column(Integer, default=0, nullable=False)
    last_failed_login_at = Column(DateTime(timezone=True), nullable=True, index=True)
    lockout_until = Column(DateTime(timezone=True), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )

    # Relationships for RBAC
    user_permissions: ClassVar[Any] = relationship(
        "UserPermission", foreign_keys="[UserPermission.user_id]", back_populates="user", cascade="all, delete-orphan"
    )

    __table_args__ = (Index("idx_users_email_role", "email", "role"),)

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, role={self.role})>"


class RefreshToken(Base):
    """Stored refresh tokens for token rotation and revocation."""

    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    jti = Column(String(64), nullable=False, index=True, unique=True)
    token_hash = Column(String(128), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    revoked = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    # Relationship back to user (optional)
    # Annotate as ClassVar[Any] so mypy is satisfied but SQLAlchemy's declarative
    # mapper will not treat this annotation as a mapped attribute.
    user: ClassVar[Any] = relationship("User")

    def __repr__(self):
        return f"<RefreshToken(id={self.id}, user_id={self.user_id}, jti={self.jti}, revoked={self.revoked})>"


class AuditLog(Base):
    """Audit log for tracking system actions and changes."""

    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    action = Column(String(50), nullable=False, index=True)  # e.g., "create", "update", "delete", "bulk_import"
    resource = Column(String(50), nullable=False, index=True)  # e.g., "student", "grade", "course"
    resource_id = Column(String(100), nullable=True, index=True)  # ID of the affected resource
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    user_email = Column(String(255), nullable=True)
    ip_address = Column(String(45), nullable=True)  # IPv6 max length
    user_agent = Column(String(512), nullable=True)
    details = Column(JSON, nullable=True)  # Additional contextual information
    success = Column(Boolean, default=True, nullable=False)
    error_message = Column(Text, nullable=True)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    old_values = Column(JSON, nullable=True)
    new_values = Column(JSON, nullable=True)
    change_reason = Column(String(500), nullable=True)
    request_id = Column(String(64), nullable=True, index=True)

    # Composite indexes for common queries
    __table_args__ = (
        Index("idx_audit_user_action", "user_id", "action"),
        Index("idx_audit_resource_action", "resource", "action"),
        Index("idx_audit_timestamp_action", "timestamp", "action"),
        Index("idx_audit_request_id", "request_id"),
    )

    # Relationship to user
    user: ClassVar[Any] = relationship("User")

    def __repr__(self):
        return f"<AuditLog(id={self.id}, action={self.action}, resource={self.resource}, user_id={self.user_id})>"


# --- RBAC models: fine-grained permissions ---
class Role(Base):
    """Role entity for fine-grained RBAC.

    Uses a unique name (e.g., 'admin', 'teacher', 'student').
    """

    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(String(255))

    # Relationships
    role_permissions: ClassVar[Any] = relationship(
        "RolePermission", back_populates="role", cascade="all, delete-orphan"
    )

    __table_args__ = (Index("idx_roles_name", "name", unique=True),)

    def __repr__(self):
        return f"<Role(id={self.id}, name={self.name})>"


class Permission(Base):
    """Permission entity for fine-grained RBAC.

    Permission keys follow a 'resource:action' convention (e.g., 'students:view', 'grades:edit').
    Split into resource and action for flexible querying.
    """

    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False, index=True)  # e.g., 'students:view'
    resource = Column(String(50), nullable=False, index=True)  # e.g., 'students'
    action = Column(String(50), nullable=False)  # e.g., 'view'
    description = Column(Text)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    role_permissions: ClassVar[Any] = relationship(
        "RolePermission", back_populates="permission", cascade="all, delete-orphan"
    )
    user_permissions: ClassVar[Any] = relationship(
        "UserPermission", back_populates="permission", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("idx_permissions_key", "key", unique=True),
        Index("idx_permissions_resource", "resource"),
        Index("idx_permissions_is_active", "is_active"),
    )

    def __repr__(self):
        return f"<Permission(id={self.id}, key={self.key}, active={self.is_active})>"


class RolePermission(Base):
    """Association table: which permissions are granted to a role."""

    __tablename__ = "role_permissions"

    id = Column(Integer, primary_key=True, index=True)
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="CASCADE"), nullable=False, index=True)
    permission_id = Column(Integer, ForeignKey("permissions.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    role: ClassVar[Any] = relationship("Role", back_populates="role_permissions")
    permission: ClassVar[Any] = relationship("Permission", back_populates="role_permissions")

    __table_args__ = (Index("idx_role_permission_unique", "role_id", "permission_id", unique=True),)

    def __repr__(self):
        return f"<RolePermission(role_id={self.role_id}, permission_id={self.permission_id})>"


class UserPermission(Base):
    """Direct permission assignments to users (bypassing role inheritance).

    Allows granting specific permissions to individual users with optional expiration.
    Useful for temporary elevated access or exceptions to role-based permissions.
    """

    __tablename__ = "user_permissions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    permission_id = Column(Integer, ForeignKey("permissions.id", ondelete="CASCADE"), nullable=False, index=True)
    granted_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))  # Admin who granted permission
    granted_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True, index=True)  # Optional expiration

    # Relationships
    user: ClassVar[Any] = relationship("User", foreign_keys=[user_id], back_populates="user_permissions")
    permission: ClassVar[Any] = relationship("Permission", back_populates="user_permissions")
    grantor: ClassVar[Any] = relationship("User", foreign_keys=[granted_by])

    __table_args__ = (
        Index("idx_user_permission_unique", "user_id", "permission_id", unique=True),
        Index("idx_user_permission_user_id", "user_id"),
        Index("idx_user_permission_expires_at", "expires_at"),
    )

    def __repr__(self):
        return (
            f"<UserPermission(user_id={self.user_id}, permission_id={self.permission_id}, expires={self.expires_at})>"
        )


class UserRole(Base):
    """Association table: which roles are assigned to a user.

    Backward compatible with existing User.role string – both can coexist during migration.
    """

    __tablename__ = "user_roles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="CASCADE"), nullable=False, index=True)

    __table_args__ = (Index("idx_user_role_unique", "user_id", "role_id", unique=True),)

    user: ClassVar[Any] = relationship("User")
    role: ClassVar[Any] = relationship("Role")

    def __repr__(self):
        return f"<UserRole(user_id={self.user_id}, role_id={self.role_id})>"


class Notification(SoftDeleteMixin, Base):
    """Real-time notifications for users.

    Supports multiple notification types:
    - grade_update: When grades are entered/modified
    - attendance_change: When attendance is marked
    - course_update: Course-related announcements
    - system_message: System-wide messages
    - assignment_posted: New assignments posted
    """

    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    notification_type = Column(String(50), nullable=False)  # grade_update, attendance_change, etc.
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    data = Column(JSON, nullable=True)  # Additional context (grade value, course_id, etc.)
    is_read = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    read_at = Column(DateTime, nullable=True)

    __table_args__ = (
        Index("idx_user_notifications", "user_id", "created_at"),
        Index("idx_unread_notifications", "user_id", "is_read"),
    )

    user: ClassVar[Any] = relationship("User")

    def __repr__(self):
        return f"<Notification(id={self.id}, user_id={self.user_id}, type={self.notification_type})>"


class NotificationPreference(Base):
    """User preferences for notifications.

    Controls which notification types users want to receive and how (in-app, email, SMS).
    """

    __tablename__ = "notification_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)

    # In-app notifications
    in_app_enabled = Column(Boolean, default=True)
    in_app_grade_updates = Column(Boolean, default=True)
    in_app_attendance = Column(Boolean, default=True)
    in_app_course_updates = Column(Boolean, default=True)
    in_app_system_messages = Column(Boolean, default=True)

    # Email notifications
    email_enabled = Column(Boolean, default=True)
    email_grade_updates = Column(Boolean, default=True)
    email_attendance = Column(Boolean, default=False)
    email_course_updates = Column(Boolean, default=True)
    email_system_messages = Column(Boolean, default=False)

    # SMS notifications (optional)
    sms_enabled = Column(Boolean, default=False)
    sms_phone = Column(String(20), nullable=True)
    sms_grade_updates = Column(Boolean, default=False)
    sms_attendance = Column(Boolean, default=False)

    # Quiet hours
    quiet_hours_enabled = Column(Boolean, default=False)
    quiet_hours_start = Column(String(5), nullable=True)  # HH:MM format
    quiet_hours_end = Column(String(5), nullable=True)  # HH:MM format

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )

    user: ClassVar[Any] = relationship("User")

    def __repr__(self):
        return f"<NotificationPreference(user_id={self.user_id})>"


# ========== IMPORT/EXPORT MODELS (Feature #127) ==========


class ImportJob(Base):
    """Track bulk import operations.

    Stores metadata about student/course/grade imports from CSV/Excel files.
    """

    __tablename__ = "import_jobs"

    id = Column(Integer, primary_key=True, index=True)
    file_name = Column(String(255), nullable=False)
    file_type = Column(String(10), nullable=False)  # csv, xlsx
    import_type = Column(String(50), nullable=False)  # students, courses, grades
    status = Column(String(50), nullable=False, default="pending")  # pending, validated, processing, completed, failed
    total_rows = Column(Integer, nullable=False)
    successful_rows = Column(Integer, default=0)
    failed_rows = Column(Integer, default=0)
    validation_errors = Column(JSON, nullable=True)  # {row_number: [error1, error2]}
    file_path = Column(String(500), nullable=True)  # Path to uploaded file
    imported_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user: ClassVar[Any] = relationship("User")
    rows: ClassVar[Any] = relationship("ImportRow", back_populates="job", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_import_job_status", "status"),
        Index("ix_import_job_created_at", "created_at"),
        Index("ix_import_job_import_type", "import_type"),
    )

    def __repr__(self):
        return f"<ImportJob(id={self.id}, type={self.import_type}, status={self.status})>"


class ImportRow(Base):
    """Track individual row processing status during import.

    One row per data row in the import file.
    """

    __tablename__ = "import_rows"

    id = Column(Integer, primary_key=True, index=True)
    import_job_id = Column(Integer, ForeignKey("import_jobs.id", ondelete="CASCADE"), nullable=False)
    row_number = Column(Integer, nullable=False)
    original_data = Column(JSON, nullable=False)  # Original row data from file
    status = Column(String(50), nullable=False, default="pending")  # pending, valid, error, committed
    error_messages = Column(JSON, nullable=True)  # [error1, error2, ...]
    target_id = Column(Integer, nullable=True)  # ID of created/updated record
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    job: ClassVar[Any] = relationship("ImportJob", back_populates="rows")

    __table_args__ = (
        Index("ix_import_row_import_job_id", "import_job_id"),
        Index("ix_import_row_status", "status"),
    )

    def __repr__(self):
        return f"<ImportRow(id={self.id}, job_id={self.import_job_id}, row={self.row_number}, status={self.status})>"


class ExportJob(Base):
    """Track bulk export operations.

    Stores metadata about generated exports (student/course/grade data).
    """

    __tablename__ = "export_jobs"

    id = Column(Integer, primary_key=True, index=True)
    export_type = Column(String(50), nullable=False)  # students, courses, grades, attendance, dashboard
    file_format = Column(String(10), nullable=False)  # csv, xlsx, pdf
    file_path = Column(String(500), nullable=True)  # Path to generated file
    status = Column(String(50), nullable=False, default="pending")  # pending, processing, completed, failed
    total_records = Column(Integer, default=0)
    progress_percent = Column(Integer, nullable=True)  # 0-100 for tracking export generation progress
    filters = Column(JSON, nullable=True)  # {status: active, course_id: 5}
    scheduled = Column(Boolean, default=False)
    schedule_frequency = Column(String(50), nullable=True)  # weekly, monthly, daily
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user: ClassVar[Any] = relationship("User")

    __table_args__ = (
        Index("ix_export_job_status", "status"),
        Index("ix_export_job_created_at", "created_at"),
        Index("ix_export_job_export_type", "export_type"),
    )

    def __repr__(self):
        return f"<ExportJob(id={self.id}, type={self.export_type}, status={self.status})>"


class ImportExportHistory(Base):
    """Audit trail for all import/export operations.

    Provides complete audit trail and troubleshooting capability.
    """

    __tablename__ = "import_export_history"

    id = Column(Integer, primary_key=True, index=True)
    operation_type = Column(String(50), nullable=False)  # import, export
    resource_type = Column(String(50), nullable=False, index=True)  # students, courses, grades, attendance
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    job_id = Column(Integer, nullable=True)  # ID of associated ImportJob or ExportJob
    action = Column(String(50), nullable=False)  # started, completed, failed, rolled_back
    details = Column(JSON, nullable=True)  # Additional context (error messages, stats)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)

    # Relationships
    user: ClassVar[Any] = relationship("User")

    __table_args__ = (
        Index("ix_import_export_history_user_id", "user_id"),
        Index("ix_import_export_history_operation", "operation_type"),
    )

    def __repr__(self):
        return f"<ImportExportHistory(id={self.id}, operation={self.operation_type}, action={self.action})>"


class SavedSearch(SoftDeleteMixin, Base):
    """Saved search queries for quick access and reuse.

    Allows users to save complex search criteria for later use.
    Includes full-text search queries and advanced filter combinations.
    """

    __tablename__ = "saved_searches"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)  # Index in __table_args__
    name = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=True)
    search_type = Column(String(50), nullable=False)  # Index in __table_args__
    query = Column(String(500), nullable=True)  # Full-text search query
    filters = Column(JSON, nullable=True)  # Advanced filter criteria
    is_favorite = Column(Boolean, default=False)  # Index in __table_args__
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    updated_at = Column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    user: ClassVar[Any] = relationship("User")

    __table_args__ = (
        Index("ix_saved_searches_user_id", "user_id"),
        Index("ix_saved_searches_search_type", "search_type"),
        Index("ix_saved_searches_is_favorite", "is_favorite"),
    )

    def __repr__(self):
        return f"<SavedSearch(id={self.id}, user_id={self.user_id}, name={self.name}, type={self.search_type})>"


class Report(SoftDeleteMixin, Base):
    """Custom report definitions with scheduling and export options.

    Stores user-defined report configurations including fields, filters,
    aggregations, and scheduling settings. Supports scheduled generation
    and email delivery.
    """

    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=True)
    report_type = Column(String(50), nullable=False)  # student, course, grade, attendance, custom
    template_id = Column(Integer, ForeignKey("report_templates.id", ondelete="SET NULL"), nullable=True)

    # Report configuration
    fields = Column(JSON, nullable=False)  # Selected fields to include
    filters = Column(JSON, nullable=True)  # Filter criteria
    aggregations = Column(JSON, nullable=True)  # Sum, avg, count, etc.
    sort_by = Column(JSON, nullable=True)  # Sorting configuration

    # Export settings
    export_format = Column(String(20), default="pdf")  # pdf, excel, csv
    include_charts = Column(Boolean, default=True)

    # Scheduling (optional)
    schedule_enabled = Column(Boolean, default=False)
    schedule_frequency = Column(String(20), nullable=True)  # daily, weekly, monthly, custom
    schedule_cron = Column(String(100), nullable=True)  # Cron expression for custom schedules
    next_run_at = Column(DateTime(timezone=True), nullable=True)
    last_run_at = Column(DateTime(timezone=True), nullable=True)

    # Email delivery
    email_recipients = Column(JSON, nullable=True)  # List of email addresses
    email_enabled = Column(Boolean, default=False)

    # Metadata
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    user: ClassVar[Any] = relationship("User")
    template: ClassVar[Any] = relationship("ReportTemplate", foreign_keys=[template_id])
    generated_reports: ClassVar[Any] = relationship(
        "GeneratedReport", back_populates="report", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_reports_user_id", "user_id"),
        Index("ix_reports_report_type", "report_type"),
        Index("ix_reports_schedule_enabled", "schedule_enabled"),
        Index("ix_reports_next_run_at", "next_run_at"),
    )

    def __repr__(self):
        return f"<Report(id={self.id}, user_id={self.user_id}, name={self.name}, type={self.report_type})>"


class ReportTemplate(Base):
    """Pre-built report templates for common use cases.

    Provides pre-configured report definitions that users can use directly
    or customize. Includes standard reports like student roster, grade
    distribution, attendance summary, etc.
    """

    __tablename__ = "report_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True, unique=True)
    description = Column(Text, nullable=True)
    category = Column(String(50), nullable=False)  # academic, administrative, statistical
    report_type = Column(String(50), nullable=False)

    # Template configuration (same structure as Report)
    fields = Column(JSON, nullable=False)
    filters = Column(JSON, nullable=True)
    aggregations = Column(JSON, nullable=True)
    sort_by = Column(JSON, nullable=True)

    # Default export settings
    default_export_format = Column(String(20), default="pdf")
    default_include_charts = Column(Boolean, default=True)

    # Template metadata
    is_system = Column(Boolean, default=True)  # System template vs user-created
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        Index("ix_report_templates_category", "category"),
        Index("ix_report_templates_report_type", "report_type"),
        Index("ix_report_templates_is_active", "is_active"),
    )

    def __repr__(self):
        return f"<ReportTemplate(id={self.id}, name={self.name}, category={self.category})>"


class GeneratedReport(Base):
    """Stores generated report files and metadata.

    Tracks all generated report instances, including file paths,
    generation status, and performance metrics. Enables report history
    and archival.
    """

    __tablename__ = "generated_reports"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Generation details
    file_path = Column(String(500), nullable=True)  # Relative path to generated file
    file_name = Column(String(255), nullable=False)
    file_size_bytes = Column(Integer, nullable=True)
    export_format = Column(String(20), nullable=False)  # pdf, excel, csv

    # Status tracking
    status = Column(String(20), default="pending")  # pending, generating, completed, failed
    error_message = Column(Text, nullable=True)

    # Performance metrics
    record_count = Column(Integer, nullable=True)  # Number of records in report
    generation_duration_seconds = Column(Float, nullable=True)

    # Email delivery
    email_sent = Column(Boolean, default=False)
    email_sent_at = Column(DateTime(timezone=True), nullable=True)
    email_error = Column(Text, nullable=True)

    # Metadata
    generated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime(timezone=True), nullable=True)  # Automatic cleanup date

    # Relationships
    report: ClassVar[Any] = relationship("Report", back_populates="generated_reports")
    user: ClassVar[Any] = relationship("User")

    __table_args__ = (
        Index("ix_generated_reports_report_id", "report_id"),
        Index("ix_generated_reports_user_id", "user_id"),
        Index("ix_generated_reports_status", "status"),
        Index("ix_generated_reports_generated_at", "generated_at"),
        Index("ix_generated_reports_expires_at", "expires_at"),
    )

    def __repr__(self):
        return (
            f"<GeneratedReport(id={self.id}, report_id={self.report_id}, status={self.status}, file={self.file_name})>"
        )


def init_db(db_url: str = "sqlite:///student_management.db"):
    """
    Initialize the database engine with performance optimizations.

    **IMPORTANT**: This function NO LONGER creates tables automatically.
    Use Alembic migrations to manage schema changes:
        - Run `alembic upgrade head` to create/update tables
        - Run `alembic revision --autogenerate -m "message"` to create new migrations

    Args:
        db_url: Database connection string (default: SQLite)

    Returns:
        engine: SQLAlchemy engine instance

    Raises:
        Exception: If database initialization fails
    """
    try:
        # Ensure parent directory exists for SQLite file paths to prevent first-run failures
        try:
            if db_url.startswith("sqlite:///"):
                db_path = db_url.replace("sqlite:///", "", 1)
                # Normalize to absolute path (handles Windows drive letters too)
                db_path_obj = Path(db_path)
                parent_dir = db_path_obj.parent
                if str(parent_dir).strip():
                    parent_dir.mkdir(parents=True, exist_ok=True)
        except Exception:
            # Best-effort; don't fail engine creation if directory check has issues
            pass

        # Determine if this is a production environment
        from backend.environment import get_runtime_context

        runtime_context = get_runtime_context()
        is_production = runtime_context.is_production
        is_postgresql = db_url.startswith("postgresql://") or db_url.startswith("postgresql+psycopg://")
        is_sqlite = db_url.startswith("sqlite:///")

        # Production SQLite warning
        if is_production and is_sqlite:
            logger.warning(
                "⚠️  SQLite detected in production mode. SQLite limitations:\n"
                "   • Poor concurrency (write locks entire database)\n"
                "   • No network access (single machine only)\n"
                "   • Limited to ~1TB database size\n"
                "   • Not recommended for multi-user production deployments\n"
                "   ➜ Consider PostgreSQL for production use (see docs/development/ARCHITECTURE.md)"
            )

        # Configure connection pooling (primarily for PostgreSQL, but applies to all)
        engine_kwargs: dict[str, Any] = {
            "echo": False,
        }

        if is_postgresql:
            # PostgreSQL-specific pooling configuration
            engine_kwargs.update(
                {
                    "pool_size": 20,  # Connections in pool (default: 5)
                    "max_overflow": 10,  # Extra connections beyond pool_size (default: 10)
                    "pool_pre_ping": True,  # Test connections before use (detect stale connections)
                    "pool_recycle": 3600,  # Recycle connections after 1 hour (prevent stale connections)
                }
            )
            logger.info(
                "PostgreSQL connection pooling configured: "
                "pool_size=20, max_overflow=10, pool_pre_ping=True, pool_recycle=3600s"
            )
        elif is_sqlite:
            # SQLite-specific configuration
            # Use NullPool for SQLite to avoid "database is locked" errors in multi-threaded scenarios
            # Also disable thread checks so dependency entry/exit across threadpool workers doesn't error.
            from sqlalchemy.pool import NullPool

            engine_kwargs["poolclass"] = NullPool
            engine_kwargs.setdefault("connect_args", {})
            # Allow connections to be used across threads (safe for tests and small apps)
            engine_kwargs["connect_args"].update({"check_same_thread": False})
            logger.info("SQLite configured: NullPool + check_same_thread=False")

        engine = create_engine(db_url, **engine_kwargs)

        # Apply SQLite performance/safety pragmas (WAL, foreign_keys)
        try:
            if engine.dialect.name == "sqlite":
                # Use a transaction context so PRAGMAs are applied consistently
                with engine.begin() as conn:
                    # Enable write-ahead logging for better concurrency
                    conn.execute(text("PRAGMA journal_mode=WAL"))
                    # Reasonable durability without being too slow for dev
                    conn.execute(text("PRAGMA synchronous=NORMAL"))
                    # Ensure foreign keys constraints are enforced
                    conn.execute(text("PRAGMA foreign_keys=ON"))
        except Exception:
            # Best-effort; do not fail initialization on pragma errors
            pass

        # Attach slow query monitoring if configured
        try:
            from backend.config import settings as app_settings
            from backend.performance_monitor import setup_sqlalchemy_query_monitoring

            setup_sqlalchemy_query_monitoring(engine, app_settings)
        except Exception:
            logger.warning("Unable to initialize slow query monitoring", exc_info=True)

        # NOTE: Base.metadata.create_all() removed - use Alembic migrations instead
        # If you need to create tables for testing, use alembic or create_all() explicitly
        logger.info(f"Database engine initialized: {db_url}")
        logger.info("Run 'alembic upgrade head' to apply migrations")
        return engine
    except Exception as e:
        logger.error(f"Failed to initialize database engine: {e!s}", exc_info=True)
        raise


def get_session(engine):
    """
    Create a new database session.

    Args:
        engine: SQLAlchemy engine instance

    Returns:
        Session instance
    """
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return SessionLocal()


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("DATABASE MODELS DEFINED")
    print("=" * 60 + "\n")

    print("✓ Database models loaded successfully!")
    print("\nDefined tables:")
    for table in Base.metadata.tables.keys():
        print(f"  • {table}")

    print("\n" + "=" * 60)
    print("TO CREATE/UPDATE DATABASE SCHEMA:")
    print("=" * 60)
    print("Use Alembic migrations:")
    print("  1. Create migration:  alembic revision --autogenerate -m 'description'")
    print("  2. Apply migrations:  alembic upgrade head")
    print("  3. Check status:      alembic current")
    print("\nDirect table creation (testing only):")
    print("  from backend.models import Base, init_db")
    print("  engine = init_db()")
    print("  Base.metadata.create_all(bind=engine)")
    print("\n" + "=" * 60 + "\n")
