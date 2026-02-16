"""Course management API router."""

import logging
import re
import unicodedata
from datetime import date
from typing import Any, Dict, Iterable, List, Optional, Tuple

from fastapi import APIRouter, Body, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from backend.db import get_session as get_db
from backend.db_utils import get_by_id_or_404, paginate, transaction
from backend.errors import ErrorCode, http_error, internal_server_error
from backend.import_resolver import import_names
from backend.rate_limiting import RATE_LIMIT_READ, RATE_LIMIT_WRITE, limiter
from backend.rbac import require_permission
from backend.schemas.common import PaginatedResponse, PaginationParams
from backend.schemas.courses import CourseCreate, CourseResponse, CourseUpdate

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/courses", tags=["Courses"], responses={404: {"description": "Not found"}})

_WEIGHT_PATTERN = re.compile(r"^(?P<category>.+?)[\s:,-]+(?P<weight>\d+(?:[\.,]\d+)?)%?$")
_YEAR_PATTERN = re.compile(r"(\d{4})")


def _coerce_weight(value: Any) -> Optional[float]:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        cleaned = value.strip().rstrip("% ")
        cleaned = cleaned.replace(",", ".")
        if not cleaned:
            return None
        try:
            return float(cleaned)
        except ValueError:
            return None
    return None


def _extract_weight_from_text(text: str) -> Optional[Tuple[str, float]]:
    match = _WEIGHT_PATTERN.match(text.strip())
    if not match:
        return None
    category = match.group("category").strip()
    weight_text = match.group("weight").replace(",", ".")
    try:
        weight = float(weight_text)
    except ValueError:
        return None
    return category, weight


