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

from .routers_auth import optional_require_role
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
                    was_created, err = ImportService.create_or_update_course(db, obj, translate_rules_fn=_translate_rules)
                    if err:
                        errors.append(f"{name}: {err}")
                        continue
                    if was_created:
                        created += 1
                    else:
                        updated += 1
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
    api_key: str | None = Depends(verify_api_key_optional),
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
