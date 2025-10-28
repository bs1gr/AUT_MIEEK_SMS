
"""
IMPROVED: Grade Management Routes
Handles grade CRUD and grade calculation operations
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional, Tuple, cast
from datetime import date, timedelta
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/grades",
    tags=["Grades"],
    responses={404: {"description": "Not found"}}
)


from backend.schemas.grades import GradeCreate, GradeUpdate, GradeResponse


class GradeAnalysis(BaseModel):
    """Schema for grade analysis"""
    student_id: int
    course_id: int
    total_grades: int
    average_grade: float
    highest_grade: float
    lowest_grade: float
    grade_distribution: dict


# ========== DEPENDENCY INJECTION ==========
from backend.db import get_session as get_db
from backend.config import settings


def _normalize_date_range(start_date: Optional[date], end_date: Optional[date]) -> Optional[Tuple[date, date]]:
    """Normalize and validate a date range using SEMESTER_WEEKS default.

    - If both None: no filtering (return None)
    - If only start: end = start + weeks - 1 day
    - If only end: start = end - weeks + 1 day
    - Validate start <= end
    """
    if start_date is None and end_date is None:
        return None
    weeks = int(getattr(settings, "SEMESTER_WEEKS", 14) or 14)
    if start_date is not None and end_date is None:
        end_date = start_date + timedelta(weeks=weeks) - timedelta(days=1)
    elif start_date is None and end_date is not None:
        start_date = end_date - timedelta(weeks=weeks) + timedelta(days=1)
    if start_date and end_date and start_date > end_date:
        raise HTTPException(status_code=400, detail="start_date must be before end_date")
    return cast(Tuple[date, date], (start_date, end_date))


# ========== ENDPOINTS ==========

@router.post("/", response_model=GradeResponse, status_code=201)
def create_grade(
    grade_data: GradeCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new grade record.
    
    - **student_id**: Student ID
    - **course_id**: Course ID
    - **assignment_name**: Name of assignment
    - **grade**: Score received
    - **max_grade**: Maximum possible score (default: 100)
    
    Note: Validation ensures grade <= max_grade
    """
    try:
        from backend.models import Grade, Student, Course

        # Validate student exists
        student = db.query(Student).filter(Student.id == grade_data.student_id).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        # Validate course exists
        course = db.query(Course).filter(Course.id == grade_data.course_id).first()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        
        db_grade = Grade(**grade_data.model_dump())
        db.add(db_grade)
        db.commit()
        db.refresh(db_grade)
        
        logger.info(f"Created grade: {db_grade.id} for student {grade_data.student_id}")
        return db_grade
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating grade: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/", response_model=List[GradeResponse])
def get_all_grades(
    skip: int = 0,
    limit: int = 100,
    student_id: Optional[int] = None,
    course_id: Optional[int] = None,
    category: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    use_submitted: bool = False,
    db: Session = Depends(get_db)
):
    """
    Get all grades with optional filtering.
    """
    try:
        from backend.models import Grade

        query = db.query(Grade)
        
        if student_id is not None:
            query = query.filter(Grade.student_id == student_id)
        if course_id is not None:
            query = query.filter(Grade.course_id == course_id)
        if category is not None:
            query = query.filter(Grade.category.ilike(f"%{category}%"))
        # Date range filter
        rng = _normalize_date_range(start_date, end_date)
        if rng:
            s, e = rng
            date_col = Grade.date_submitted if use_submitted else Grade.date_assigned
            query = query.filter(date_col >= s, date_col <= e)
        
        grades = query.offset(skip).limit(limit).all()
        return grades
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching all grades: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/student/{student_id}", response_model=List[GradeResponse])
def get_student_grades(
    student_id: int,
    course_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    use_submitted: bool = False,
    db: Session = Depends(get_db)
):
    """Get all grades for a student, optionally filtered by course"""
    try:
        from backend.models import Grade, Student

        # Validate student exists
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        query = db.query(Grade).filter(Grade.student_id == student_id)
        
        if course_id:
            query = query.filter(Grade.course_id == course_id)
        rng = _normalize_date_range(start_date, end_date)
        if rng:
            s, e = rng
            date_col = Grade.date_submitted if use_submitted else Grade.date_assigned
            query = query.filter(date_col.between(s, e))
        
        grades = query.all()
        return grades
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving student grades: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/course/{course_id}", response_model=List[GradeResponse])
def get_course_grades(
    course_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    use_submitted: bool = False,
    db: Session = Depends(get_db)
):
    """Get all grades for a course"""
    try:
        from backend.models import Grade, Course

        # Validate course exists
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        
        query = db.query(Grade).filter(Grade.course_id == course_id)
        rng = _normalize_date_range(start_date, end_date)
        if rng:
            s, e = rng
            date_col = Grade.date_submitted if use_submitted else Grade.date_assigned
            query = query.filter(date_col.between(s, e))
        grades = query.all()
        return grades
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving course grades: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{grade_id}", response_model=GradeResponse)
def get_grade(
    grade_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a single grade by its ID.
    """
    try:
        from backend.models import Grade

        # Use Session.get for SQLAlchemy 2.x compatibility and performance
        grade = db.get(Grade, grade_id)
        if not grade:
            raise HTTPException(status_code=404, detail="Grade not found")
        return grade
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching grade {grade_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/{grade_id}", response_model=GradeResponse)
def update_grade(
    grade_id: int,
    grade_data: GradeUpdate,
    db: Session = Depends(get_db)
):
    """
    Update a grade record.
    
    Note: Validation ensures grade <= max_grade
    """
    try:
        from backend.models import Grade

        db_grade = db.query(Grade).filter(Grade.id == grade_id).first()
        
        if not db_grade:
            raise HTTPException(status_code=404, detail="Grade not found")
        
        update_data = grade_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_grade, key, value)
        
        db.commit()
        db.refresh(db_grade)
        
        logger.info(f"Updated grade: {grade_id}")
        return db_grade
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating grade: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/{grade_id}", status_code=204)
def delete_grade(
    grade_id: int,
    db: Session = Depends(get_db)
):
    """Delete a grade record"""
    try:
        from backend.models import Grade

        db_grade = db.query(Grade).filter(Grade.id == grade_id).first()

        if not db_grade:
            raise HTTPException(status_code=404, detail="Grade not found")

        db.delete(db_grade)
        db.commit()
        
        logger.info(f"Deleted grade: {grade_id}")
        return None
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting grade: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/analysis/student/{student_id}/course/{course_id}")
def get_grade_analysis(
    student_id: int,
    course_id: int,
    db: Session = Depends(get_db)
):
    """Get grade analysis for a student in a course"""
    try:
        from backend.models import Grade

        grades = db.query(Grade).filter(
            Grade.student_id == student_id,
            Grade.course_id == course_id
        ).all()
        
        if not grades:
            return {"message": "No grades found for this student in this course"}
        
        percentages = [(g.grade / g.max_grade * 100) for g in grades]
        
        return {
            "student_id": student_id,
            "course_id": course_id,
            "total_grades": len(grades),
            "average_grade": round(sum(percentages) / len(percentages), 2),
            "highest_grade": round(max(percentages), 2),
            "lowest_grade": round(min(percentages), 2),
            "grade_distribution": {
                "A (90-100)": len([p for p in percentages if p >= 90]),
                "B (80-89)": len([p for p in percentages if 80 <= p < 90]),
                "C (70-79)": len([p for p in percentages if 70 <= p < 80]),
                "D (60-69)": len([p for p in percentages if 60 <= p < 70]),
                "F (below 60)": len([p for p in percentages if p < 60])
            }
        }
        
    except Exception as e:
        logger.error(f"Error analyzing grades: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
