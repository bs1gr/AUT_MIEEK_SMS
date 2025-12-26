r"""
Imports Router
Bulk-import courses and students from JSON files in templates directories.
- Courses dir: D:\SMS\student-management-system\templates\courses\
- Students dir: D:\SMS\student-management-system\templates\students\
"""

import csv
import io
import json
import logging
import os
import re
import unicodedata
from datetime import datetime
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from sqlalchemy.orm import Session

from backend.errors import ErrorCode, http_error
from backend.rate_limiting import RATE_LIMIT_HEAVY, RATE_LIMIT_TEACHER_IMPORT, limiter
from backend.services.import_service import ImportService
from backend.services.audit_service import AuditLogger
from backend.schemas.audit import AuditAction, AuditResource

from .routers_auth import optional_require_role
from backend.security.permissions import optional_require_permission
from backend.security.api_keys import verify_api_key_optional

logger = logging.getLogger(__name__)

# File upload security constraints
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_MIME_TYPES = {
    "application/json",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",  # .xlsx
    "application/vnd.ms-excel",  # .xls
    "text/plain",  # Sometimes browsers send JSON as text/plain
    "text/csv",  # CSV files
    # Some browsers or environments upload unknown types as generic binary
    # Allow it and rely on extension/content validation below
    "application/octet-stream",
}
ALLOWED_EXTENSIONS = {".json", ".xlsx", ".xls", ".csv"}

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
from backend.schemas import (
    ImportPreviewItem,
    ImportPreviewResponse,
)


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
    # Normalize content type (strip charset parameters) and allow common variations
    content_type = (file.content_type or "application/octet-stream").split(";", 1)[0].strip().lower()
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

    logger.info("File validation passed", extra={"filename": file.filename, "size_bytes": content_size})
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


def _parse_csv_students(content: bytes, filename: str) -> tuple[list[dict], list[str]]:
    """
    Parse CSV content into student objects.

    Supports Greek column names from the AUT registration CSV format.
    Maps CSV columns to Student model fields:
    - Επώνυμο: -> last_name
    - Όνομα: -> first_name
    - Όνομα Πατέρα: -> father_name
    - Ηλ. Ταχυδρομείο: -> email
    - Αρ. Κινητού Τηλεφώνου: -> mobile_phone
    - Αρ. Σταθερού Τηλεφώνου: -> phone
    - Έτος Σπουδών: -> study_year (Α'=1, Β'=2, etc.)
    - Τυχόν σοβαρό πρόβλημα υγείας... -> health_issue
    - Αριθμός Δελτίου Ταυτότητας: -> student_id (with S prefix)

    Args:
        content: Raw CSV file bytes
        filename: Original filename for error messages

    Returns:
        Tuple of (list of student dicts, list of error messages)
    """
    students = []
    errors = []

    try:
        # Try UTF-8 with BOM first, then UTF-8, then latin-1
        for encoding in ["utf-8-sig", "utf-8", "latin-1"]:
            try:
                text = content.decode(encoding)
                break
            except UnicodeDecodeError:
                continue
        else:
            errors.append(f"{filename}: Could not decode CSV with any supported encoding")
            return students, errors

        # Parse CSV with semicolon delimiter (common in Greek/European CSVs)
        reader = csv.DictReader(io.StringIO(text), delimiter=";")

        # Map of CSV column names to Student model fields
        # Note: CSV column names have trailing colons
        column_map = {
            "Επώνυμο:": "last_name",
            "Όνομα:": "first_name",
            "Όνομα Πατέρα:": "father_name",
            "Ηλ. Ταχυδρομείο:": "email",
            "Αρ. Κινητού Τηλεφώνου:": "mobile_phone",
            "Αρ. Σταθερού Τηλεφώνου:": "phone",
            "Έτος Σπουδών:": "study_year",
            "Αριθμός Δελτίου Ταυτότητας:": "student_id",
        }

        # Health issue column has a long name, find it dynamically
        health_column = None
        for fieldname in reader.fieldnames or []:
            if "πρόβλημα υγείας" in fieldname or "ανεπάρκεια" in fieldname:
                health_column = fieldname
                break

        row_num = 1  # Start at 1 after header
        for row in reader:
            row_num += 1
            try:
                student = {}

                # Map columns
                for csv_col, model_field in column_map.items():
                    value = row.get(csv_col, "").strip()
                    if value:
                        student[model_field] = value

                # Add health issue if present
                if health_column and row.get(health_column, "").strip():
                    student["health_issue"] = row[health_column].strip()

                # Validate required fields
                if not student.get("first_name") or not student.get("last_name"):
                    errors.append(f"{filename} row {row_num}: Missing first_name or last_name")
                    continue

                if not student.get("email"):
                    errors.append(f"{filename} row {row_num}: Missing email")
                    continue

                # Generate student_id from ID number if not present
                if not student.get("student_id"):
                    id_num = row.get("Αριθμός Δελτίου Ταυτότητας:", "").strip()
                    if id_num:
                        student["student_id"] = f"S{id_num}"
                    else:
                        errors.append(f"{filename} row {row_num}: Missing student ID")
                        continue
                elif not student["student_id"].startswith("S"):
                    # Ensure student_id has S prefix
                    student["student_id"] = f"S{student['student_id']}"

                # Convert study year (Α'=1, Β'=2, Γ'=3, Δ'=4)
                year_str = student.get("study_year", "").strip().upper()
                year_map = {"Α'": 1, "Β'": 2, "Γ'": 3, "Δ'": 4, "A'": 1, "B'": 2}
                if year_str in year_map:
                    student["study_year"] = year_map[year_str]
                elif year_str:
                    # Try to parse as integer
                    try:
                        student["study_year"] = int(year_str)
                    except ValueError:
                        student["study_year"] = 1  # Default to first year
                else:
                    student["study_year"] = 1  # Default to first year

                # Set defaults
                student["is_active"] = True
                student["enrollment_date"] = datetime.now().date()

                students.append(student)

            except Exception as e:
                errors.append(f"{filename} row {row_num}: {e!s}")
                continue

    except Exception as e:
        errors.append(f"{filename}: CSV parsing failed - {e!s}")

    return students, errors


