"""Course management API router."""

import logging
import re
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


@router.post("/", response_model=CourseResponse, status_code=201)
@limiter.limit(RATE_LIMIT_WRITE)
@require_permission("courses:create")
async def create_course(
    request: Request,
    course: CourseCreate,
    db: Session = Depends(get_db),
    current_user=None,
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
        payload["evaluation_rules"] = _normalize_evaluation_rules(payload.get("evaluation_rules"))

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
    current_user=None,
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
    current_user=None,
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
    current_user=None,
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
    current_user=None,
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
    current_user=None,
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
