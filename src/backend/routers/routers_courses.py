"""Course management API router."""

import copy
import logging
from types import SimpleNamespace
from typing import Any, Dict, Iterable, List, Optional, Tuple

from fastapi import APIRouter, Body, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from backend.db import get_session as get_db
from backend.db_utils import get_by_id_or_404, paginate, transaction
from backend.errors import ErrorCode, http_error, internal_server_error
from backend.import_resolver import import_names
from backend.rate_limiting import RATE_LIMIT_READ, RATE_LIMIT_WRITE, limiter
from backend.rbac import require_permission
from backend.schemas.audit import AuditAction, AuditResource
from backend.schemas.common import PaginatedResponse, PaginationParams
from backend.schemas.courses import CourseCreate, CourseResponse, CourseUpdate, ScheduleChangePreview
from backend.services import absence_limit_service, course_activation
from backend.services.audit_service import get_audit_logger

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/courses", tags=["Courses"], responses={404: {"description": "Not found"}})


def _check_change_week(request: Request, week: Optional[int]) -> None:
    """A week a schedule change applies from has to be a week of the semester (plan todo 71)."""
    weeks = absence_limit_service.semester_weeks()
    if week is not None and not 1 <= week <= weeks:
        raise http_error(
            422,
            ErrorCode.VALIDATION_FAILED,
            f"The week a schedule change applies from must be between 1 and {weeks}",
            request,
            context={"week": week, "semester_weeks": weeks},
        )


def _semester_periods_after(course: Any, *, new_weekly: float, from_week: Optional[int]) -> Optional[int]:
    """The course's own semester total once its periods per week become ``new_weekly`` (todo 71).

    From a given week on, the weeks before keep the count they were taught with. Without a week
    the change is a correction: no total is kept, and the whole semester is counted at the new
    number, as before todo 71.
    """
    if from_week is None:
        return None
    return absence_limit_service.total_after_change(course, new_weekly=new_weekly, from_week=from_week)


def _weekly_after(course: Any, values: Dict[str, Any]) -> float:
    """The periods per week the course would count with after these values are saved."""
    return absence_limit_service.weekly_periods(
        SimpleNamespace(
            periods_per_week=values.get("periods_per_week", course.periods_per_week),
            hours_per_week=values.get("hours_per_week", course.hours_per_week),
        )
    )


def _course_values(course: Any, fields: Iterable[str]) -> Dict[str, Any]:
    """The course's current values of these fields, copied, with its rules in their normal form."""
    values = {field: copy.deepcopy(getattr(course, field, None)) for field in fields}
    if "evaluation_rules" in values:
        values["evaluation_rules"] = _normalize_evaluation_rules(values["evaluation_rules"])
    return values


def _record_course_change(request: Request, db: Session, course: Any, before: Dict[str, Any]) -> None:
    """Write what a request changed in a course to the audit log (plan todo 70).

    A course's schedule sets every student's absence limits (periods per week times the
    semester's weeks), and every teacher may edit every course, so an overwritten schedule left
    no trace of the old one or of who changed it. Called after the change is committed, with the
    values the request was about to replace. The Edit Course dialog sends the whole course, so
    only the fields whose value changed go into the entry, and none is written when nothing
    changed. A failure to write the entry is logged and never fails the request.
    """
    after = _course_values(course, before)
    changed = [field for field in before if before[field] != after[field]]
    if not changed:
        return
    course_id = course.id
    try:
        get_audit_logger(db).log_from_request(
            request,
            action=AuditAction.UPDATE,
            resource=AuditResource.COURSE,
            resource_id=str(course_id),
            details={"operation": "update_course", "course": course.course_code, "fields": ", ".join(changed)},
            old_values={field: before[field] for field in changed},
            new_values={field: after[field] for field in changed},
        )
    except Exception as exc:
        # The change itself is committed. A failed flush of the entry leaves the session
        # unusable until a rollback (is_active is False then); anything else needs none.
        if not db.is_active:
            try:
                db.rollback()
            except Exception:
                pass
        logger.warning("Could not write the audit entry for the change of course %s: %s", course_id, exc)


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
    text = text.strip()
    # Use string operations to avoid ReDoS: [^:,\-] overlaps with [\s:,-] on whitespace.
    # Find last separator character (:, -, ,) to split category from weight.
    last_sep = -1
    for i, ch in enumerate(text):
        if ch in ":,-":
            last_sep = i
    if last_sep < 0:
        return None
    category = text[:last_sep].strip()
    weight_text = text[last_sep + 1:].strip().rstrip("%").strip().replace(",", ".")
    if not category or not weight_text:
        return None
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

    rule: Dict[str, Any] = {"category": category, "weight": float(weight)}
    # Participation observations carry the share of a day's participation they take (see AnalyticsService).
    deduction_percent = _coerce_weight(data.get("deduction_percent"))
    if deduction_percent is not None:
        rule["deduction_percent"] = min(100.0, max(0.0, deduction_percent))
    return rule


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
    values: Iterable[Any]
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