@router.get("/diagnose")
def diagnose_import_environment(request: Request):
    """Return diagnostics about import directories and files found."""
    try:
        return ImportService.diagnose_environment(COURSES_DIR, STUDENTS_DIR)
    except Exception as exc:
        logger.error("Diagnose failed: %s", exc)
        raise http_error(500, ErrorCode.IMPORT_DIAGNOSE_FAILED, "Diagnose failed", request)


@router.post("/courses")
@limiter.limit(RATE_LIMIT_TEACHER_IMPORT)
def import_courses(
    request: Request,
    db: Session = Depends(get_db),
    api_key: str | None = Depends(verify_api_key_optional),
    current_user=Depends(optional_require_role("admin", "teacher")),
):
    """Import all courses from JSON files in the courses templates directory.

    **Rate limit:** 83 requests per minute (teacher import operation, loosened to avoid throttling bulk uploads)

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
    audit = AuditLogger(db)
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
        logger.info("Importing courses from directory", extra={"directory": COURSES_DIR})

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
                                rules = er
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
                    # Use service to create/update
                    was_created, err = ImportService.create_or_update_course(
                        db, obj, translate_rules_fn=_translate_rules
                    )
                    if err:
                        errors.append(f"{name}: {err}")
                        continue
                    if was_created:
                        created += 1
                    else:
                        updated += 1
            except Exception as e:
                logger.error("Failed to import course", extra={"name": name, "error_type": type(e).__name__})
                errors.append(f"{name}: {e}")
        try:
            db.commit()
            # Log successful bulk import
            audit.log_from_request(
                request=request,
                action=AuditAction.BULK_IMPORT,
                resource=AuditResource.COURSE,
                details={"created": created, "updated": updated, "source": "directory", "path": COURSES_DIR},
                success=True,
            )
        except Exception as exc:
            db.rollback()
            logger.error("Commit failed during course import: %s", exc, exc_info=True)
            errors.append(f"commit: {exc}")
            # Log failed import
            audit.log_from_request(
                request=request,
                action=AuditAction.BULK_IMPORT,
                resource=AuditResource.COURSE,
                details={"source": "directory", "path": COURSES_DIR},
                success=False,
                error_message=str(exc),
            )
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
        # Log import failure
        audit.log_from_request(
            request=request,
            action=AuditAction.BULK_IMPORT,
            resource=AuditResource.COURSE,
            details={"source": "directory", "path": COURSES_DIR},
            success=False,
            error_message=str(exc),
        )
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
    api_key: str | None = Depends(verify_api_key_optional),
    current_user=Depends(optional_require_role("admin", "teacher")),
):
    """Import courses or students from uploaded JSON files.

    **Rate limit:** 5 requests per minute (heavy operation)

    - import_type: 'courses' or 'students'
    - files: one or more .json files
    """
    audit = AuditLogger(db)
    try:
        norm = (import_type or "").strip().lower()
        if norm in ("course", "courses"):
            norm = "courses"
        elif norm in ("student", "students"):
            norm = "students"
        else:
            # Log audit entry for failed import_type
            audit.log_from_request(
                request=request,
                action=AuditAction.BULK_IMPORT,
                resource=AuditResource.SYSTEM,
                details={"source": "upload", "import_type": import_type, "type": "invalid"},
                success=False,
                error_message="import_type must be 'courses' or 'students'",
            )
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

                # Check file extension to determine format
                filename = up.filename or ""
                if filename.lower().endswith(".csv"):
                    # Handle CSV files (only for students)
                    if norm != "students":
                        errors.append(f"{filename}: CSV import only supported for students")
                        continue
                    csv_students, csv_errors = _parse_csv_students(content, filename)
                    if csv_errors:
                        errors.extend(csv_errors)
                    if csv_students:
                        data_batches.append(csv_students)
                else:
                    # Handle JSON files
                    data = json.loads(content.decode("utf-8"))
                    data_batches.append(data if isinstance(data, list) else [data])
            except HTTPException as http_exc:
                # Re-raise validation errors with proper status codes
                # Log the failed import attempt with request context
                audit.log_from_request(
                    request=request,
                    action=AuditAction.BULK_IMPORT,
                    resource=AuditResource.COURSE if norm == "courses" else AuditResource.STUDENT,
                    details={"source": "upload", "file": getattr(up, "filename", None), "type": norm},
                    success=False,
                    error_message=str(http_exc),
                )
                raise
            except Exception as exc:
                errors.append(f"{up.filename}: {exc}")
                # Log the failed import attempt with request context
                audit.log_from_request(
                    request=request,
                    action=AuditAction.BULK_IMPORT,
                    resource=AuditResource.COURSE if norm == "courses" else AuditResource.STUDENT,
                    details={"source": "upload", "file": getattr(up, "filename", None), "type": norm},
                    success=False,
                    error_message=str(exc),
                )

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
                logger.info("Raw JSON text validated and parsed", extra={"size_bytes": text_size})
            except json.JSONDecodeError as exc:
                # Log the failed import attempt with request context
                audit.log_from_request(
                    request=request,
                    action=AuditAction.BULK_IMPORT,
                    resource=AuditResource.COURSE if norm == "courses" else AuditResource.STUDENT,
                    details={"source": "upload", "file": "json_text", "type": norm},
                    success=False,
                    error_message=f"Invalid JSON format in 'json' field: {exc}",
                )
                raise http_error(
                    400,
                    ErrorCode.IMPORT_INVALID_JSON,
                    "Invalid JSON format in 'json' field",
                    request,
                    context={"error": str(exc)},
                )
            except HTTPException as http_exc:
                audit.log_from_request(
                    request=request,
                    action=AuditAction.BULK_IMPORT,
                    resource=AuditResource.COURSE if norm == "courses" else AuditResource.STUDENT,
                    details={"source": "upload", "file": "json_text", "type": norm},
                    success=False,
                    error_message=str(http_exc),
                )
                raise
            except Exception as exc:
                errors.append(f"json: {exc}")
                audit.log_from_request(
                    request=request,
                    action=AuditAction.BULK_IMPORT,
                    resource=AuditResource.COURSE if norm == "courses" else AuditResource.STUDENT,
                    details={"source": "upload", "file": "json_text", "type": norm},
                    success=False,
                    error_message=str(exc),
                )

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
                            rules = er
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

                # Use service to create/update
                was_created, err = ImportService.create_or_update_course(db, obj, translate_rules_fn=_translate_rules)
                if err:
                    errors.append(f"item: {err}")
                    continue
                if was_created:
                    created += 1
                else:
                    updated += 1
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
                # Use service to create/update
                was_created, err = ImportService.create_or_update_student(db, obj)
                if err:
                    errors.append(f"item: {err}")
                    continue
                if was_created:
                    created += 1
                else:
                    updated += 1

        try:
            db.commit()
            # Log successful upload import
            audit.log_from_request(
                request=request,
                action=AuditAction.BULK_IMPORT,
                resource=AuditResource.COURSE if norm == "courses" else AuditResource.STUDENT,
                details={
                    "created": created,
                    "updated": updated,
                    "source": "upload",
                    "file_count": len(uploads),
                    "type": norm,
                },
                success=True,
            )
        except Exception as exc:
            db.rollback()
            errors.append(f"commit: {exc}")
            # Log failed upload import
            audit.log_from_request(
                request=request,
                action=AuditAction.BULK_IMPORT,
                resource=AuditResource.COURSE if norm == "courses" else AuditResource.STUDENT,
                details={"source": "upload", "type": norm},
                success=False,
                error_message=str(exc),
            )
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
        # Log import failure
        audit.log_from_request(
            request=request,
            action=AuditAction.BULK_IMPORT,
            resource=AuditResource.SYSTEM,
            details={"source": "upload"},
            success=False,
            error_message=str(exc),
        )
        raise http_error(
            500,
            ErrorCode.IMPORT_PROCESSING_FAILED,
            "Upload import failed",
            request,
            context={"error": str(exc)},
        )


@router.post("/preview")
@limiter.limit(RATE_LIMIT_HEAVY)
async def import_preview(
    request: Request,
    import_type: str = Form(...),
    files: List[UploadFile] | None = File(None),
    json_text: str | None = Form(None),
    allow_updates: bool = Form(False),
    skip_duplicates: bool = Form(True),
    db: Session = Depends(get_db),
    api_key: str | None = Depends(verify_api_key_optional),
    current_user=Depends(optional_require_permission("imports.preview")),
) -> ImportPreviewResponse:
    """Preview/validate an import without committing changes.

    Accepts the same inputs as the upload import endpoint but returns
    a validation preview with per-row status and an overall summary.
    """
    audit = AuditLogger(db)
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

        # Resolve needed models for existence checks
        Course, Student = import_names("models", "Course", "Student")

        uploads: List[UploadFile] = []
        if files:
            uploads.extend(files)
        data_batches: List[List[dict]] = []

        if not uploads and not json_text:
            raise http_error(
                400,
                ErrorCode.IMPORT_INVALID_REQUEST,
                "No files uploaded and no 'json' form field provided",
                request,
            )

        # Parse uploaded files
        parse_errors: list[str] = []
        for up in uploads:
            try:
                content = await validate_uploaded_file(request, up)
                filename = up.filename or ""
                if filename.lower().endswith(".csv"):
                    if norm != "students":
                        parse_errors.append(f"{filename}: CSV import only supported for students")
                        continue
                    csv_students, csv_errs = _parse_csv_students(content, filename)
                    if csv_errs:
                        parse_errors.extend(csv_errs)
                    if csv_students:
                        data_batches.append(csv_students)
                else:
                    data = json.loads(content.decode("utf-8"))
                    data_batches.append(data if isinstance(data, list) else [data])
            except HTTPException:
                raise
            except Exception as exc:
                parse_errors.append(f"{up.filename}: {exc}")

        # Parse optional raw JSON text
        if json_text:
            try:
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
                parse_errors.append(f"json: {exc}")

        # Flatten items
        items: list[ImportPreviewItem] = []
        seen_keys: set[str] = set()
        row_no = 0
        create_count = 0
        update_count = 0
        skip_count = 0
        error_count = 0
        warning_count = 0

        def add_item(action: str, data: dict, issues: list[str]):
            nonlocal row_no, create_count, update_count, skip_count, error_count, warning_count
            row_no += 1
            status = (
                "valid"
                if not issues
                else (
                    "error"
                    if any("error:" in (i.lower()) or i.lower().startswith("item:") for i in issues)
                    else "warning"
                )
            )
            if status == "valid":
                if action == "create":
                    create_count += 1
                elif action == "update":
                    update_count += 1
                elif action == "skip":
                    skip_count += 1
            elif status == "error":
                error_count += 1
            else:
                warning_count += 1
            items.append(
                ImportPreviewItem(
                    row_number=row_no,
                    action=action,
                    data=data,
                    validation_status=status,
                    issues=issues,
                )
            )

        # Iterate over all batches
        for batch in data_batches:
            for obj in batch:
                if not isinstance(obj, dict):
                    add_item("skip", {"raw": obj}, ["item: not an object"])
                    continue

                if norm == "students":
                    sid = obj.get("student_id")
                    email = obj.get("email")
                    issues: list[str] = []
                    if not sid or not email:
                        issues.append("item: missing student_id or email")
                    elif not _valid_email(str(email)):
                        issues.append(f"item: invalid email '{email}'")

                    # Normalize preview fields
                    if "enrollment_date" in obj:
                        parsed = _parse_date(obj.get("enrollment_date"))
                        if parsed is None:
                            issues.append("warning: invalid enrollment_date, field will be dropped")
                        else:
                            obj["enrollment_date"] = parsed
                    if "is_active" in obj:
                        b = _to_bool(obj["is_active"])
                        if b is None:
                            issues.append("warning: invalid is_active value, field will be dropped")
                        else:
                            obj["is_active"] = b

                    # Determine key and duplicates within batch
                    key = f"student:{sid or ''}|{email or ''}"
                    if key in seen_keys and skip_duplicates:
                        add_item("skip", obj, issues + ["warning: duplicate in uploaded data, will be skipped"])
                        continue
                    seen_keys.add(key)

                    # Determine action based on existence in DB
                    exists = False
                    if sid:
                        exists = (
                            db.query(Student).filter(Student.student_id == sid, Student.deleted_at.is_(None)).first()
                            is not None
                        )
                    if not exists and email:
                        exists = (
                            db.query(Student).filter(Student.email == email, Student.deleted_at.is_(None)).first()
                            is not None
                        )
                    action = "update" if exists else "create"
                    if exists and not allow_updates:
                        action = "skip"
                        issues.append("warning: would update existing record; updates not allowed")

                    add_item(action, obj, issues)

                else:  # courses
                    code = obj.get("course_code") if isinstance(obj, dict) else None
                    issues: list[str] = []
                    if not code:
                        issues.append("item: missing course_code")
                    # Normalize semester default
                    if "semester" in obj and not obj["semester"]:
                        obj["semester"] = "Α' Εξάμηνο"

                    key = f"course:{code}|{obj.get('semester','')}"
                    if key in seen_keys and skip_duplicates:
                        add_item("skip", obj, issues + ["warning: duplicate in uploaded data, will be skipped"])
                        continue
                    seen_keys.add(key)

                    exists = False
                    if code:
                        q = db.query(Course).filter(Course.course_code == code, Course.deleted_at.is_(None))
                        # If semester present, include it in existence check
                        sem = obj.get("semester")
                        if sem:
                            q = q.filter(Course.semester == sem)
                        exists = q.first() is not None
                    action = "update" if exists else "create"
                    if exists and not allow_updates:
                        action = "skip"
                        issues.append("warning: would update existing record; updates not allowed")

                    add_item(action, obj, issues)

        total_rows = row_no
        can_proceed = error_count == 0
        # Estimate: ~10ms per item
        estimated = int(total_rows * 0.01)
        summary = {"create": create_count, "update": update_count, "skip": skip_count}

        # Audit log the preview action
        try:
            audit.log_from_request(
                request=request,
                action=AuditAction.BULK_IMPORT,
                resource=AuditResource.COURSE if norm == "courses" else AuditResource.STUDENT,
                details={
                    "preview": True,
                    "type": norm,
                    "total": total_rows,
                    "errors": error_count,
                    "warnings": warning_count,
                },
                success=True,
            )
        except Exception:
            # Do not fail preview due to audit logging issue
            pass

        return ImportPreviewResponse(
            total_rows=total_rows,
            valid_rows=create_count + update_count + skip_count - warning_count,  # informational
            rows_with_warnings=warning_count,
            rows_with_errors=error_count,
            items=items,
            can_proceed=can_proceed,
            estimated_duration_seconds=estimated,
            summary=summary,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Import preview failed: %s", exc, exc_info=True)
        # Attempt audit log
        try:
            audit.log_from_request(
                request=request,
                action=AuditAction.BULK_IMPORT,
                resource=AuditResource.OTHER,
                details={"preview": True, "type": import_type},
                success=False,
                error_message=str(exc),
            )
        except Exception:
            pass
        raise http_error(
            500,
            ErrorCode.IMPORT_PROCESSING_FAILED,
            "Import preview failed",
            request,
            context={"error": str(exc)},
        )


@router.post("/students")
@limiter.limit(RATE_LIMIT_TEACHER_IMPORT)
def import_students(
    request: Request,
    db: Session = Depends(get_db),
    api_key: str | None = Depends(verify_api_key_optional),
    current_user=Depends(optional_require_role("admin", "teacher")),
):
    """Import all students from JSON files in the students templates directory.

    **Rate limit:** 83 requests per minute (teacher import operation, loosened to avoid throttling bulk uploads)

    JSON schema example:
    {
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "student_id": "S001",
      "enrollment_date": "2025-09-01"
    }
    """
    audit = AuditLogger(db)
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

                    # Use service to create/update
                    was_created, err = ImportService.create_or_update_student(db, obj)
                    if err:
                        errors.append(f"{name}: {err}")
                        continue
                    if was_created:
                        created += 1
                    else:
                        updated += 1
            except Exception as e:
                logger.error("Failed to import student", extra={"name": name, "error_type": type(e).__name__})
                errors.append(f"{name}: {e}")
        try:
            db.commit()
            # Log successful bulk import
            audit.log_from_request(
                request=request,
                action=AuditAction.BULK_IMPORT,
                resource=AuditResource.STUDENT,
                details={"created": created, "updated": updated, "source": "directory", "path": STUDENTS_DIR},
                success=True,
            )
        except Exception as exc:
            db.rollback()
            logger.error("Commit failed during student import: %s", exc, exc_info=True)
            # Log failed import
            audit.log_from_request(
                request=request,
                action=AuditAction.BULK_IMPORT,
                resource=AuditResource.STUDENT,
                details={"source": "directory", "path": STUDENTS_DIR},
                success=False,
                error_message=str(exc),
            )
            raise http_error(
                500,
                ErrorCode.IMPORT_PROCESSING_FAILED,
                "Student import failed during commit",
                request,
                context={"error": str(exc)},
            )
        return {"created": created, "updated": updated, "errors": errors}
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        logger.error("Error importing students: %s", exc, exc_info=True)
        # Log import failure
        audit.log_from_request(
            request=request,
            action=AuditAction.BULK_IMPORT,
            resource=AuditResource.STUDENT,
            details={"source": "directory", "path": STUDENTS_DIR},
            success=False,
            error_message=str(exc),
        )
        raise http_error(
            500,
            ErrorCode.IMPORT_PROCESSING_FAILED,
            "Error importing students",
            request,
            context={"error": str(exc)},
        )


@router.post("/execute")
@limiter.limit(RATE_LIMIT_HEAVY)
async def import_execute(
    request: Request,
    import_type: str = Form(...),
    files: List[UploadFile] | None = File(None),
    json_text: str | None = Form(None),
    allow_updates: bool = Form(False),
    skip_duplicates: bool = Form(True),
    db: Session = Depends(get_db),
    api_key: str | None = Depends(verify_api_key_optional),
    current_user=Depends(optional_require_permission("imports.execute")),
):
    """Execute an import by creating a background job.

    This endpoint validates the import request and creates an async job
    to process the actual data import. Returns job ID for tracking progress.

    Args:
        import_type: 'courses' or 'students'
        files: uploaded CSV or JSON files
        json_text: optional raw JSON data
        allow_updates: whether to allow updates to existing records
        skip_duplicates: whether to skip duplicate records in input
        db: database session
        current_user: authenticated user

    Returns:
        { job_id: str, status: str }
    """
    from backend.services.job_manager import JobManager
    from backend.schemas.jobs import JobCreate, JobType

    audit = AuditLogger(db)
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

        uploads: List[UploadFile] = []
        if files:
            uploads.extend(files)

        if not uploads and not json_text:
            raise http_error(
                400,
                ErrorCode.IMPORT_INVALID_REQUEST,
                "No files uploaded and no 'json' form field provided",
                request,
            )

        # Validate files before creating job
        upload_contents: dict[str, bytes] = {}
        for up in uploads:
            try:
                content = await validate_uploaded_file(request, up)
                upload_contents[up.filename or "file"] = content
            except HTTPException:
                raise
            except Exception as exc:
                raise http_error(
                    400,
                    ErrorCode.IMPORT_PROCESSING_FAILED,
                    f"Failed to validate file: {str(exc)}",
                    request,
                    context={"filename": up.filename},
                )

        # Validate JSON text if provided
        if json_text:
            try:
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
                json.loads(json_text)  # Validate JSON syntax
            except json.JSONDecodeError as exc:
                raise http_error(
                    400,
                    ErrorCode.IMPORT_INVALID_JSON,
                    "Invalid JSON format",
                    request,
                    context={"error": str(exc)},
                )
            except HTTPException:
                raise

        # Determine job type
        job_type_map = {
            "students": JobType.STUDENT_IMPORT,
            "courses": JobType.COURSE_IMPORT,
        }
        job_type = job_type_map.get(norm, JobType.STUDENT_IMPORT)

        # Get user ID if available
        user_id = None
        if hasattr(current_user, "id"):
            user_id = current_user.id

        # Create background job with import parameters
        job_create = JobCreate(
            job_type=job_type,
            user_id=user_id,
            parameters={
                "import_type": norm,
                "allow_updates": allow_updates,
                "skip_duplicates": skip_duplicates,
                "file_count": len(uploads),
                "has_json_data": bool(json_text),
                # Note: file contents and json_text are NOT stored in job params
                # They should be handled via a separate storage mechanism or passed through
                # For now, we'll rely on the frontend resending them if needed for retry
            },
        )

        job_id = JobManager.create_job(job_create)

        # Audit log the job creation
        try:
            audit.log_from_request(
                request=request,
                action=AuditAction.BULK_IMPORT,
                resource=AuditResource.COURSE if norm == "courses" else AuditResource.STUDENT,
                details={
                    "job_id": job_id,
                    "job_type": job_type.value,
                    "import_type": norm,
                    "allow_updates": allow_updates,
                    "skip_duplicates": skip_duplicates,
                },
                success=True,
            )
        except Exception:
            # Do not fail job creation due to audit logging
            pass

        logger.info(
            f"Created import job {job_id} for {norm} "
            f"(files: {len(uploads)}, json: {bool(json_text)}, allow_updates: {allow_updates})"
        )

        return {"job_id": job_id, "status": "pending"}

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Import execute failed: %s", exc, exc_info=True)
        try:
            audit.log_from_request(
                request=request,
                action=AuditAction.BULK_IMPORT,
                resource=AuditResource.OTHER,
                details={"import_type": import_type},
                success=False,
                error_message=str(exc),
            )
        except Exception:
            pass
        raise http_error(
            500,
            ErrorCode.IMPORT_PROCESSING_FAILED,
            "Import job creation failed",
            request,
            context={"error": str(exc)},
        )
