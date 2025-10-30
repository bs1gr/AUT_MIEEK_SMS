"""
IMPROVED: Student Management System - Enhanced Database Models
Features:
- Proper database indexing for performance
- Better type hints
- Docstrings for all models
- Index creation for frequently queried fields
"""

from sqlalchemy import create_engine, Column, Integer, String, Float, Date, ForeignKey, Text, Boolean, JSON, Index, text
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
from datetime import datetime, date
import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)
Base = declarative_base()


class Student(Base):
    """Student information table with indexes for common queries"""
    __tablename__ = 'students'
    
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
    
    # Relationships with cascade delete
    attendances = relationship("Attendance", back_populates="student", cascade="all, delete-orphan")
    grades = relationship("Grade", back_populates="student", cascade="all, delete-orphan")
    highlights = relationship("Highlight", back_populates="student", cascade="all, delete-orphan")
    daily_performances = relationship("DailyPerformance", back_populates="student", cascade="all, delete-orphan")
    enrollments = relationship("CourseEnrollment", back_populates="student", cascade="all, delete-orphan")
    
    # Composite index for active students
    __table_args__ = (
        Index('idx_student_active_email', 'is_active', 'email'),
    )
    
    def __repr__(self):
        return f"<Student(id={self.id}, name={self.first_name} {self.last_name}, email={self.email})>"


class Course(Base):
    """Course/Subject information with evaluation rules and schedule"""
    __tablename__ = 'courses'
    
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
    teaching_schedule = Column(JSON)
    
    # Relationships
    attendances = relationship("Attendance", back_populates="course")
    grades = relationship("Grade", back_populates="course")
    daily_performances = relationship("DailyPerformance", back_populates="course")
    enrollments = relationship("CourseEnrollment", back_populates="course", cascade="all, delete-orphan")
    enrolled_students = relationship("Student", secondary="course_enrollments", viewonly=True)
    
    def __repr__(self):
        return f"<Course(code={self.course_code}, name={self.course_name}, hours={self.hours_per_week}h/week)>"


class Attendance(Base):
    """Daily attendance records with indexes for efficient querying"""
    __tablename__ = 'attendances'
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey('students.id'), nullable=False, index=True)
    course_id = Column(Integer, ForeignKey('courses.id'), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)  # ✅ ADDED INDEX for date queries
    status = Column(String(20), nullable=False)  # Present, Absent, Late, Excused
    period_number = Column(Integer, default=1)
    notes = Column(Text)
    
    # Relationships
    student = relationship("Student", back_populates="attendances")
    course = relationship("Course", back_populates="attendances")
    
    # Composite index for common queries
    __table_args__ = (
        Index('idx_attendance_student_date', 'student_id', 'date'),
        Index('idx_attendance_course_date', 'course_id', 'date'),
    )
    
    def __repr__(self):
        return f"<Attendance(student={self.student_id}, course={self.course_id}, date={self.date}, status={self.status})>"


class CourseEnrollment(Base):
    """Enrollment linking students to courses"""
    __tablename__ = 'course_enrollments'
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey('students.id'), nullable=False, index=True)
    course_id = Column(Integer, ForeignKey('courses.id'), nullable=False, index=True)
    enrolled_at = Column(Date, default=date.today, index=True)
    
    # Relationships
    student = relationship("Student", back_populates="enrollments")
    course = relationship("Course", back_populates="enrollments")
    
    __table_args__ = (
        Index('idx_enrollment_student_course', 'student_id', 'course_id', unique=True),
    )
    
    def __repr__(self):
        return f"<Enrollment(student={self.student_id}, course={self.course_id})>"


class DailyPerformance(Base):
    """Daily performance tracking with proper indexing"""
    __tablename__ = 'daily_performances'
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey('students.id'), nullable=False, index=True)
    course_id = Column(Integer, ForeignKey('courses.id'), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)  # ✅ ADDED INDEX
    category = Column(String(100), nullable=False, index=True)  # ✅ ADDED INDEX
    score = Column(Float, nullable=False)
    max_score = Column(Float, default=10.0)
    notes = Column(Text)
    
    # Relationships
    student = relationship("Student", back_populates="daily_performances")
    course = relationship("Course", back_populates="daily_performances")
    
    # Composite index for common queries
    __table_args__ = (
        Index('idx_performance_student_course', 'student_id', 'course_id'),
        Index('idx_performance_student_date', 'student_id', 'date'),
    )
    
    @property
    def percentage(self):
        """Calculate percentage score"""
        # Access instance values directly to avoid SQLAlchemy Column type confusion for type checkers
        max_val = (getattr(self, "__dict__", {}).get("max_score", 0.0) or 0.0)
        score_val = (getattr(self, "__dict__", {}).get("score", 0.0) or 0.0)
        try:
            max_val = float(max_val)
            score_val = float(score_val)
        except Exception:
            return 0.0
        return (score_val / max_val) * 100 if max_val > 0 else 0.0
    
    def __repr__(self):
        return f"<DailyPerformance(student={self.student_id}, category={self.category}, score={self.score})>"


