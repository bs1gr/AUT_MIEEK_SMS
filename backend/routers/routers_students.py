"""
IMPROVED: Student Management Routes
Handles all student-related CRUD operations and endpoints
Split from main.py for better organization
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field
from datetime import date
import logging

# Setup logging
logger = logging.getLogger(__name__)

# Initialize router
router = APIRouter(
    prefix="/students",
    tags=["Students"],
    responses={404: {"description": "Not found"}}
)


from backend.schemas.students import StudentCreate, StudentUpdate, StudentResponse


# ========== DEPENDENCY INJECTION ==========
from backend.db import get_session as get_db


# ========== ENDPOINTS ==========

@router.post("/", response_model=StudentResponse, status_code=201)
def create_student(
    student: StudentCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new student.
    
    - **first_name**: Student's first name (required)
    - **last_name**: Student's last name (required)
    - **email**: Student's email (required, unique)
    - **student_id**: Student ID (required, unique)
    - **enrollment_date**: Date of enrollment (optional)
    """
    try:
        from backend.models import Student
        
        # Use database-level locking to prevent race conditions
        # Check if student with same email already exists
        existing = db.query(Student).filter(Student.email == student.email).with_for_update().first()
        if existing:
            logger.warning(f"Attempted to create duplicate student with email: {student.email}")
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Check if student_id already exists
        existing_id = db.query(Student).filter(Student.student_id == student.student_id).with_for_update().first()
        if existing_id:
            logger.warning(f"Attempted to create duplicate student with ID: {student.student_id}")
            raise HTTPException(status_code=400, detail="Student ID already exists")
        
        db_student = Student(**student.model_dump())
        db.add(db_student)
        db.commit()
        db.refresh(db_student)
        
        logger.info(f"Created student: {db_student.id} - {db_student.student_id}")
        return db_student
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating student: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/", response_model=List[StudentResponse])
def get_all_students(
    skip: int = 0,
    limit: int = 100,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """
    Retrieve all students with optional filtering.
    
    - **skip**: Number of records to skip (pagination)
    - **limit**: Maximum records to return (default: 100, max: 1000)
    - **is_active**: Filter by active status (optional)
    """
    try:
        # Validate pagination parameters
        if skip < 0:
            raise HTTPException(status_code=400, detail="Skip cannot be negative")
        if limit < 1 or limit > 1000:
            raise HTTPException(status_code=400, detail="Limit must be between 1 and 1000")
        
        from backend.models import Student
        query = db.query(Student)
        
        # Apply filters
        if is_active is not None:
            query = query.filter(Student.is_active == is_active)
        
        students = query.offset(skip).limit(limit).all()
        logger.info(f"Retrieved {len(students)} students (skip={skip}, limit={limit})")
        
        return students
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving students: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{student_id}", response_model=StudentResponse)
def get_student(
    student_id: int,
    db: Session = Depends(get_db)
):
    """
    Retrieve a specific student by ID.
    
    - **student_id**: The ID of the student to retrieve
    """
    try:
        from backend.models import Student
        student = db.query(Student).filter(Student.id == student_id).first()
        
        if not student:
            logger.warning(f"Student not found: {student_id}")
            raise HTTPException(status_code=404, detail="Student not found")
        
        logger.info(f"Retrieved student: {student_id}")
        return student
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving student {student_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/{student_id}", response_model=StudentResponse)
def update_student(
    student_id: int,
    student_data: StudentUpdate,
    db: Session = Depends(get_db)
):
    """
    Update a student's information.
    
    - **student_id**: The ID of the student to update
    - **student_data**: Updated student information
    """
    try:
        from backend.models import Student
        db_student = db.query(Student).filter(Student.id == student_id).first()
        
        if not db_student:
            logger.warning(f"Attempted update on non-existent student: {student_id}")
            raise HTTPException(status_code=404, detail="Student not found")
        
        # Update only provided fields
        update_data = student_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_student, key, value)
        
        db.commit()
        db.refresh(db_student)
        
        logger.info(f"Updated student: {student_id}")
        return db_student
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating student {student_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/{student_id}", status_code=204)
def delete_student(
    student_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete a student and all associated records.
    
    - **student_id**: The ID of the student to delete
    
    WARNING: This will delete all grades, attendance records, and highlights for the student.
    """
    try:
        from backend.models import Student
        db_student = db.query(Student).filter(Student.id == student_id).first()
        
        if not db_student:
            logger.warning(f"Attempted delete on non-existent student: {student_id}")
            raise HTTPException(status_code=404, detail="Student not found")
        
        db.delete(db_student)
        db.commit()
        
        logger.info(f"Deleted student: {student_id}")
        return None
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting student {student_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/{student_id}/activate")
def activate_student(
    student_id: int,
    db: Session = Depends(get_db)
):
    """Activate a student account"""
    try:
        from backend.models import Student
        db_student = db.query(Student).filter(Student.id == student_id).first()
        
        if not db_student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        db_student.is_active = True  # type: ignore[assignment]
        db.commit()
        
        logger.info(f"Activated student: {student_id}")
        return {"message": "Student activated successfully", "student_id": student_id}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error activating student {student_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/{student_id}/deactivate")
def deactivate_student(
    student_id: int,
    db: Session = Depends(get_db)
):
    """Deactivate a student account"""
    try:
        from backend.models import Student
        db_student = db.query(Student).filter(Student.id == student_id).first()
        
        if not db_student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        db_student.is_active = False  # type: ignore[assignment]
        db.commit()
        
        logger.info(f"Deactivated student: {student_id}")
        return {"message": "Student deactivated successfully", "student_id": student_id}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deactivating student {student_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


# ========== BULK OPERATIONS ==========

@router.post("/bulk/create")
def bulk_create_students(
    students_data: List[StudentCreate],
    db: Session = Depends(get_db)
):
    """
    Create multiple students at once.
    
    Useful for importing student lists.
    """
    try:
        from backend.models import Student
        
        created: List[str] = []
        errors: List[dict] = []

        # Commit per-student to avoid transaction-wide rollback on a single failure
        from sqlalchemy.exc import IntegrityError

        for idx, student_data in enumerate(students_data):
            try:
                # Proactive duplicate checks (using committed state)
                existing_email = db.query(Student).filter(Student.email == student_data.email).first()
                if existing_email:
                    errors.append({"index": idx, "error": f"Email already exists: {student_data.email}"})
                    continue

                existing_sid = db.query(Student).filter(Student.student_id == student_data.student_id).first()
                if existing_sid:
                    errors.append({"index": idx, "error": f"Student ID already exists: {student_data.student_id}"})
                    continue

                db_student = Student(**student_data.model_dump())
                db.add(db_student)
                # Flush + commit to surface DB-level uniqueness early and persist successes
                db.commit()
                db.refresh(db_student)
                created.append(str(db_student.student_id))

            except IntegrityError as ie:
                db.rollback()
                msg = str(getattr(ie, "orig", ie))
                errors.append({"index": idx, "error": f"Integrity error: {msg}"})
            except Exception as e:
                db.rollback()
                errors.append({"index": idx, "error": str(e)})

        logger.info(f"Bulk created {len(created)} students, {len(errors)} errors")

        return {
            "created": len(created),
            "failed": len(errors),
            "created_ids": created,
            "errors": errors,
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error in bulk create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