@router.post("/", response_model=CourseResponse, status_code=201)
@limiter.limit(RATE_LIMIT_WRITE)
@require_permission("courses:create")
def create_course(
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
        # is_active is derived from enrollments (services.course_activation):
        # a new course has no students yet, so it always starts inactive.
        payload["is_active"] = False
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
def get_all_courses(
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
def get_course(
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
def update_course(
    request: Request,
    course_id: int,
    course_data: CourseUpdate,
    db: Session = Depends(get_db),
):
    try:
        (Course,) = import_names("models", "Course")
        course = get_by_id_or_404(db, Course, course_id)
        update_data = course_data.model_dump(exclude_unset=True)
        from_week = update_data.pop("schedule_change_from_week", None)
        _check_change_week(request, from_week)
        # What the request may replace, for the audit entry; a schedule also sets periods_per_week,
        # and a change of the periods the semester's own total (todo 71).
        tracked = [field for field in update_data if field != "is_active"]
        if "teaching_schedule" in update_data and "periods_per_week" not in tracked:
            tracked.append("periods_per_week")
        if "semester_periods" not in tracked and any(
            field in update_data for field in ("teaching_schedule", "periods_per_week", "hours_per_week")
        ):
            tracked.append("semester_periods")
        before = _course_values(course, tracked)

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

        # is_active is derived from enrollments; change it via /end or /reactivate
        update_data.pop("is_active", None)

        if "teaching_schedule" in update_data:
            update_data["periods_per_week"] = _calculate_periods_per_week(update_data.get("teaching_schedule"))

        # Plan todo 71: a change of the periods per week sets the semester's own total (the weeks
        # before `from_week` keep their count), or clears it for a correction. A total sent with
        # the request (Edit Course) is the total.
        if "semester_periods" not in update_data:
            new_weekly = _weekly_after(course, update_data)
            if new_weekly != absence_limit_service.weekly_periods(course):
                update_data["semester_periods"] = _semester_periods_after(
                    course, new_weekly=new_weekly, from_week=from_week
                )

        with transaction(db):
            for key, value in update_data.items():
                setattr(course, key, value)
            db.flush()
            db.refresh(course)

        _record_course_change(request, db, course, before)
        course.evaluation_rules = _normalize_evaluation_rules(course.evaluation_rules)
        return course

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error updating course %s: %s", course_id, exc)
        raise internal_server_error(request=request)


@router.post("/{course_id}/schedule-change-preview")
@limiter.limit(RATE_LIMIT_READ)
@require_permission("courses:edit")
def preview_schedule_change(
    request: Request,
    course_id: int,
    proposed: ScheduleChangePreview,
    db: Session = Depends(get_db),
):
    """What saving this schedule would do to the course's absence limits (plan todo 69).

    Read-only. A change in periods per week recalculates every student's limits for the whole
    semester; the Teaching Schedule tab asks for this before it saves, and lists the students
    whose status would change.
    """
    try:
        (Course,) = import_names("models", "Course")
        course = get_by_id_or_404(db, Course, course_id)
        values = proposed.model_dump(exclude_unset=True)
        from_week = values.get("change_from_week")
        _check_change_week(request, from_week)
        periods = course.periods_per_week
        if "teaching_schedule" in values:
            periods = _calculate_periods_per_week(values.get("teaching_schedule"))
        elif values.get("periods_per_week") is not None:
            periods = values["periods_per_week"]

        def _value(field: str) -> Any:
            return values[field] if values.get(field) is not None else getattr(course, field)

        after = SimpleNamespace(
            id=course.id,
            periods_per_week=periods,
            hours_per_week=_value("hours_per_week"),
            absence_limit_percent=_value("absence_limit_percent"),
            participation_limit_percent=_value("participation_limit_percent"),
            semester_periods=course.semester_periods,
        )
        # As a save would count it (todo 71): from the week asked, or a correction.
        new_weekly = absence_limit_service.weekly_periods(after)
        if new_weekly != absence_limit_service.weekly_periods(course):
            after.semester_periods = _semester_periods_after(course, new_weekly=new_weekly, from_week=from_week)
        return absence_limit_service.schedule_change_preview(db, course, after)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error previewing a schedule change of course %s: %s", course_id, exc)
        raise internal_server_error(request=request)


@router.post("/{course_id}/end", response_model=CourseResponse)
@limiter.limit(RATE_LIMIT_WRITE)
@require_permission("courses:edit")
def end_course(
    request: Request,
    course_id: int,
    db: Session = Depends(get_db),
):
    """Mark a course as ended: its active enrollments become completed, so it deactivates.

    Grades, attendance and enrollments are kept; POST /reactivate undoes it.
    """
    try:
        (Course,) = import_names("models", "Course")
        course = get_by_id_or_404(db, Course, course_id)
        with transaction(db):
            completed = course_activation.end_course(db, course_id)
            db.refresh(course)
        logger.info("Ended course %s: %s enrollments completed", course_id, completed)
        course.evaluation_rules = _normalize_evaluation_rules(course.evaluation_rules)
        return course
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error ending course %s: %s", course_id, exc)
        raise internal_server_error(request=request)


@router.post("/{course_id}/reactivate", response_model=CourseResponse)
@limiter.limit(RATE_LIMIT_WRITE)
@require_permission("courses:edit")
def reactivate_course(
    request: Request,
    course_id: int,
    db: Session = Depends(get_db),
):
    """Undo /end: completed enrollments become active again, reactivating the course.

    409 when the course has no completed enrollments to restore (it can only
    become active by enrolling students).
    """
    try:
        (Course,) = import_names("models", "Course")
        course = get_by_id_or_404(db, Course, course_id)
        with transaction(db):
            restored = course_activation.reactivate_course(db, course_id)
            db.refresh(course)
        if not course.is_active:
            raise http_error(
                409,
                ErrorCode.COURSE_NO_ENROLLMENTS,
                "Course has no students to reactivate; enroll students to activate it",
                request,
                context={"course_id": course_id},
            )
        logger.info("Reactivated course %s: %s enrollments restored", course_id, restored)
        course.evaluation_rules = _normalize_evaluation_rules(course.evaluation_rules)
        return course
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error reactivating course %s: %s", course_id, exc)
        raise internal_server_error(request=request)


@router.delete("/{course_id}", status_code=204)
@limiter.limit(RATE_LIMIT_WRITE)
@require_permission("courses:delete")
def delete_course(
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
def update_evaluation_rules(
    request: Request,
    course_id: int,
    rules_data: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
):
    try:
        (Course,) = import_names("models", "Course")
        course = get_by_id_or_404(db, Course, course_id)
        before = _course_values(course, ["evaluation_rules"])
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

        _record_course_change(request, db, course, before)
        return {
            "course_id": course_id,
            "evaluation_rules": _normalize_evaluation_rules(course.evaluation_rules),
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error updating evaluation rules for course %s: %s", course_id, exc)
        raise internal_server_error(request=request)
