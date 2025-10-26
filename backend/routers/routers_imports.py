r"""
Imports Router
Bulk-import courses and students from JSON files in templates directories.
- Courses dir: D:\SMS\student-management-system\templates\courses\
- Students dir: D:\SMS\student-management-system\templates\students\
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List
import os
import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

COURSES_DIR = r"D:\SMS\student-management-system\templates\courses"
STUDENTS_DIR = r"D:\SMS\student-management-system\templates\students"

router = APIRouter(
    prefix="/imports",
    tags=["Imports"],
    responses={404: {"description": "Not found"}}
)

from backend.db import get_session as get_db


@router.get("/diagnose")
def diagnose_import_environment():
    """Return diagnostics about import directories and files found."""
    try:
        courses_exists = os.path.isdir(COURSES_DIR)
        students_exists = os.path.isdir(STUDENTS_DIR)
        courses_files = []
        students_files = []
        if courses_exists:
            courses_files = [f for f in os.listdir(COURSES_DIR) if f.lower().endswith('.json')]
        if students_exists:
            students_files = [f for f in os.listdir(STUDENTS_DIR) if f.lower().endswith('.json')]
        return {
            "courses_dir": COURSES_DIR,
            "students_dir": STUDENTS_DIR,
            "courses_dir_exists": courses_exists,
            "students_dir_exists": students_exists,
            "course_json_files": courses_files,
            "student_json_files": students_files,
        }
    except Exception as e:
        logger.error(f"Diagnose failed: {e}")
        raise HTTPException(status_code=500, detail="Diagnose failed")


@router.post("/courses")
def import_courses(db: Session = Depends(get_db)):
    """Import all courses from JSON files in the courses templates directory.
    JSON schema example:
    {
      "course_code": "CS101",
      "course_name": "Intro to CS",
      "semester": "Fall 2025",
      "credits": 3,
      "description": "...",
      "evaluation_rules": [ {"category": "Midterm Exam", "weight": 30} ],
      "hours_per_week": 3,
      "teaching_schedule": {"Monday": {"periods": 2, "start_time": "08:00", "duration": 50}}
    }
    """
    try:
        from backend.models import Course
        if not os.path.isdir(COURSES_DIR):
            raise HTTPException(status_code=404, detail=f"Courses directory not found: {COURSES_DIR}")
        created = 0
        updated = 0
        errors: List[str] = []
        logger.info(f"Importing courses from: {COURSES_DIR}")
        for name in os.listdir(COURSES_DIR):
            if not name.lower().endswith(('.json')):
                continue
            path = os.path.join(COURSES_DIR, name)
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                items = data if isinstance(data, list) else [data]
                for obj in items:
                    code = obj.get('course_code')
                    if not code:
                        errors.append(f"Missing course_code in {name}")
                        continue
                    # Coerce common fields
                    if 'credits' in obj:
                        try:
                            obj['credits'] = int(obj['credits'])
                        except Exception:
                            errors.append(f"{name}: invalid credits '{obj.get('credits')}', using default")
                            obj.pop('credits', None)
                    if 'hours_per_week' in obj:
                        try:
                            obj['hours_per_week'] = float(obj['hours_per_week'])
                        except Exception:
                            errors.append(f"{name}: invalid hours_per_week '{obj.get('hours_per_week')}', using default")
                            obj.pop('hours_per_week', None)
                    # Normalize simple string fields
                    if 'course_code' in obj and isinstance(obj['course_code'], list):
                        obj['course_code'] = " ".join([str(x).strip() for x in obj['course_code'] if str(x).strip()])
                    if 'course_name' in obj and isinstance(obj['course_name'], list):
                        obj['course_name'] = " ".join([str(x).strip() for x in obj['course_name'] if str(x).strip()])
                    if 'semester' in obj and isinstance(obj['semester'], list):
                        obj['semester'] = " ".join([str(x).strip() for x in obj['semester'] if str(x).strip()])
                    # Set default semester if empty
                    if 'semester' in obj and not obj['semester']:
                        obj['semester'] = "Α' Εξάμηνο"  # Default to 1st semester
                    # Normalize description: must be a string
                    if 'description' in obj and isinstance(obj['description'], list):
                        try:
                            obj['description'] = "\n".join(map(lambda x: str(x), obj['description']))
                        except Exception:
                            obj['description'] = str(obj['description'])
                    if 'evaluation_rules' in obj:
                        er = obj['evaluation_rules']
                        if isinstance(er, str):
                            try:
                                obj['evaluation_rules'] = json.loads(er)
                            except Exception:
                                errors.append(f"{name}: evaluation_rules JSON parse failed, dropping field")
                                obj.pop('evaluation_rules', None)
                        elif isinstance(er, list):
                            if all(isinstance(x, dict) for x in er):
                                pass
                            else:
                                # First, join consecutive strings that might be part of a multi-line entry
                                # A line ending with ':' followed by lines not containing ':' should be joined
                                import re
                                joined_entries = []
                                current_entry = ""
                                for x in er:
                                    if not isinstance(x, str):
                                        continue
                                    x_stripped = x.strip()
                                    if not x_stripped:
                                        continue
                                    # Skip metadata entries like "Γλώσσα", "Ελληνική", "Αγγλική", etc.
                                    if x_stripped in ["Γλώσσα", "Ελληνική", "Αγγλική", "Κωδικός", "Μαθήματος",
                                                      "Τίτλος Μαθήματος", "Κωδικός Μαθήματος", "Τύπος Μαθήματος",
                                                      "Υποχρεωτικό", "Επίπεδο", "Έτος/Εξάμηνο", "Φοίτησης",
                                                      "Όνομα Διδάσκοντα", "Τίτλος Μαθήματος", "Επίπεδο 5 του Εθνικού Πλαισίου Προσόντων",
                                                      "2o Έτος/Α΄ Εξάμηνο"]:
                                        continue
                                    # If we have a current entry and this line has a percentage, it's a continuation
                                    if current_entry and re.search(r'\d+%?\s*$', x_stripped):
                                        current_entry += " " + x_stripped
                                        joined_entries.append(current_entry)
                                        current_entry = ""
                                    # If current entry exists and this doesn't look like a continuation, save current and start new
                                    elif current_entry and ':' in x_stripped:
                                        joined_entries.append(current_entry)
                                        current_entry = x_stripped
                                    # If no current entry and this has a colon but no percentage, it's the start of a multi-line
                                    elif not current_entry and ':' in x_stripped and not re.search(r'\d+%?\s*$', x_stripped):
                                        current_entry = x_stripped
                                    # If it has both colon and percentage, it's a complete entry
                                    elif ':' in x_stripped and re.search(r'\d+%?\s*$', x_stripped):
                                        joined_entries.append(x_stripped)
                                    # Otherwise, it's a continuation of current entry
                                    elif current_entry:
                                        current_entry += " " + x_stripped

                                # Don't forget the last entry if any
                                if current_entry:
                                    joined_entries.append(current_entry)

                                # Now use joined_entries instead of er for parsing
                                er = joined_entries
                                rules = []
                                buf = []
                                # Pairing of consecutive primitives (category, weight)
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
                                if not rules:
                                    # Try parsing single-string entries like "Name: 10%" or "Name - 10%"
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
                                                rules.append({"category": cat, "weight": weight})
                                # Only use parsed rules that have valid percentages, ignore metadata entries
                                obj['evaluation_rules'] = rules if rules else []
                        elif isinstance(er, dict):
                            obj['evaluation_rules'] = [er]
                        else:
                            errors.append(f"{name}: evaluation_rules unsupported type {type(er)}, dropping field")
                            obj.pop('evaluation_rules', None)
                    # Normalize teaching_schedule (JSON column): accept dict or JSON string (or empty list)
                    if 'teaching_schedule' in obj:
                        ts = obj['teaching_schedule']
                        if isinstance(ts, str):
                            try:
                                obj['teaching_schedule'] = json.loads(ts)
                            except Exception:
                                errors.append(f"{name}: teaching_schedule JSON parse failed, dropping field")
                                obj.pop('teaching_schedule', None)
                        elif isinstance(ts, dict):
                            pass
                        elif isinstance(ts, list) and len(ts) == 0:
                            # allow empty schedule
                            obj['teaching_schedule'] = []
                        else:
                            errors.append(f"{name}: teaching_schedule unsupported type {type(ts)}, dropping field")
                            obj.pop('teaching_schedule', None)
                    db_course = db.query(Course).filter(Course.course_code == code).first()
                    if db_course:
                        for field in ['course_name','semester','credits','description','evaluation_rules','hours_per_week','teaching_schedule']:
                            if field in obj:
                                setattr(db_course, field, obj[field])
                        updated += 1
                    else:
                        db_course = Course(**{k:v for k,v in obj.items() if k in ['course_code','course_name','semester','credits','description','evaluation_rules','hours_per_week','teaching_schedule']})
                        db.add(db_course)
                        created += 1
            except Exception as e:
                logger.error(f"Failed to import course from {name}: {e}")
                errors.append(f"{name}: {e}")
        try:
            db.commit()
        except Exception as e:
            db.rollback()
            logger.error(f"Commit failed during course import: {e}", exc_info=True)
            errors.append(f"commit: {e}")
            # Return 400 with details so frontend can display what's wrong
            raise HTTPException(status_code=400, detail={"message": "Course import failed during commit", "errors": errors})
        return {"created": created, "updated": updated, "errors": errors}
    except HTTPException:
        # bubbled up commit error with details
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error importing courses: {e}", exc_info=True)
        # Return details where possible
        raise HTTPException(status_code=400, detail={"message": "Error importing courses", "error": str(e)})


@router.post("/upload")
async def import_from_upload(
    import_type: str = Form(...),
    files: List[UploadFile] | None = File(None),
    file: str | None = Form(None),  # absorb stray text field named 'file'
    json_text: str | None = Form(None),  # optional raw JSON text when file picker is unavailable
    db: Session = Depends(get_db)
):
    """Import courses or students from uploaded JSON files.
    - import_type: 'courses' or 'students'
    - files: one or more .json files
    """
    try:
        norm = (import_type or "").strip().lower()
        if norm in ("course", "courses"):
            norm = "courses"
        elif norm in ("student", "students"):
            norm = "students"
        else:
            raise HTTPException(status_code=400, detail="import_type must be 'courses' or 'students'")
        from backend.models import Course, Student
        uploads: List[UploadFile] = []
        if files:
            uploads.extend(files)
        data_batches: List[List[dict]] = []
        # Prefer files when provided; otherwise allow 'json' text payload for convenience
        if not uploads and not json_text:
            raise HTTPException(status_code=400, detail="No files uploaded and no 'json' form field provided")
        created = 0
        updated = 0
        errors: list[str] = []
        # Process file uploads first
        for up in uploads:
            try:
                content = await up.read()
                data = json.loads(content.decode("utf-8"))
                data_batches.append(data if isinstance(data, list) else [data])
            except Exception as e:
                errors.append(f"{up.filename}: {e}")

        # Process optional raw JSON text from form field
        if json_text:
            try:
                parsed = json.loads(json_text)
                data_batches.append(parsed if isinstance(parsed, list) else [parsed])
            except Exception as e:
                errors.append(f"json: {e}")

        # Flatten batches into items for processing
        def iter_items():
            for batch in data_batches:
                for item in batch:
                    yield item

        # Start main import logic
        for obj in iter_items():
                if norm == "courses":
                        code = obj.get('course_code') if isinstance(obj, dict) else None
                        if not code:
                            errors.append("item: missing course_code")
                            continue
                        # Normalize fields similar to directory import
                        if 'credits' in obj:
                            try:
                                obj['credits'] = int(obj['credits'])
                            except Exception:
                                errors.append(f"item: invalid credits '{obj.get('credits')}', using default")
                                obj.pop('credits', None)
                        if 'hours_per_week' in obj:
                            try:
                                obj['hours_per_week'] = float(obj['hours_per_week'])
                            except Exception:
                                errors.append(f"item: invalid hours_per_week '{obj.get('hours_per_week')}', using default")
                                obj.pop('hours_per_week', None)
                        # Normalize simple string fields
                        if 'course_code' in obj and isinstance(obj['course_code'], list):
                            obj['course_code'] = " ".join([str(x).strip() for x in obj['course_code'] if str(x).strip()])
                        if 'course_name' in obj and isinstance(obj['course_name'], list):
                            obj['course_name'] = " ".join([str(x).strip() for x in obj['course_name'] if str(x).strip()])
                        if 'semester' in obj and isinstance(obj['semester'], list):
                            obj['semester'] = " ".join([str(x).strip() for x in obj['semester'] if str(x).strip()])
                        # Set default semester if empty
                        if 'semester' in obj and not obj['semester']:
                            obj['semester'] = "Α' Εξάμηνο"  # Default to 1st semester
                        if 'description' in obj and isinstance(obj['description'], list):
                            try:
                                obj['description'] = "\n".join(map(lambda x: str(x), obj['description']))
                            except Exception:
                                obj['description'] = str(obj['description'])
                        if 'evaluation_rules' in obj:
                            er = obj['evaluation_rules']
                            if isinstance(er, str):
                                try:
                                    obj['evaluation_rules'] = json.loads(er)
                                except Exception:
                                    errors.append("item: evaluation_rules JSON parse failed, dropping field")
                                    obj.pop('evaluation_rules', None)
                            elif isinstance(er, list):
                                if all(isinstance(x, dict) for x in er):
                                    pass
                                else:
                                    # First, join consecutive strings that might be part of a multi-line entry
                                    # A line ending with ':' followed by lines not containing ':' should be joined
                                    import re
                                    joined_entries = []
                                    current_entry = ""
                                    for x in er:
                                        if not isinstance(x, str):
                                            continue
                                        x_stripped = x.strip()
                                        if not x_stripped:
                                            continue
                                        # Skip metadata entries like "Γλώσσα", "Ελληνική", "Αγγλική", etc.
                                        if x_stripped in ["Γλώσσα", "Ελληνική", "Αγγλική", "Κωδικός", "Μαθήματος",
                                                          "Τίτλος Μαθήματος", "Κωδικός Μαθήματος", "Τύπος Μαθήματος",
                                                          "Υποχρεωτικό", "Επίπεδο", "Έτος/Εξάμηνο", "Φοίτησης",
                                                          "Όνομα Διδάσκοντα", "Τίτλος Μαθήματος", "Επίπεδο 5 του Εθνικού Πλαισίου Προσόντων",
                                                          "2o Έτος/Α΄ Εξάμηνο"]:
                                            continue
                                        # If we have a current entry and this line has a percentage, it's a continuation
                                        if current_entry and re.search(r'\d+%?\s*$', x_stripped):
                                            current_entry += " " + x_stripped
                                            joined_entries.append(current_entry)
                                            current_entry = ""
                                        # If current entry exists and this doesn't look like a continuation, save current and start new
                                        elif current_entry and ':' in x_stripped:
                                            joined_entries.append(current_entry)
                                            current_entry = x_stripped
                                        # If no current entry and this has a colon but no percentage, it's the start of a multi-line
                                        elif not current_entry and ':' in x_stripped and not re.search(r'\d+%?\s*$', x_stripped):
                                            current_entry = x_stripped
                                        # If it has both colon and percentage, it's a complete entry
                                        elif ':' in x_stripped and re.search(r'\d+%?\s*$', x_stripped):
                                            joined_entries.append(x_stripped)
                                        # Otherwise, it's a continuation of current entry
                                        elif current_entry:
                                            current_entry += " " + x_stripped

                                    # Don't forget the last entry if any
                                    if current_entry:
                                        joined_entries.append(current_entry)

                                    # Now use joined_entries instead of er for parsing
                                    er = joined_entries
                                    rules = []
                                    buf = []
                                    # Pairing of consecutive primitives (category, weight)
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
                                    if not rules:
                                        # Try parsing single-string entries like "Name: 10%" or "Name - 10%"
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
                                                    rules.append({"category": cat, "weight": weight})
                                    # Only use parsed rules that have valid percentages, ignore metadata entries
                                obj['evaluation_rules'] = rules if rules else []
                            elif isinstance(er, dict):
                                obj['evaluation_rules'] = [er]
                            else:
                                errors.append(f"item: evaluation_rules unsupported type {type(er)}, dropping field")
                                obj.pop('evaluation_rules', None)
                        if 'teaching_schedule' in obj:
                            ts = obj['teaching_schedule']
                            if isinstance(ts, str):
                                try:
                                    obj['teaching_schedule'] = json.loads(ts)
                                except Exception:
                                    errors.append("item: teaching_schedule JSON parse failed, dropping field")
                                    obj.pop('teaching_schedule', None)
                            elif isinstance(ts, dict):
                                pass
                            elif isinstance(ts, list) and len(ts) == 0:
                                obj['teaching_schedule'] = []
                            else:
                                errors.append(f"item: teaching_schedule unsupported type {type(ts)}, dropping field")
                                obj.pop('teaching_schedule', None)

                        db_course = db.query(Course).filter(Course.course_code == code).first()
                        if db_course:
                            for field in ['course_name','semester','credits','description','evaluation_rules','hours_per_week','teaching_schedule']:
                                if field in obj:
                                    setattr(db_course, field, obj[field])
                            updated += 1
                        else:
                            db_course = Course(**{k:v for k,v in obj.items() if k in ['course_code','course_name','semester','credits','description','evaluation_rules','hours_per_week','teaching_schedule']})
                            db.add(db_course)
                            created += 1
                else:  # students
                    sid = obj.get('student_id') if isinstance(obj, dict) else None
                    email = obj.get('email') if isinstance(obj, dict) else None
                    if not sid or not email:
                        errors.append("item: missing student_id or email")
                        continue
                    if 'enrollment_date' in obj and isinstance(obj['enrollment_date'], str):
                        # Best-effort ISO parse
                        try:
                            obj['enrollment_date'] = datetime.fromisoformat(obj['enrollment_date']).date()
                        except Exception:
                            pass
                    db_student = db.query(Student).filter((Student.student_id == sid) | (Student.email == email)).first()
                    if db_student:
                        for field in ['first_name','last_name','email','student_id','enrollment_date','is_active']:
                            if field in obj:
                                setattr(db_student, field, obj[field])
                        updated += 1
                    else:
                        db_student = Student(**{k:v for k,v in obj.items() if k in ['first_name','last_name','email','student_id','enrollment_date','is_active']})
                        db.add(db_student)
                        created += 1
            
        try:
            db.commit()
        except Exception as e:
            db.rollback()
            errors.append(f"commit: {e}")
            raise HTTPException(status_code=400, detail={"message": "Upload import failed during commit", "errors": errors})
        return {"type": norm, "created": created, "updated": updated, "errors": errors}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Upload import failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/students")
def import_students(db: Session = Depends(get_db)):
    """Import all students from JSON files in the students templates directory.
    JSON schema example:
    {
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "student_id": "S001",
      "enrollment_date": "2025-09-01"
    }
    """
    try:
        from backend.models import Student
        if not os.path.isdir(STUDENTS_DIR):
            raise HTTPException(status_code=404, detail=f"Students directory not found: {STUDENTS_DIR}")
        created = 0
        updated = 0
        errors: List[str] = []
        for name in os.listdir(STUDENTS_DIR):
            if not name.lower().endswith(('.json')):
                continue
            path = os.path.join(STUDENTS_DIR, name)
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                items = data if isinstance(data, list) else [data]
                for obj in items:
                    sid = obj.get('student_id')
                    email = obj.get('email')
                    if not sid or not email:
                        errors.append(f"Missing student_id or email in {name}")
                        continue
                    db_student = db.query(Student).filter((Student.student_id == sid) | (Student.email == email)).first()
                    if db_student:
                        for field in ['first_name','last_name','email','student_id','enrollment_date','is_active']:
                            if field in obj:
                                setattr(db_student, field, obj[field])
                        updated += 1
                    else:
                        # parse date if provided
                        if 'enrollment_date' in obj and isinstance(obj['enrollment_date'], str):
                            try:
                                obj['enrollment_date'] = datetime.fromisoformat(obj['enrollment_date']).date()
                            except Exception:
                                pass
                        db_student = Student(**{k:v for k,v in obj.items() if k in ['first_name','last_name','email','student_id','enrollment_date','is_active']})
                        db.add(db_student)
                        created += 1
            except Exception as e:
                logger.error(f"Failed to import student from {name}: {e}")
                errors.append(f"{name}: {e}")
        db.commit()
        return {"created": created, "updated": updated, "errors": errors}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error importing students: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