def _normalise_dict_rule(data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    category = str(data.get("category", "")).strip()
    weight = _coerce_weight(data.get("weight"))

    extracted = _extract_weight_from_text(category)
    if extracted:
        category, extracted_weight = extracted
        if weight is None or weight == 0.0:
            weight = extracted_weight

    if weight is None:
        weight = 0.0

    if not category:
        return None

    return {"category": category, "weight": float(weight)}


def _build_rule_pair(category: str, weight_value: Any) -> Optional[Dict[str, Any]]:
    category = category.strip()
    weight = _coerce_weight(weight_value)

    extracted = _extract_weight_from_text(category)
    if extracted and (weight is None or weight == 0.0):
        category, weight = extracted

    if weight is None:
        weight = 0.0

    if not category:
        return None

    return {"category": category, "weight": float(weight)}


def _normalize_evaluation_rules(er: Any) -> Optional[List[Dict[str, Any]]]:
    """Normalise course evaluation rules into a consistent structure."""

    try:
        if er is None:
            return None

        if isinstance(er, dict):
            rule = _normalise_dict_rule(er)
            return [rule] if rule else []

        if isinstance(er, (str, int, float)):
            rule = _build_rule_pair(str(er), 0.0)
            return [rule] if rule else []

        if isinstance(er, Iterable):
            normalised: List[Dict[str, Any]] = []
            buffer: List[Any] = []

            for item in er:
                if isinstance(item, dict):
                    rule = _normalise_dict_rule(item)
                    if rule:
                        normalised.append(rule)
                    continue

                if isinstance(item, (list, tuple)) and len(item) == 2:
                    rule = _build_rule_pair(str(item[0]), item[1])
                    if rule:
                        normalised.append(rule)
                    continue

                if isinstance(item, (str, int, float)):
                    buffer.append(item)
                    if len(buffer) == 2:
                        rule = _build_rule_pair(str(buffer[0]), buffer[1])
                        if rule:
                            normalised.append(rule)
                        buffer = []
                    continue

            for leftover in buffer:
                rule = _build_rule_pair(str(leftover), 0.0)
                if rule:
                    normalised.append(rule)

            if normalised:
                return normalised

            parsed_strings: List[Dict[str, Any]] = []
            for item in er:
                if isinstance(item, str):
                    extracted = _extract_weight_from_text(item)
                    if extracted:
                        category, weight = extracted
                        parsed_strings.append({"category": category, "weight": float(weight)})
            return parsed_strings
    except Exception:
        return []

    return []


def _calculate_periods_per_week(schedule: Any) -> int:
    if not schedule:
        return 0

    total = 0
    if isinstance(schedule, dict):
        values = schedule.values()
    elif isinstance(schedule, list):
        values = schedule
    else:
        return 0

    for item in values:
        if not isinstance(item, dict):
            continue
        raw = item.get("periods")
        if raw is None:
            raw = item.get("period_count")
        if raw is None:
            raw = item.get("count")
        try:
            total += int(raw) if raw is not None else 0
        except (TypeError, ValueError):
            continue
    return total


def _strip_diacritics(value: str) -> str:
    return "".join(ch for ch in unicodedata.normalize("NFKD", value) if not unicodedata.combining(ch))


def _infer_semester_kind(semester: str) -> Optional[str]:
    if not semester:
        return None
    normalized = _strip_diacritics(semester).casefold()
    if any(token in normalized for token in ["academic", "school", "ακαδημ", "σχολικ"]):
        return "academic"
    if any(token in normalized for token in ["winter", "fall", "autumn", "χειμεριν", "χειμερινο", "α'", "α΄", "a'"]):
        return "winter"
    if any(token in normalized for token in ["spring", "εαριν", "εαρινο", "β'", "β΄", "b'"]):
        return "spring"
    return None


def _extract_year(semester: str) -> Optional[int]:
    if not semester:
        return None
    match = _YEAR_PATTERN.search(semester)
    if not match:
        return None
    try:
        return int(match.group(1))
    except ValueError:
        return None


def _semester_date_range(semester: str, today: date) -> Optional[Tuple[date, date]]:
    kind = _infer_semester_kind(semester)
    if not kind:
        return None
    year = _extract_year(semester) or today.year
    if kind == "winter":
        return date(year, 9, 15), date(year + 1, 1, 30)
    if kind == "spring":
        return date(year, 2, 1), date(year, 6, 30)
    if kind == "academic":
        return date(year, 9, 1), date(year + 1, 6, 30)
    return None


def _auto_is_active(semester: str, today: Optional[date] = None) -> Optional[bool]:
    if not semester:
        return None
    today = today or date.today()
    date_range = _semester_date_range(semester, today)
    if not date_range:
        return None
    start_date, end_date = date_range
    return start_date <= today <= end_date


@router.post("/", response_model=CourseResponse, status_code=201)
@limiter.limit(RATE_LIMIT_WRITE)
@require_permission("courses:create")
async def create_course(
    request: Request,
    course: CourseCreate,
    db: Session = Depends(get_db),
):
    try:
        (Course,) = import_names("models", "Course")

        existing = db.query(Course).filter(Course.course_code == course.course_code).first()
        if existing:
            if existing.deleted_at is None:
                raise http_error(
                    400,
                    ErrorCode.COURSE_DUPLICATE_CODE,
                    "Course code already exists",
                    request,
                )
            raise http_error(
                409,
                ErrorCode.COURSE_ARCHIVED,
                "Course code is archived; contact support to restore",
                request,
                context={"course_code": course.course_code},
            )

        payload = course.model_dump()
        if payload.get("is_active") is None:
            auto_active = _auto_is_active(payload.get("semester") or "")
            if auto_active is not None:
                payload["is_active"] = auto_active
                logger.info(
                    f"Auto-activation applied: course_code={payload.get('course_code')}, "
                    f"semester={payload.get('semester')}, is_active={auto_active}"
                )
        payload["evaluation_rules"] = _normalize_evaluation_rules(payload.get("evaluation_rules"))
        if "teaching_schedule" in payload:
            payload["periods_per_week"] = _calculate_periods_per_week(payload.get("teaching_schedule"))

        with transaction(db):
            db_course = Course(**payload)
            db.add(db_course)
            db.flush()
            db.refresh(db_course)

        db_course.evaluation_rules = _normalize_evaluation_rules(db_course.evaluation_rules)
        return db_course

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error creating course: %s", exc)
        raise internal_server_error(request=request)


@router.get("/", response_model=PaginatedResponse[CourseResponse])
@limiter.limit(RATE_LIMIT_READ)
@require_permission("courses:view")
async def get_all_courses(
    request: Request,
    pagination: PaginationParams = Depends(),
    semester: Optional[str] = None,
    db: Session = Depends(get_db),
):
    try:
        (Course,) = import_names("models", "Course")

        query = db.query(Course).filter(Course.deleted_at.is_(None))
        if semester:
            query = query.filter(Course.semester == semester)

        result = paginate(query, skip=pagination.skip, limit=pagination.limit)

        # Normalize evaluation rules for all courses
        for course in result.items:
            course.evaluation_rules = _normalize_evaluation_rules(course.evaluation_rules)

        logger.info(
            f"Retrieved {len(result.items)} courses "
            f"(skip={pagination.skip}, limit={pagination.limit}, total={result.total})"
        )
        return result.dict()

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error loading courses: %s", exc)
        raise internal_server_error(request=request)


@router.get("/{course_id}", response_model=CourseResponse)
@limiter.limit(RATE_LIMIT_READ)
@require_permission("courses:view")
async def get_course(
    request: Request,
    course_id: int,
    db: Session = Depends(get_db),
):
    try:
        (Course,) = import_names("models", "Course")
        course = get_by_id_or_404(db, Course, course_id)
        course.evaluation_rules = _normalize_evaluation_rules(course.evaluation_rules)
        return course
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error retrieving course %s: %s", course_id, exc)
        raise internal_server_error(request=request)


@router.put("/{course_id}", response_model=CourseResponse)
@limiter.limit(RATE_LIMIT_WRITE)
@require_permission("courses:edit")
async def update_course(
    request: Request,
    course_id: int,
    course_data: CourseUpdate,
    db: Session = Depends(get_db),
):
    try:
        (Course,) = import_names("models", "Course")
        course = get_by_id_or_404(db, Course, course_id)
        update_data = course_data.model_dump(exclude_unset=True)

        if "evaluation_rules" in update_data:
            normalized = _normalize_evaluation_rules(update_data["evaluation_rules"])
            if normalized:
                total_weight = sum(rule.get("weight", 0.0) for rule in normalized if isinstance(rule, dict))
                if abs(total_weight - 100.0) > 0.01:
                    raise http_error(
                        400,
                        ErrorCode.VALIDATION_FAILED,
                        f"Evaluation rule weights must sum to 100%. Current sum: {total_weight}%",
                        request,
                    )
            course.evaluation_rules = normalized
            update_data.pop("evaluation_rules")

        if "semester" in update_data and update_data.get("is_active") is None:
            auto_active = _auto_is_active(update_data.get("semester") or "")
            if auto_active is not None:
                update_data["is_active"] = auto_active
                logger.info(
                    f"Auto-activation applied on update: course_id={course_id}, "
                    f"semester={update_data.get('semester')}, is_active={auto_active}"
                )

        if "teaching_schedule" in update_data:
            update_data["periods_per_week"] = _calculate_periods_per_week(update_data.get("teaching_schedule"))

        with transaction(db):
            for key, value in update_data.items():
                setattr(course, key, value)
            db.flush()
            db.refresh(course)

        course.evaluation_rules = _normalize_evaluation_rules(course.evaluation_rules)
        return course

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error updating course %s: %s", course_id, exc)
        raise internal_server_error(request=request)


@router.delete("/{course_id}", status_code=204)
@limiter.limit(RATE_LIMIT_WRITE)
@require_permission("courses:delete")
async def delete_course(
    request: Request,
    course_id: int,
    db: Session = Depends(get_db),
):
    try:
        (Course,) = import_names("models", "Course")
        course = get_by_id_or_404(db, Course, course_id)

        with transaction(db):
            course.mark_deleted()

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error deleting course %s: %s", course_id, exc)
        raise internal_server_error(request=request)


@router.get("/{course_id}/evaluation-rules")
@limiter.limit(RATE_LIMIT_READ)
@require_permission("courses:view")
def get_evaluation_rules(request: Request, course_id: int, db: Session = Depends(get_db)):
    try:
        (Course,) = import_names("models", "Course")
        course = get_by_id_or_404(db, Course, course_id)
        return {
            "course_id": course_id,
            "course_code": course.course_code,
            "evaluation_rules": _normalize_evaluation_rules(course.evaluation_rules),
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error loading evaluation rules for course %s: %s", course_id, exc)
        raise internal_server_error(request=request)


@router.put("/{course_id}/evaluation-rules")
@limiter.limit(RATE_LIMIT_WRITE)
@require_permission("courses:edit")
async def update_evaluation_rules(
    request: Request,
    course_id: int,
    rules_data: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
):
    try:
        (Course,) = import_names("models", "Course")
        course = get_by_id_or_404(db, Course, course_id)
        normalized = _normalize_evaluation_rules(rules_data.get("evaluation_rules"))

        if normalized:
            total_weight = sum(rule.get("weight", 0.0) for rule in normalized if isinstance(rule, dict))
            if abs(total_weight - 100.0) > 0.01:
                raise http_error(
                    400,
                    ErrorCode.VALIDATION_FAILED,
                    f"Evaluation rule weights must sum to 100%. Current sum: {total_weight}%",
                    request,
                )

        with transaction(db):
            course.evaluation_rules = normalized
            db.flush()
            db.refresh(course)

        return {
            "course_id": course_id,
            "evaluation_rules": _normalize_evaluation_rules(course.evaluation_rules),
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error updating evaluation rules for course %s: %s", course_id, exc)
        raise internal_server_error(request=request)
