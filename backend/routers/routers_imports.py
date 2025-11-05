r"""
Imports Router
Bulk-import courses and students from JSON files in templates directories.
- Courses dir: D:\SMS\student-management-system\templates\courses\
- Students dir: D:\SMS\student-management-system\templates\students\
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Request
from sqlalchemy.orm import Session
from typing import List
from pathlib import Path
import os
import json
import logging
from datetime import datetime
import re
import unicodedata

from backend.rate_limiting import limiter, RATE_LIMIT_HEAVY
from .routers_auth import optional_require_role

from backend.errors import ErrorCode, http_error
logger = logging.getLogger(__name__)

# File upload security constraints
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_MIME_TYPES = {
    "application/json",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",  # .xlsx
    "application/vnd.ms-excel",  # .xls
    "text/plain",  # Sometimes browsers send JSON as text/plain
}
ALLOWED_EXTENSIONS = {".json", ".xlsx", ".xls"}

# Default templates directories. In development these may be absolute paths on the
# host (e.g. Windows paths). When running inside Docker the project is located
# at the project root in the container image; prefer an environment override
# or fall back to a project-relative `templates/` directory so imports work in
# both local and containerized environments.
project_root = Path(__file__).resolve().parents[2]
COURSES_DIR = os.environ.get("IMPORT_COURSES_DIR") or str((project_root / "templates" / "courses").as_posix())
STUDENTS_DIR = os.environ.get("IMPORT_STUDENTS_DIR") or str((project_root / "templates" / "students").as_posix())

router = APIRouter(prefix="/imports", tags=["Imports"], responses={404: {"description": "Not found"}})

from backend.db import get_session as get_db
from backend.import_resolver import import_names


def _reactivate_if_soft_deleted(record, *, entity: str, identifier: str) -> bool:
    """Clear the soft-delete flag when importing archived records."""

    if record is not None and getattr(record, "deleted_at", None) is not None:
        record.deleted_at = None
        logger.info("Reactivated archived %s during import: %s", entity, identifier)
        return True
    return False


# --- File Upload Validation ---
async def validate_uploaded_file(request: Request, file: UploadFile) -> bytes:
    """
    Validate uploaded file for security constraints.

    Args:
        file: The uploaded file to validate

    Returns:
        File contents as bytes

    Raises:
        HTTPException: If file fails validation (size, type, extension)
    """
    # Check file extension
    if file.filename:
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise http_error(
                400,
                ErrorCode.IMPORT_INVALID_EXTENSION,
                f"Invalid file extension '{ext}'.",
                request,
                context={"extension": ext, "allowed_extensions": sorted(ALLOWED_EXTENSIONS)},
            )

    # Check MIME type
    content_type = file.content_type or "application/octet-stream"
    if content_type not in ALLOWED_MIME_TYPES:
        raise http_error(
            400,
            ErrorCode.IMPORT_INVALID_MIME,
            f"Invalid content type '{content_type}'.",
            request,
            context={"content_type": content_type, "allowed_types": sorted(ALLOWED_MIME_TYPES)},
        )

    # Read file content and check size
    content = await file.read()
    content_size = len(content)

    if content_size == 0:
        raise http_error(400, ErrorCode.IMPORT_EMPTY_FILE, "Uploaded file is empty", request)

    if content_size > MAX_FILE_SIZE:
        size_mb = content_size / (1024 * 1024)
        max_mb = MAX_FILE_SIZE / (1024 * 1024)
        raise http_error(
            413,
            ErrorCode.IMPORT_TOO_LARGE,
            "Uploaded file exceeds maximum size",
            request,
            context={"size_mb": round(size_mb, 2), "max_mb": round(max_mb, 2)},
        )

    # For JSON files, validate that content is valid JSON
    if file.filename and file.filename.lower().endswith(".json"):
        try:
            json.loads(content.decode("utf-8"))
        except json.JSONDecodeError as exc:
            raise http_error(
                400,
                ErrorCode.IMPORT_INVALID_JSON,
                "Invalid JSON format",
                request,
                context={"error": str(exc)},
            )
        except UnicodeDecodeError:
            raise http_error(
                400,
                ErrorCode.IMPORT_INVALID_ENCODING,
                "Invalid file encoding. JSON files must be UTF-8 encoded",
                request,
            )

    logger.info(f"File validation passed: {file.filename} ({content_size} bytes)")
    return content


# --- Helpers: normalize/translate evaluation rule categories ---
def _parse_date(value):
    """Best-effort date parser. Accepts ISO (YYYY-MM-DD), DD/MM/YYYY, DD-MM-YYYY, MM/DD/YYYY."""
    if not value:
        return None
    if not isinstance(value, str):
        return value
    s = value.strip()
    # Try ISO first
    try:
        return datetime.fromisoformat(s).date()
    except Exception:
        pass
    # Common day-first formats
    for fmt in ("%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y"):
        try:
            return datetime.strptime(s, fmt).date()
        except Exception:
            pass
    # Common month-first US-style
    for fmt in ("%m/%d/%Y", "%m-%d-%Y", "%m.%d.%Y"):
        try:
            return datetime.strptime(s, fmt).date()
        except Exception:
            pass
    return None


def _to_bool(v):
    """
    Convert various input types to boolean.

    Args:
        v: Value to convert (bool, int, float, or string)

    Returns:
        Boolean value or None if conversion fails
    """
    if isinstance(v, bool):
        return v
    if isinstance(v, (int, float)):
        return bool(v)
    if isinstance(v, str):
        return v.strip().lower() in {"true", "1", "yes", "y", "on"}
    return None


def _valid_email(s: str) -> bool:
    """
    Simple email validation check.

    Args:
        s: String to validate as email

    Returns:
        True if string matches basic email pattern, False otherwise
    """
    if not isinstance(s, str):
        return False
    s = s.strip()
    # Simple sanity check; detailed validation is handled elsewhere
    return bool(re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", s))


def _strip_accents(s: str) -> str:
    """
    Remove accent marks from Unicode characters.

    Args:
        s: String with potential accent marks

    Returns:
        String with accents removed (normalized to ASCII-compatible form)
    """
    try:
        return "".join(ch for ch in unicodedata.normalize("NFD", s) if unicodedata.category(ch) != "Mn")
    except Exception:
        return s


def _clean_cat(s: str) -> str:
    """
    Clean and normalize category strings.

    Removes trailing parentheses and spaces, normalizes separators.

    Args:
        s: Raw category string

    Returns:
        Cleaned category string
    """
    s = s.strip()
    s = re.sub(r"[\)\s]+$", "", s)  # drop trailing )/spaces
    s = re.sub(r"\s*[·•:\-–—]\s*", " ", s)  # collapse separators
    s = re.sub(r"\s+", " ", s)
    return s.strip()


def _map_category(raw: str) -> str:
    base = _clean_cat(str(raw))
    base_noacc = _strip_accents(base).lower()
    mapping = [
        (["συμμετοχ"], "Class Participation"),
        (["συνεχη", "διαρκ"], "Continuous Assessment"),
        (["εργαστηρι"], "Lab Work"),
        (["ασκησ"], "Exercises"),
        (["εργασι"], "Assignments"),
        (["εργασιων στο σπιτι", "στο σπιτι"], "Homework"),
        (["ενδιαμεση", "προοδος"], "Midterm Exam"),
        (["τελικ", "τελικη εξεταση"], "Final Exam"),
        (["εξεταση"], "Exam"),
        (["παρουσιασ"], "Presentation"),
        (["project", "εργο"], "Project"),
        (["quiz", "τεστ"], "Quiz"),
        (["report", "εκθεση"], "Report"),
    ]
    for keys, label in mapping:
        for k in keys:
            if k in base_noacc:
                return label
    english_known = {
        "class participation": "Class Participation",
        "continuous assessment": "Continuous Assessment",
        "lab assessment": "Lab Work",
        "lab work": "Lab Work",
        "assignments": "Assignments",
        "homework": "Homework",
        "midterm exam": "Midterm Exam",
        "final exam": "Final Exam",
        "exam": "Exam",
        "presentation": "Presentation",
        "project": "Project",
        "quiz": "Quiz",
        "report": "Report",
    }
    low = base.lower()
    if low in english_known:
        return english_known[low]
    return base


def _translate_rules(rules: list[dict]) -> list[dict]:
    out: list[dict] = []
    seen: dict[str, float] = {}
    for r in rules or []:
        if not isinstance(r, dict):
            continue
        cat = _map_category(r.get("category", ""))
        try:
            w = float(str(r.get("weight", 0)).replace("%", "").replace(",", "."))
        except Exception:
            w = 0.0
        seen[cat] = w  # last one wins
    for k, v in seen.items():
        out.append({"category": k, "weight": v})
    return out


@router.get("/diagnose")
def diagnose_import_environment(request: Request):
    """Return diagnostics about import directories and files found."""
    try:
        courses_exists = os.path.isdir(COURSES_DIR)
        students_exists = os.path.isdir(STUDENTS_DIR)
        courses_files = []
        students_files = []
        if courses_exists:
            courses_files = [f for f in os.listdir(COURSES_DIR) if f.lower().endswith(".json")]
        if students_exists:
            students_files = [f for f in os.listdir(STUDENTS_DIR) if f.lower().endswith(".json")]
        return {
            "courses_dir": COURSES_DIR,
            "students_dir": STUDENTS_DIR,
            "courses_dir_exists": courses_exists,
            "students_dir_exists": students_exists,
            "course_json_files": courses_files,
            "student_json_files": students_files,
        }
    except Exception as exc:
        logger.error("Diagnose failed: %s", exc)
        raise http_error(500, ErrorCode.IMPORT_DIAGNOSE_FAILED, "Diagnose failed", request)


@router.post("/courses")
@limiter.limit(RATE_LIMIT_HEAVY)
def import_courses(
    request: Request, db: Session = Depends(get_db), current_user=Depends(optional_require_role("admin", "teacher"))
):
    """Import all courses from JSON files in the courses templates directory.

    **Rate limit:** 5 requests per minute (heavy operation)

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
        (Course,) = import_names("models", "Course")

        if not os.path.isdir(COURSES_DIR):
            raise http_error(
                404,
                ErrorCode.IMPORT_DIRECTORY_NOT_FOUND,
                "Courses directory not found",
                request,
                context={"path": COURSES_DIR},
            )
        created = 0
        updated = 0
        errors: List[str] = []
        logger.info(f"Importing courses from: {COURSES_DIR}")

        # --- Helper: normalize/translate evaluation rule categories ---
        def _strip_accents(s: str) -> str:
            try:
                return "".join(ch for ch in unicodedata.normalize("NFD", s) if unicodedata.category(ch) != "Mn")
            except Exception:
                return s

        def _clean_cat(s: str) -> str:
            s = s.strip()
            s = re.sub(r"[\)\s]+$", "", s)  # drop trailing )/spaces
            s = re.sub(r"\s*[·•:\-–—]\s*", " ", s)  # collapse separators
            s = re.sub(r"\s+", " ", s)
            return s.strip()

        def _map_category(raw: str) -> str:
            base = _clean_cat(str(raw))
            base_noacc = _strip_accents(base).lower()
            mapping = [
                (["συμμετοχ"], "Class Participation"),
                (["συνεχη", "διαρκ"], "Continuous Assessment"),
                (["εργαστηρι"], "Lab Work"),
                (["ασκησ"], "Exercises"),
                (["εργασι"], "Assignments"),
                (["εργασιων στο σπιτι", "στο σπιτι"], "Homework"),
                (["ενδιαμεση", "προοδος"], "Midterm Exam"),
                (["τελικ", "τελικη εξεταση"], "Final Exam"),
                (["εξεταση"], "Exam"),
                (["παρουσιασ"], "Presentation"),
                (["project", "εργο"], "Project"),
                (["quiz", "τεστ"], "Quiz"),
                (["report", "εκθεση"], "Report"),
            ]
            for keys, label in mapping:
                for k in keys:
                    if k in base_noacc:
                        return label
            english_known = {
                "class participation": "Class Participation",
                "continuous assessment": "Continuous Assessment",
                "lab assessment": "Lab Work",
                "lab work": "Lab Work",
                "assignments": "Assignments",
                "homework": "Homework",
                "midterm exam": "Midterm Exam",
                "final exam": "Final Exam",
                "exam": "Exam",
                "presentation": "Presentation",
                "project": "Project",
                "quiz": "Quiz",
                "report": "Report",
            }
            low = base.lower()
            if low in english_known:
                return english_known[low]
            return base

        def _translate_rules(rules: list[dict]) -> list[dict]:
            out: list[dict] = []
            seen: dict[str, float] = {}
            for r in rules or []:
                if not isinstance(r, dict):
                    continue
                cat = _map_category(r.get("category", ""))
                try:
                    w = float(str(r.get("weight", 0)).replace("%", "").replace(",", "."))
                except Exception:
                    w = 0.0
                seen[cat] = w  # last one wins
            for k, v in seen.items():
                out.append({"category": k, "weight": v})
            return out

        for name in os.listdir(COURSES_DIR):
            if not name.lower().endswith((".json")):
                continue
            path = os.path.join(COURSES_DIR, name)
            try:
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                items = data if isinstance(data, list) else [data]
                for obj in items:
                    code = obj.get("course_code")
                    if not code:
                        errors.append(f"Missing course_code in {name}")
                        continue
                    # Coerce common fields
                    if "credits" in obj:
                        try:
                            obj["credits"] = int(obj["credits"])
                        except Exception:
                            errors.append(f"{name}: invalid credits '{obj.get('credits')}', using default")
                            obj.pop("credits", None)
                    if "hours_per_week" in obj:
                        try:
                            obj["hours_per_week"] = float(obj["hours_per_week"])
                        except Exception:
                            errors.append(
                                f"{name}: invalid hours_per_week '{obj.get('hours_per_week')}', using default"
                            )
                            obj.pop("hours_per_week", None)
                    # Normalize simple string fields
                    if "course_code" in obj and isinstance(obj["course_code"], list):
                        obj["course_code"] = " ".join([str(x).strip() for x in obj["course_code"] if str(x).strip()])
                    if "course_name" in obj and isinstance(obj["course_name"], list):
                        obj["course_name"] = " ".join([str(x).strip() for x in obj["course_name"] if str(x).strip()])
                    if "semester" in obj and isinstance(obj["semester"], list):
                        obj["semester"] = " ".join([str(x).strip() for x in obj["semester"] if str(x).strip()])
                    # Set default semester if empty
                    if "semester" in obj and not obj["semester"]:
                        obj["semester"] = "Α' Εξάμηνο"  # Default to 1st semester
                    # Normalize description: must be a string
                    if "description" in obj and isinstance(obj["description"], list):
                        try:
                            obj["description"] = "\n".join(map(lambda x: str(x), obj["description"]))
                        except Exception:
                            obj["description"] = str(obj["description"])
                    if "evaluation_rules" in obj:
                        er = obj["evaluation_rules"]
                        rules = []  # Initialize rules variable at the start
                        if isinstance(er, str):
                            try:
                                obj["evaluation_rules"] = json.loads(er)
                            except Exception:
                                errors.append(f"{name}: evaluation_rules JSON parse failed, dropping field")
                                obj.pop("evaluation_rules", None)
                        elif isinstance(er, list):
                            if all(isinstance(x, dict) for x in er):
                                # Keep as-is, will translate below
                                pass
                            else:
                                # First, join consecutive strings that might be part of a multi-line entry
                                # A line ending with ':' followed by lines not containing ':' should be joined
                                joined_entries = []
                                current_entry = ""
                                for x in er:
                                    if not isinstance(x, str):
                                        continue
                                    x_stripped = x.strip()
                                    if not x_stripped:
                                        continue
                                    # Skip metadata entries like "Γλώσσα", "Ελληνική", "Αγγλική", etc.
                                    if x_stripped in [
                                        "Γλώσσα",
                                        "Ελληνική",
                                        "Αγγλική",
                                        "Κωδικός",
                                        "Μαθήματος",
                                        "Τίτλος Μαθήματος",
                                        "Κωδικός Μαθήματος",
                                        "Τύπος Μαθήματος",
                                        "Υποχρεωτικό",
                                        "Επίπεδο",
                                        "Έτος/Εξάμηνο",
                                        "Φοίτησης",
                                        "Όνομα Διδάσκοντα",
                                        "Τίτλος Μαθήματος",
                                        "Επίπεδο 5 του Εθνικού Πλαισίου Προσόντων",
                                        "2o Έτος/Α΄ Εξάμηνο",
                                    ]:
                                        continue
                                    # If we have a current entry and this line has a percentage, it's a continuation
                                    if current_entry and re.search(r"\d+%?\s*$", x_stripped):
                                        current_entry += " " + x_stripped
                                        joined_entries.append(current_entry)
                                        current_entry = ""
                                    # If current entry exists and this doesn't look like a continuation, save current and start new
                                    elif current_entry and ":" in x_stripped:
                                        joined_entries.append(current_entry)
                                        current_entry = x_stripped
                                    # If no current entry and this has a colon but no percentage, it's the start of a multi-line
                                    elif (
                                        not current_entry
                                        and ":" in x_stripped
                                        and not re.search(r"\d+%?\s*$", x_stripped)
                                    ):
                                        current_entry = x_stripped
                                    # If it has both colon and percentage, it's a complete entry
                                    elif ":" in x_stripped and re.search(r"\d+%?\s*$", x_stripped):
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
                                                w_s = w_raw.replace("%", "").strip().replace(",", ".")
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
                                    pattern = re.compile(r"^(?P<cat>.+?)[\s:,-]+(?P<w>\d+(?:[\.,]\d+)?)%?$")
                                    for x in er:
                                        if isinstance(x, str):
                                            m = pattern.match(x.strip())
                                            if m:
                                                cat = m.group("cat").strip()
                                                w_s = m.group("w").replace(",", ".")
                                                try:
                                                    weight = float(w_s)
                                                except Exception:
                                                    weight = 0.0
                                                rules.append({"category": cat, "weight": weight})
                                # Only use parsed rules that have valid percentages, ignore metadata entries
                                obj["evaluation_rules"] = rules if rules else []
                            # Translate/localize categories if we have rules
                            if isinstance(obj.get("evaluation_rules"), list):
                                # Keep empty list silently; translate when non-empty
                                if obj["evaluation_rules"]:
                                    obj["evaluation_rules"] = _translate_rules(obj["evaluation_rules"])
                            elif isinstance(er, dict):
                                obj["evaluation_rules"] = _translate_rules([er])
                            else:
                                # Only report/drop if the original payload wasn't a list either
                                if not isinstance(er, list):
                                    errors.append(
                                        f"{name}: evaluation_rules unsupported type {type(er)}, dropping field"
                                    )
                                obj.pop("evaluation_rules", None)
                    # Normalize teaching_schedule (JSON column): accept dict or JSON string (or empty list)
                    if "teaching_schedule" in obj:
                        ts = obj["teaching_schedule"]
                        if isinstance(ts, str):
                            try:
                                obj["teaching_schedule"] = json.loads(ts)
                            except Exception:
                                errors.append(f"{name}: teaching_schedule JSON parse failed, dropping field")
                                obj.pop("teaching_schedule", None)
                        elif isinstance(ts, dict):
                            pass
                        elif isinstance(ts, list) and len(ts) == 0:
                            # allow empty schedule
                            obj["teaching_schedule"] = []
                        else:
                            errors.append(f"{name}: teaching_schedule unsupported type {type(ts)}, dropping field")
                            obj.pop("teaching_schedule", None)
                    db_course = db.query(Course).filter(Course.course_code == code).first()
                    if db_course:
                        _reactivate_if_soft_deleted(db_course, entity="course", identifier=str(code))
                        # Avoid wiping evaluation_rules with empty list during bulk imports
                        for field in [
                            "course_name",
                            "semester",
                            "credits",
                            "description",
                            "hours_per_week",
                            "teaching_schedule",
                        ]:
                            if field in obj:
                                setattr(db_course, field, obj[field])
                        if "evaluation_rules" in obj:
                            if (
                                isinstance(obj["evaluation_rules"], list)
                                and len(obj["evaluation_rules"]) == 0
                                and getattr(db_course, "evaluation_rules", None)
                            ):
                                # Skip clearing; keep existing rules
                                pass
                            else:
                                setattr(db_course, "evaluation_rules", obj["evaluation_rules"])
                        updated += 1
                    else:
                        db_course = Course(
                            **{
                                k: v
                                for k, v in obj.items()
                                if k
                                in [
                                    "course_code",
                                    "course_name",
                                    "semester",
                                    "credits",
                                    "description",
                                    "evaluation_rules",
                                    "hours_per_week",
                                    "teaching_schedule",
                                ]
                            }
                        )
                        db.add(db_course)
                        created += 1
            except Exception as e:
                logger.error(f"Failed to import course from {name}: {e}")
                errors.append(f"{name}: {e}")
        try:
            db.commit()
        except Exception as exc:
            db.rollback()
            logger.error("Commit failed during course import: %s", exc, exc_info=True)
            errors.append(f"commit: {exc}")
            raise http_error(
                400,
                ErrorCode.IMPORT_PROCESSING_FAILED,
                "Course import failed during commit",
                request,
                context={"errors": errors},
            )
        return {"created": created, "updated": updated, "errors": errors}
    except HTTPException:
        # bubbled up commit error with details
        raise
    except Exception as exc:
        db.rollback()
        logger.error("Error importing courses: %s", exc, exc_info=True)
        raise http_error(
            400,
            ErrorCode.IMPORT_PROCESSING_FAILED,
            "Error importing courses",
            request,
            context={"error": str(exc)},
        )


