"""
IMPROVED: Course Management Routes
Handles all course-related CRUD operations and endpoints
Split from main.py for better organization
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/courses",
    tags=["Courses"],
    responses={404: {"description": "Not found"}}
)


from backend.schemas.courses import CourseCreate, CourseUpdate, CourseResponse


# ========== DEPENDENCY INJECTION ==========
from backend.db import get_session as get_db


def _normalize_evaluation_rules(er: Any) -> Optional[List[Dict[str, Any]]]:
    """
    Normalize evaluation rules from various input formats to a standard list of dicts.
    
    Handles multiple input formats:
    - List of dicts with 'category' and 'weight' keys
    - Nested lists like [["category", 50], ["category", 50]]
    - String format where category includes weight (e.g., "Midterm: 50%")
    - JSON strings that need parsing
    
    Args:
        er: Evaluation rules in any supported format
    
    Returns:
        List of dicts with 'category' and 'weight' keys, normalized and validated
    """
    try:
        # Preserve None distinctly from empty list
        if er is None:
            return None
        if not er:
            return []
        if isinstance(er, list):
            if all(isinstance(x, dict) for x in er):
                import re
                pattern = re.compile(r"^(?P<cat>.+?)[\s:,-]+(?P<w>\d+(?:[\.,]\d+)?)%?$")
                fixed: List[Dict[str, Any]] = []
                for d in er:
                    if not isinstance(d, dict):
                        continue
                    cat = str(d.get("category", "")).strip()
                    weight = d.get("weight")
                    if (weight is None or (isinstance(weight, (int, float)) and float(weight) == 0.0)) and cat:
                        m = pattern.match(cat)
                        if m:
                            cat_clean = m.group('cat').strip()
                            w_s = m.group('w').replace(',', '.')
                            try:
                                weight = float(w_s)
                            except Exception:
                                weight = 0.0
                            d = {**d, "category": cat_clean, "weight": weight}
                    fixed.append(d)
                return fixed
            rules: List[Dict[str, Any]] = []
            buf: List[Any] = []
            for x in er:
                if isinstance(x, (str, int, float)):
                    buf.append(x)
                    if len(buf) == 2:
                        cat = str(buf[0]).strip()
                        w_raw = buf[1]
                        if isinstance(w_raw, str):
                            w_s = w_raw.replace('%', '').strip().replace(',', '.')
                            try:
                                weight = float(w_s)
                            except Exception:
                                weight = 0.0
                        else:
                            try:
                                weight = float(w_raw)
                            except Exception:
                                weight = 0.0
                        rules.append({"category": cat, "weight": weight})
                        buf = []
                # ignore other types
            if rules:
                return rules
            # Attempt to parse single-string entries like "Name: 10%" or "Name - 10%"
            parsed_rules: List[Dict[str, Any]] = []
            import re
            pattern = re.compile(r"^(?P<cat>.+?)[\s:,-]+(?P<w>\d+(?:[\.,]\d+)?)%?$")
            for x in er:
                if isinstance(x, str):
                    m = pattern.match(x.strip())
                    if m:
                        cat = m.group('cat').strip()
                        w_s = m.group('w').replace(',', '.')
                        try:
                            weight = float(w_s)
                        except Exception:
                            weight = 0.0
                        parsed_rules.append({"category": cat, "weight": weight})
            if parsed_rules:
                return parsed_rules
            # Fallback: wrap each primitive as category with 0 weight
            return [{"category": str(x), "weight": 0.0} for x in er if isinstance(x, (str, int, float))]
        if isinstance(er, dict):
            return [er]
    except Exception:
        pass
    return []


# ========== ENDPOINTS ==========

@router.post("/", response_model=CourseResponse, status_code=201)
def create_course(
    course: CourseCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new course.
    
    - **course_code**: Unique course code (e.g., MATH101)
    - **course_name**: Name of the course
    - **semester**: Semester (e.g., Fall 2024)
    - **credits**: Number of credits (1-12)
    - **evaluation_rules**: Optional grading rules (JSON)
    - **hours_per_week**: Teaching hours per week
    """
    try:
        from backend.models import Course
        
        # Use database-level locking to prevent race conditions
        existing = db.query(Course).filter(Course.course_code == course.course_code).with_for_update().first()
        if existing:
            logger.warning(f"Attempted to create duplicate course: {course.course_code}")
            raise HTTPException(status_code=400, detail="Course code already exists")
        
        db_course = Course(**course.model_dump())
        db.add(db_course)
        db.commit()
        db.refresh(db_course)
        normalized = _normalize_evaluation_rules(db_course.evaluation_rules)
        setattr(db_course, "evaluation_rules", normalized)
        
        logger.info(f"Created course: {db_course.course_code} ({db_course.id})")
        return db_course
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating course: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/", response_model=List[CourseResponse])
def get_all_courses(
    skip: int = 0,
    limit: int = 100,
    semester: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Retrieve all courses with optional filtering.
    
    - **skip**: Number of records to skip
    - **limit**: Maximum records to return
    - **semester**: Filter by semester (optional)
    """
    try:
        from backend.models import Course
        
        query = db.query(Course)
        
        if semester:
            query = query.filter(Course.semester == semester)
        
        courses = query.offset(skip).limit(limit).all()
        logger.info(f"Retrieved {len(courses)} courses")
        for c in courses:
            normalized = _normalize_evaluation_rules(c.evaluation_rules)
            setattr(c, "evaluation_rules", normalized)
        return courses
        
    except Exception as e:
        logger.error(f"Error retrieving courses: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{course_id}", response_model=CourseResponse)
def get_course(
    course_id: int,
    db: Session = Depends(get_db)
):
    """
    Retrieve a specific course by ID.
    
    - **course_id**: The ID of the course
    """
    try:
        from backend.models import Course
        
        course = db.query(Course).filter(Course.id == course_id).first()
        
        if not course:
            logger.warning(f"Course not found: {course_id}")
            raise HTTPException(status_code=404, detail="Course not found")
        
        logger.info(f"Retrieved course: {course_id}")
        normalized = _normalize_evaluation_rules(course.evaluation_rules)
        setattr(course, "evaluation_rules", normalized)
        return course
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving course {course_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/{course_id}", response_model=CourseResponse)
def update_course(
    course_id: int,
    course_data: CourseUpdate,
    db: Session = Depends(get_db)
):
    """
    Update course information.
    
    - **course_id**: The ID of the course to update
    - **course_data**: Updated course information
    """
    try:
        from backend.models import Course
        
        db_course = db.query(Course).filter(Course.id == course_id).first()
        
        if not db_course:
            logger.warning(f"Attempted update on non-existent course: {course_id}")
            raise HTTPException(status_code=404, detail="Course not found")
        
        # Update only provided fields
        update_data = course_data.model_dump(exclude_unset=True)
        
        # Validate evaluation rules if provided
        if 'evaluation_rules' in update_data and update_data['evaluation_rules']:
            rules = update_data['evaluation_rules']
            total_weight = sum(float(rule.get('weight', 0)) for rule in rules if isinstance(rule, dict))
            if abs(total_weight - 100.0) > 0.01:  # Allow for floating point precision
                logger.warning(f"Evaluation rules weights sum to {total_weight}%, not 100%")
                raise HTTPException(
                    status_code=400, 
                    detail=f"Evaluation rule weights must sum to 100%. Current sum: {total_weight}%"
                )
        
        for key, value in update_data.items():
            setattr(db_course, key, value)
        
        db.commit()
        db.refresh(db_course)
        # Normalize before returning
        normalized = _normalize_evaluation_rules(db_course.evaluation_rules)
        setattr(db_course, "evaluation_rules", normalized)
        
        logger.info(f"Updated course: {course_id}")
        return db_course
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating course {course_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/{course_id}", status_code=204)
def delete_course(
    course_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete a course.
    
    WARNING: This will delete all grades and attendance records for this course.
    
    - **course_id**: The ID of the course to delete
    """
    try:
        from backend.models import Course
        
        db_course = db.query(Course).filter(Course.id == course_id).first()
        
        if not db_course:
            logger.warning(f"Attempted delete on non-existent course: {course_id}")
            raise HTTPException(status_code=404, detail="Course not found")
        
        db.delete(db_course)
        db.commit()
        
        logger.info(f"Deleted course: {course_id}")
        return None
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting course {course_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{course_id}/evaluation-rules")
def get_evaluation_rules(
    course_id: int,
    db: Session = Depends(get_db)
):
    """Get evaluation rules for a specific course"""
    try:
        from backend.models import Course
        
        course = db.query(Course).filter(Course.id == course_id).first()
        
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        
        return {
            "course_id": course_id,
            "course_code": course.course_code,
            "evaluation_rules": _normalize_evaluation_rules(course.evaluation_rules)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving evaluation rules: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/{course_id}/evaluation-rules")
def update_evaluation_rules(
    course_id: int,
    rules_data: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """Update evaluation rules for a course"""
    try:
        from backend.models import Course
        
        db_course = db.query(Course).filter(Course.id == course_id).first()
        
        if not db_course:
            raise HTTPException(status_code=404, detail="Course not found")
        
        incoming = rules_data.get("evaluation_rules", [])
        normalized = _normalize_evaluation_rules(incoming)
        setattr(db_course, "evaluation_rules", normalized)
        db.commit()
        db.refresh(db_course)
        
        logger.info(f"Updated evaluation rules for course: {course_id}")
        
        return {
            "course_id": course_id,
            "evaluation_rules": _normalize_evaluation_rules(db_course.evaluation_rules)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating evaluation rules: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