class Grade(Base):
    """Student grades for assignments/exams with proper indexing"""
    __tablename__ = 'grades'
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey('students.id'), nullable=False, index=True)
    course_id = Column(Integer, ForeignKey('courses.id'), nullable=False, index=True)
    assignment_name = Column(String(200), nullable=False)
    category = Column(String(100), index=True)  # ✅ ADDED INDEX for category queries
    grade = Column(Float, nullable=False)
    max_grade = Column(Float, default=100.0)
    weight = Column(Float, default=1.0)
    date_assigned = Column(Date, index=True)  # ✅ ADDED INDEX
    date_submitted = Column(Date, index=True)  # ✅ ADDED INDEX
    notes = Column(Text)
    
    # Relationships
    student = relationship("Student", back_populates="grades")
    course = relationship("Course", back_populates="grades")
    
    # Composite indexes for common queries
    __table_args__ = (
        Index('idx_grade_student_course', 'student_id', 'course_id'),
        Index('idx_grade_student_category', 'student_id', 'category'),
    )
    
    @property
    def percentage(self):
        """Calculate percentage score"""
        max_val = (getattr(self, "__dict__", {}).get("max_grade", 0.0) or 0.0)
        grade_val = (getattr(self, "__dict__", {}).get("grade", 0.0) or 0.0)
        try:
            max_val = float(max_val)
            grade_val = float(grade_val)
        except Exception:
            return 0.0
        return (grade_val / max_val) * 100 if max_val > 0 else 0.0
    
    def __repr__(self):
        return f"<Grade(student={self.student_id}, assignment={self.assignment_name}, grade={self.grade}/{self.max_grade})>"


class Highlight(Base):
    """Semester highlights and ratings for students"""
    __tablename__ = 'highlights'
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey('students.id'), nullable=False, index=True)
    semester = Column(String(50), nullable=False, index=True)  # ✅ ADDED INDEX
    rating = Column(Integer)
    category = Column(String(100), index=True)  # ✅ ADDED INDEX
    highlight_text = Column(Text, nullable=False)
    date_created = Column(Date, default=date.today)
    is_positive = Column(Boolean, default=True)
    
    # Relationships
    student = relationship("Student", back_populates="highlights")
    
    # Composite index for common queries
    __table_args__ = (
        Index('idx_highlight_student_semester', 'student_id', 'semester'),
    )
    
    def __repr__(self):
        return f"<Highlight(student={self.student_id}, category={self.category}, semester={self.semester})>"


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

        engine = create_engine(db_url, echo=False)

        # Apply SQLite performance/safety pragmas (WAL, foreign_keys)
        try:
            if engine.dialect.name == "sqlite":
                with engine.connect() as conn:
                    # Enable write-ahead logging for better concurrency
                    conn.execute(text("PRAGMA journal_mode=WAL"))
                    # Reasonable durability without being too slow for dev
                    conn.execute(text("PRAGMA synchronous=NORMAL"))
                    # Ensure foreign keys constraints are enforced
                    conn.execute(text("PRAGMA foreign_keys=ON"))
                    conn.commit()
        except Exception:
            # Best-effort; do not fail initialization on pragma errors
            pass

        # NOTE: Base.metadata.create_all() removed - use Alembic migrations instead
        # If you need to create tables for testing, use alembic or create_all() explicitly
        logger.info(f"Database engine initialized: {db_url}")
        logger.info("Run 'alembic upgrade head' to apply migrations")
        return engine
    except Exception as e:
        logger.error(f"Failed to initialize database engine: {str(e)}", exc_info=True)
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
    print("\n" + "="*60)
    print("DATABASE MODELS DEFINED")
    print("="*60 + "\n")
    
    print("✓ Database models loaded successfully!")
    print("\nDefined tables:")
    for table in Base.metadata.tables.keys():
        print(f"  • {table}")
    
    print("\n" + "="*60)
    print("TO CREATE/UPDATE DATABASE SCHEMA:")
    print("="*60)
    print("Use Alembic migrations:")
    print("  1. Create migration:  alembic revision --autogenerate -m 'description'")
    print("  2. Apply migrations:  alembic upgrade head")
    print("  3. Check status:      alembic current")
    print("\nDirect table creation (testing only):")
    print("  from backend.models import Base, init_db")
    print("  engine = init_db()")
    print("  Base.metadata.create_all(bind=engine)")
    print("\n" + "="*60 + "\n")