@router.post("/upload")
@limiter.limit(RATE_LIMIT_HEAVY)
async def import_from_upload(
    request: Request,
    import_type: str = Form(...),
    files: List[UploadFile] | None = File(None),
    file: str | None = Form(None),  # absorb stray text field named 'file'
    json_text: str | None = Form(None),  # optional raw JSON text when file picker is unavailable
    db: Session = Depends(get_db),
    current_user=Depends(optional_require_role("admin", "teacher")),
):
    """Import courses or students from uploaded JSON files.

    **Rate limit:** 5 requests per minute (heavy operation)

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
            raise http_error(
                400,
                ErrorCode.IMPORT_INVALID_REQUEST,
                "import_type must be 'courses' or 'students'",
                request,
                context={"import_type": import_type},
            )
        Course, Student = import_names("models", "Course", "Student")

        uploads: List[UploadFile] = []
        if files:
            uploads.extend(files)
        data_batches: List[List[dict]] = []
        # Prefer files when provided; otherwise allow 'json' text payload for convenience
        if not uploads and not json_text:
            raise http_error(
                400,
                ErrorCode.IMPORT_INVALID_REQUEST,
                "No files uploaded and no 'json' form field provided",
                request,
            )
        created = 0
        updated = 0
        errors: list[str] = []
        # Process file uploads first with validation
        for up in uploads:
            try:
                content = await validate_uploaded_file(request, up)
                data = json.loads(content.decode("utf-8"))
                data_batches.append(data if isinstance(data, list) else [data])
            except HTTPException:
                # Re-raise validation errors with proper status codes
                raise
            except Exception as exc:
                errors.append(f"{up.filename}: {exc}")

        # Process optional raw JSON text from form field
        if json_text:
            try:
                # Validate size of raw JSON text
                text_size = len(json_text.encode("utf-8"))
                if text_size > MAX_FILE_SIZE:
                    size_mb = text_size / (1024 * 1024)
                    max_mb = MAX_FILE_SIZE / (1024 * 1024)
                    raise http_error(
                        413,
                        ErrorCode.IMPORT_TOO_LARGE,
                        "JSON payload too large",
                        request,
                        context={"size_mb": round(size_mb, 2), "max_mb": round(max_mb, 2)},
                    )

                parsed = json.loads(json_text)
                data_batches.append(parsed if isinstance(parsed, list) else [parsed])
                logger.info(f"Raw JSON text validated and parsed ({text_size} bytes)")
            except json.JSONDecodeError as exc:
                raise http_error(
                    400,
                    ErrorCode.IMPORT_INVALID_JSON,
                    "Invalid JSON format in 'json' field",
                    request,
                    context={"error": str(exc)},
                )
            except HTTPException:
                raise
            except Exception as exc:
                errors.append(f"json: {exc}")

        # Flatten batches into items for processing
        def iter_items():
            for batch in data_batches:
                for item in batch:
                    yield item

        # Start main import logic
        for obj in iter_items():
            if norm == "courses":
                code = obj.get("course_code") if isinstance(obj, dict) else None
                if not code:
                    errors.append("item: missing course_code")
                    continue
                # Normalize fields similar to directory import
                if "credits" in obj:
                    try:
                        obj["credits"] = int(obj["credits"])
                    except Exception:
                        errors.append(f"item: invalid credits '{obj.get('credits')}', using default")
                        obj.pop("credits", None)
                if "hours_per_week" in obj:
                    try:
                        obj["hours_per_week"] = float(obj["hours_per_week"])
                    except Exception:
                        errors.append(f"item: invalid hours_per_week '{obj.get('hours_per_week')}', using default")
                        obj.pop("hours_per_week", None)
                # Normalize simple string fields
                if "course_code" in obj and isinstance(obj["course_code"], list):
                    obj["course_code"] = " ".join([str(x).strip() for x in obj["course_code"] if str(x).strip()])
                if "course_name" in obj and isinstance(obj["course_name"], list):
                    obj["course_name"] = " ".join([str(x).strip() for x in obj["course_name"] if str(x).strip()])
                if "semester" in obj and isinstance(obj["semester"], list):
                    obj["semester"] = " ".join([str(x).strip() for x in obj["semester"] if str(x).strip()])
                # Set default semester if empty
                if "semester" in obj and not obj["semester"]:
                    obj["semester"] = "Α' Εξάμηνο"  # Default to 1st semester
                if "description" in obj and isinstance(obj["description"], list):
                    try:
                        obj["description"] = "\n".join(map(lambda x: str(x), obj["description"]))
                    except Exception:
                        obj["description"] = str(obj["description"])
                if "evaluation_rules" in obj:
                    er = obj["evaluation_rules"]
                    rules = []  # Initialize rules variable at the start
                    if isinstance(er, str):
                        try:
                            obj["evaluation_rules"] = json.loads(er)
                        except Exception:
                            errors.append("item: evaluation_rules JSON parse failed, dropping field")
                            obj.pop("evaluation_rules", None)
                    elif isinstance(er, list):
                        if all(isinstance(x, dict) for x in er):
                            # Keep as-is, translate later
                            pass
                        else:
                            # First, join consecutive strings that might be part of a multi-line entry
                            # A line ending with ':' followed by lines not containing ':' should be joined
                            joined_entries = []
                            current_entry = ""
                            for x in er:
                                if not isinstance(x, str):
                                    continue
                                x_stripped = x.strip()
                                if not x_stripped:
                                    continue
                                # Skip metadata entries like "Γλώσσα", "Ελληνική", "Αγγλική", etc.
                                if x_stripped in [
                                    "Γλώσσα",
                                    "Ελληνική",
                                    "Αγγλική",
                                    "Κωδικός",
                                    "Μαθήματος",
                                    "Τίτλος Μαθήματος",
                                    "Κωδικός Μαθήματος",
                                    "Τύπος Μαθήματος",
                                    "Υποχρεωτικό",
                                    "Επίπεδο",
                                    "Έτος/Εξάμηνο",
                                    "Φοίτησης",
                                    "Όνομα Διδάσκοντα",
                                    "Τίτλος Μαθήματος",
                                    "Επίπεδο 5 του Εθνικού Πλαισίου Προσόντων",
                                    "2o Έτος/Α΄ Εξάμηνο",
                                ]:
                                    continue
                                # If we have a current entry and this line has a percentage, it's a continuation
                                if current_entry and re.search(r"\d+%?\s*$", x_stripped):
                                    current_entry += " " + x_stripped
                                    joined_entries.append(current_entry)
                                    current_entry = ""
                                # If current entry exists and this doesn't look like a continuation, save current and start new
                                elif current_entry and ":" in x_stripped:
                                    joined_entries.append(current_entry)
                                    current_entry = x_stripped
                                # If no current entry and this has a colon but no percentage, it's the start of a multi-line
                                elif (
                                    not current_entry and ":" in x_stripped and not re.search(r"\d+%?\s*$", x_stripped)
                                ):
                                    current_entry = x_stripped
                                # If it has both colon and percentage, it's a complete entry
                                elif ":" in x_stripped and re.search(r"\d+%?\s*$", x_stripped):
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
                                            w_s = w_raw.replace("%", "").strip().replace(",", ".")
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
                                pattern = re.compile(r"^(?P<cat>.+?)[\s:,-]+(?P<w>\d+(?:[\.,]\d+)?)%?$")
                                for x in er:
                                    if isinstance(x, str):
                                        m = pattern.match(x.strip())
                                        if m:
                                            cat = m.group("cat").strip()
                                            w_s = m.group("w").replace(",", ".")
                                            try:
                                                weight = float(w_s)
                                            except Exception:
                                                weight = 0.0
                                            rules.append({"category": cat, "weight": weight})
                            # Only use parsed rules that have valid percentages, ignore metadata entries
                        obj["evaluation_rules"] = rules if rules else []
                    # Translate/localize categories if we have rules
                    if isinstance(obj.get("evaluation_rules"), list):
                        if obj["evaluation_rules"]:
                            try:
                                obj["evaluation_rules"] = _translate_rules(obj["evaluation_rules"])
                            except Exception:
                                pass
                        # else: keep empty list silently
                    elif isinstance(er, dict):
                        try:
                            obj["evaluation_rules"] = _translate_rules([er])
                        except Exception:
                            obj["evaluation_rules"] = [er]
                    else:
                        # Only report/drop if the original payload wasn't a list either
                        if not isinstance(er, list):
                            errors.append(f"item: evaluation_rules unsupported type {type(er)}, dropping field")
                        obj.pop("evaluation_rules", None)
                if "teaching_schedule" in obj:
                    ts = obj["teaching_schedule"]
                    if isinstance(ts, str):
                        try:
                            obj["teaching_schedule"] = json.loads(ts)
                        except Exception:
                            errors.append("item: teaching_schedule JSON parse failed, dropping field")
                            obj.pop("teaching_schedule", None)
                    elif isinstance(ts, dict):
                        pass
                    elif isinstance(ts, list) and len(ts) == 0:
                        obj["teaching_schedule"] = []
                    else:
                        errors.append(f"item: teaching_schedule unsupported type {type(ts)}, dropping field")
                        obj.pop("teaching_schedule", None)

                db_course = db.query(Course).filter(Course.course_code == code).first()
                if db_course:
                    _reactivate_if_soft_deleted(db_course, entity="course", identifier=str(code))
                    for field in [
                        "course_name",
                        "semester",
                        "credits",
                        "description",
                        "hours_per_week",
                        "teaching_schedule",
                    ]:
                        if field in obj:
                            setattr(db_course, field, obj[field])
                    if "evaluation_rules" in obj:
                        if (
                            isinstance(obj["evaluation_rules"], list)
                            and len(obj["evaluation_rules"]) == 0
                            and getattr(db_course, "evaluation_rules", None)
                        ):
                            pass
                        else:
                            setattr(db_course, "evaluation_rules", obj["evaluation_rules"])
                    updated += 1
                else:
                    db_course = Course(
                        **{
                            k: v
                            for k, v in obj.items()
                            if k
                            in [
                                "course_code",
                                "course_name",
                                "semester",
                                "credits",
                                "description",
                                "evaluation_rules",
                                "hours_per_week",
                                "teaching_schedule",
                            ]
                        }
                    )
                    db.add(db_course)
                    created += 1
            else:  # students
                if not isinstance(obj, dict):
                    errors.append("item: not an object")
                    continue
                sid = obj.get("student_id")
                email = obj.get("email")
                if not sid or not email:
                    errors.append("item: missing student_id or email")
                    continue
                if not _valid_email(email):
                    errors.append(f"item: invalid email '{email}'")
                    continue
                # Normalize fields
                if "first_name" in obj and isinstance(obj["first_name"], str):
                    obj["first_name"] = obj["first_name"].strip()
                if "last_name" in obj and isinstance(obj["last_name"], str):
                    obj["last_name"] = obj["last_name"].strip()
                if "enrollment_date" in obj:
                    parsed = _parse_date(obj.get("enrollment_date"))
                    if parsed is None:
                        # Drop invalid date to avoid DB type errors
                        errors.append("item: invalid enrollment_date, dropping field")
                        obj.pop("enrollment_date", None)
                    else:
                        obj["enrollment_date"] = parsed
                if "is_active" in obj:
                    b = _to_bool(obj["is_active"])
                    if b is None:
                        obj.pop("is_active", None)
                    else:
                        obj["is_active"] = b
                # Whitelist allowed fields (include extended profile fields supported by model)
                allowed = [
                    "first_name",
                    "last_name",
                    "email",
                    "student_id",
                    "enrollment_date",
                    "is_active",
                    "father_name",
                    "mobile_phone",
                    "phone",
                    "health_issue",
                    "note",
                    "study_year",
                ]
                cleaned = {k: v for k, v in obj.items() if k in allowed}

                # Basic required checks for non-nullable columns
                if not cleaned.get("first_name") or not cleaned.get("last_name"):
                    errors.append("item: first_name and last_name are required")
                    continue

                db_student = db.query(Student).filter((Student.student_id == sid) | (Student.email == email)).first()
                if db_student:
                    _reactivate_if_soft_deleted(
                        db_student,
                        entity="student",
                        identifier=str(sid or email),
                    )
                    for field, val in cleaned.items():
                        setattr(db_student, field, val)
                    updated += 1
                else:
                    db_student = Student(**cleaned)
                    db.add(db_student)
                    created += 1

        try:
            db.commit()
        except Exception as exc:
            db.rollback()
            errors.append(f"commit: {exc}")
            raise http_error(
                400,
                ErrorCode.IMPORT_PROCESSING_FAILED,
                "Upload import failed during commit",
                request,
                context={"errors": errors},
            )
        return {"type": norm, "created": created, "updated": updated, "errors": errors}
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        logger.error("Upload import failed: %s", exc, exc_info=True)
        raise http_error(
            500,
            ErrorCode.IMPORT_PROCESSING_FAILED,
            "Upload import failed",
            request,
            context={"error": str(exc)},
        )


@router.post("/students")
@limiter.limit(RATE_LIMIT_HEAVY)
def import_students(
    request: Request, db: Session = Depends(get_db), current_user=Depends(optional_require_role("admin", "teacher"))
):
    """Import all students from JSON files in the students templates directory.

    **Rate limit:** 5 requests per minute (heavy operation)

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
        (Student,) = import_names("models", "Student")

        if not os.path.isdir(STUDENTS_DIR):
            raise http_error(
                404,
                ErrorCode.IMPORT_DIRECTORY_NOT_FOUND,
                "Students directory not found",
                request,
                context={"path": STUDENTS_DIR},
            )
        created = 0
        updated = 0
        errors: List[str] = []
        for name in os.listdir(STUDENTS_DIR):
            if not name.lower().endswith((".json")):
                continue
            path = os.path.join(STUDENTS_DIR, name)
            try:
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                items = data if isinstance(data, list) else [data]
                for obj in items:
                    if not isinstance(obj, dict):
                        errors.append(f"{name}: item not an object")
                        continue
                    sid = obj.get("student_id")
                    email = obj.get("email")
                    if not sid or not email:
                        errors.append(f"{name}: missing student_id or email")
                        continue
                    if not _valid_email(email):
                        errors.append(f"{name}: invalid email '{email}'")
                        continue
                    # Normalize fields
                    if "first_name" in obj and isinstance(obj["first_name"], str):
                        obj["first_name"] = obj["first_name"].strip()
                    if "last_name" in obj and isinstance(obj["last_name"], str):
                        obj["last_name"] = obj["last_name"].strip()
                    if "enrollment_date" in obj:
                        parsed = _parse_date(obj.get("enrollment_date"))
                        if parsed is None:
                            errors.append(f"{name}: invalid enrollment_date, dropping field")
                            obj.pop("enrollment_date", None)
                        else:
                            obj["enrollment_date"] = parsed
                    if "is_active" in obj:
                        b = _to_bool(obj["is_active"])
                        if b is None:
                            obj.pop("is_active", None)
                        else:
                            obj["is_active"] = b

                    allowed = [
                        "first_name",
                        "last_name",
                        "email",
                        "student_id",
                        "enrollment_date",
                        "is_active",
                        "father_name",
                        "mobile_phone",
                        "phone",
                        "health_issue",
                        "note",
                        "study_year",
                    ]
                    cleaned = {k: v for k, v in obj.items() if k in allowed}
                    if not cleaned.get("first_name") or not cleaned.get("last_name"):
                        errors.append(f"{name}: first_name and last_name are required")
                        continue

                    db_student = (
                        db.query(Student).filter((Student.student_id == sid) | (Student.email == email)).first()
                    )
                    if db_student:
                        _reactivate_if_soft_deleted(
                            db_student,
                            entity="student",
                            identifier=str(sid or email),
                        )
                        for field, val in cleaned.items():
                            setattr(db_student, field, val)
                        updated += 1
                    else:
                        db_student = Student(**cleaned)
                        db.add(db_student)
                        created += 1
            except Exception as e:
                logger.error(f"Failed to import student from {name}: {e}")
                errors.append(f"{name}: {e}")
        db.commit()
        return {"created": created, "updated": updated, "errors": errors}
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        logger.error("Error importing students: %s", exc, exc_info=True)
        raise http_error(
            500,
            ErrorCode.IMPORT_PROCESSING_FAILED,
            "Error importing students",
            request,
            context={"error": str(exc)},
        )
