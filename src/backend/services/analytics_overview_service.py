"""Analytics overview: final grades, attendance and absence-limit status for a selection.

Built for the Analytics page. Every figure starts from one live enrollment (a student in a
course, not deleted, not dropped):

- **Final grade**: the course's evaluation rules (``AnalyticsService._calculate_final_grade_from_records``,
  the same calculation as the grading screens), scaled to the work completed so far. A course
  without usable rules falls back to the plain mean of its grade percentages. An enrollment
  with no grades and no daily performance has no final grade (``None``), not 0.
- **Attendance rate**: Present + Late over all recorded periods. Absent and Excused are
  absences, as in the ΜΙΕΕΚ absence limit (``absence_limit_service``).
- **Absence status**: ``absence_limit_service.evaluate`` for that enrollment.

Averages over students or courses are means of those per-enrollment values; a student or
course with nothing graded yet is left out of a mean instead of counting as 0.
"""

from __future__ import annotations

import math
from collections import Counter
from dataclasses import dataclass, field
from datetime import date, timedelta
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation
from statistics import mean
from typing import Any, Dict, Iterable, List, Optional, Sequence

from sqlalchemy import or_
from sqlalchemy.orm import Session

from backend.db.utils import get_by_id_or_404
from backend.import_resolver import import_names
from backend.services import absence_limit_service
from backend.services import grade_categories as cats
from backend.services.analytics_service import AnalyticsService, normalize_rule_category

PASS_MARK = 50.0
# (label, lower bound inclusive) from the top; everything under the last bound is "0-49".
GRADE_BANDS: Sequence[tuple[str, float]] = (
    ("90-100", 90.0),
    ("80-89", 80.0),
    ("70-79", 70.0),
    ("60-69", 60.0),
    ("50-59", 50.0),
    ("0-49", float("-inf")),
)
_STATUS_ORDER = {
    absence_limit_service.STATUS_INSUFFICIENT: 3,
    absence_limit_service.STATUS_WARNING: 2,
    absence_limit_service.STATUS_OK: 1,
    absence_limit_service.STATUS_UNKNOWN: 0,
}


def _round(value: Optional[float]) -> Optional[float]:
    return None if value is None else round(value, 2)


def _mean(values: Iterable[Optional[float]]) -> Optional[float]:
    present = [v for v in values if v is not None]
    return mean(present) if present else None


def _band(grade: float) -> str:
    for label, lower in GRADE_BANDS:
        if grade >= lower:
            return label
    return GRADE_BANDS[-1][0]


def _worst_status(statuses: Iterable[str]) -> Optional[str]:
    statuses = list(statuses)
    if not statuses:
        return None
    return max(statuses, key=lambda s: _STATUS_ORDER.get(s, 0))


_DAY_NAMES = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]


def _weekday_of(value: Any) -> Optional[int]:
    """Monday-based weekday for a schedule day: 'Monday', 'mon' or '0' (as the Attendance page)."""
    text = str(value if value is not None else "").strip().lower()
    if text.isdigit():
        index = int(text)
        return index if 0 <= index <= 6 else None
    for index, name in enumerate(_DAY_NAMES):
        if text in (name, name[:3]):
            return index
    return None


def scheduled_weekdays(schedule: Any) -> set[int]:
    """School weekdays (Mon=0 .. Fri=4) a teaching_schedule names; weekends never count."""
    if isinstance(schedule, dict):
        days = [key for key, value in schedule.items() if value]
    elif isinstance(schedule, list):
        days = [entry.get("day") for entry in schedule if isinstance(entry, dict)]
    else:
        return set()
    weekdays = {_weekday_of(day) for day in days}
    return {d for d in weekdays if d is not None and d < 5}


# Exam-type grade categories (EN and EL, with and without accents), for the exam average.
_EXAM_NEEDLES = ("midterm", "final", "exam", "ενδιάμεσ", "ενδιαμεσ", "τελικ", "εξέτασ", "εξετασ")


def _is_exam(category: Any) -> bool:
    text = str(category or "").lower()
    return any(needle in text for needle in _EXAM_NEEDLES)


def _grade_date(grade: Any) -> Optional[str]:
    day = grade.date_submitted or grade.date_assigned
    return day.isoformat() if day else None


@dataclass
class EnrollmentFacts:
    student_id: int
    course_id: int
    final_grade: Optional[float]
    grade_basis: Optional[str]  # "rules" | "average" | None
    grade_count: int
    rating_count: int = 0
    exam_average: Optional[float] = None
    present: int = 0
    late: int = 0
    absent: int = 0
    excused: int = 0
    absence: Dict[str, Any] = field(default_factory=dict)
    grades: List[Dict[str, Any]] = field(default_factory=list)
    # The final-grade calculation's own figures per rule category ("average", "weight",
    # "total_items", "forfeited", "deduction"), keyed by the rule's category as the course spells
    # it. Empty when the final grade did not come from the rules.
    category_breakdown: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    # Points the final grade lost after the categories were weighted: the participation
    # observations ticked in Attendance, and the course's penalty per unexcused absence.
    participation_deduction: float = 0.0
    absence_deduction: float = 0.0
    # Plan todo 75 stage 3: the student's average per category in this course, by the key that
    # compares categories across courses (grade_categories.group_key), and how the course spells
    # each one (spelling -> how often), for the name of a category that is not a standard one.
    # See _category_averages.
    category_averages: Dict[str, float] = field(default_factory=dict)
    category_names: Dict[str, Counter[str]] = field(default_factory=dict)
    # The keys whose figure measures presence alone (Class Participation in a course that rates
    # nobody: the whole share less the ticks), which can be a difficulty, never a strength.
    presence_keys: set[str] = field(default_factory=set)
    # The course has weighted evaluation rules (its categories are those rules).
    with_rules: bool = False

    @property
    def attended(self) -> int:
        return self.present + self.late

    @property
    def recorded(self) -> int:
        return self.present + self.late + self.absent + self.excused

    @property
    def attendance_rate(self) -> Optional[float]:
        return self.attended / self.recorded * 100 if self.recorded else None

    @property
    def participation_forfeited(self) -> bool:
        return bool(self.absence.get("participation_forfeited"))

    @property
    def passing(self) -> Optional[bool]:
        # Judged on the grade as it is shown (2 decimals): a plain mean of 33.33 % and 66.67 %
        # comes out a hair under 50 and is shown as 50, which must not read as a fail.
        return None if self.final_grade is None else round(self.final_grade, 2) >= PASS_MARK


# A category average is a difficulty under the pass mark, a strength from STRENGTH_LEVEL; in
# between, a difficulty this many points under the class's and a strength this many over it (plan
# todo 75 stage 3).
SIGNAL_GAP = 10.0
STRENGTH_LEVEL = 85.0
SIGNAL_DIFFICULTY = "difficulty"
SIGNAL_STRENGTH = "strength"
# Being there is what is asked, not a strength: an Attendance rule's figure (85 to 90 % is already
# past the ΜΙΕΕΚ participation limit of 10 % absences) can only be a difficulty.
NEVER_A_STRENGTH = frozenset({"attendance"})
# How a course measures Class Participation (see _participation_scales).
RATED = "rated"
OBSERVED = "observed"
# Grades without a category (the API and imported sessions allow it): one group, shown by name.
UNCATEGORIZED_KEY = cats.group_key(None)
UNCATEGORIZED_LABEL = "uncategorized"


def _tenths(value: Optional[float]) -> Optional[int]:
    """A figure as the Analytics page shows it, in whole tenths: one decimal, a half rounded up.

    Rounded to 9 decimals first, which drops the float noise of the arithmetic (16.99 / 20 * 100
    is 84.94999999999999, a teacher's 84.95), then through the shortest decimal form, so 61.25 is
    61.3 and 70.05 is 70.1, as a teacher rounds them."""
    if value is None or not math.isfinite(value):
        return None
    try:
        return int(Decimal(repr(round(float(value), 9))).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP) * 10)
    except InvalidOperation:  # a figure too large for the decimal context: no half to round
        return int(round(float(value) * 10))


def _shown(value: Optional[float]) -> Optional[float]:
    """A category figure to send: one decimal, as the page shows it and as it is judged."""
    tenths = _tenths(value)
    return None if tenths is None else tenths / 10


def _difference(average: Optional[float], class_average: Optional[float]) -> Optional[float]:
    """The difference of two figures as they are shown, so the three add up on the page."""
    mine, theirs = _tenths(average), _tenths(class_average)
    return None if mine is None or theirs is None else (mine - theirs) / 10


def category_signal(
    average: Optional[float], class_average: Optional[float], strengths: bool = True
) -> Optional[str]:
    """difficulty / strength / None for a category average, judged on the figures as shown.

    The levels come first: under the pass mark is a difficulty and STRENGTH_LEVEL or more a
    strength, whatever the class. In between, SIGNAL_GAP points under or over the class decide.
    Compared in whole tenths, so a gap of exactly 10 as shown always counts. A figure of presence
    (``strengths=False``: an Attendance rule, Class Participation where nobody is rated) can be a
    difficulty, never a strength."""
    mine = _tenths(average)
    if mine is None:
        return None
    if mine < PASS_MARK * 10:
        return SIGNAL_DIFFICULTY
    if strengths and mine >= STRENGTH_LEVEL * 10:
        return SIGNAL_STRENGTH
    theirs = _tenths(class_average)
    if theirs is not None and mine <= theirs - SIGNAL_GAP * 10:
        return SIGNAL_DIFFICULTY
    if strengths and theirs is not None and mine >= theirs + SIGNAL_GAP * 10:
        return SIGNAL_STRENGTH
    return None


def _may_be_strength(key: str, presence_keys: Iterable[str]) -> bool:
    """Whether a category's figure can be a strength: not one of presence alone."""
    return key not in NEVER_A_STRENGTH and key not in set(presence_keys)


def _category_names(facts: Iterable[EnrollmentFacts]) -> Dict[str, str]:
    """The name of each category over the facts loaded: the spelling most of them use.

    A tie goes to the spelling that sorts first, so the name never depends on which row the
    database returns first (the grade sheets also name a column by its most common spelling)."""
    spellings: Dict[str, Counter[str]] = {}
    for f in facts:
        for key, found in f.category_names.items():
            spellings.setdefault(key, Counter()).update(found)
    return {key: min(found.items(), key=lambda item: (-item[1], item[0]))[0] for key, found in spellings.items() if found}


def _category_columns(keys: Iterable[str], names: Dict[str, str]) -> List[Dict[str, Any]]:
    """The categories in display order: the standard ones first, then any other by name.

    A grade without a category has its own label ("uncategorized"), to be translated."""
    return [
        {
            "key": key,
            "label_key": key if key in cats.CATEGORY_KEYS else (UNCATEGORIZED_LABEL if key == UNCATEGORIZED_KEY else None),
            "name": names.get(key) or key.split(":", 1)[-1],
        }
        for key in sorted(set(keys), key=cats.sort_position)
    ]


def _pooled_rate(facts: Iterable[EnrollmentFacts]) -> Optional[float]:
    facts = list(facts)
    recorded = sum(f.recorded for f in facts)
    return sum(f.attended for f in facts) / recorded * 100 if recorded else None


class AnalyticsOverviewService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self._final_grades = AnalyticsService(db)
        (
            self.Student,
            self.Course,
            self.Grade,
            self.DailyPerformance,
            self.Attendance,
            self.CourseEnrollment,
        ) = import_names("models", "Student", "Course", "Grade", "DailyPerformance", "Attendance", "CourseEnrollment")

    # ------------------------------------------------------------------ loading

    def _active_students(self) -> List[Any]:
        S = self.Student
        return (
            self.db.query(S)
            .filter(S.deleted_at.is_(None), or_(S.is_active.is_(True), S.is_active.is_(None)))
            .order_by(S.last_name.asc(), S.first_name.asc())
            .all()
        )

    def _facts(
        self,
        *,
        student_ids: Optional[Sequence[int]] = None,
        course_ids: Optional[Sequence[int]] = None,
        active_students_only: bool = False,
    ) -> tuple[List[EnrollmentFacts], Dict[int, Any]]:
        """Facts for every live enrollment matching the filters, and the courses they belong to."""
        E = self.CourseEnrollment
        q = self.db.query(E).filter(E.deleted_at.is_(None), E.status != "dropped")
        if student_ids is not None:
            if not student_ids:
                return [], {}
            q = q.filter(E.student_id.in_(list(student_ids)))
        if course_ids is not None:
            if not course_ids:
                return [], {}
            q = q.filter(E.course_id.in_(list(course_ids)))
        enrollments = q.all()
        if active_students_only and enrollments:
            active = {s.id for s in self._active_students()}
            enrollments = [e for e in enrollments if e.student_id in active]
        if not enrollments:
            return [], {}

        cids = {e.course_id for e in enrollments}
        sids = {e.student_id for e in enrollments}
        courses = {
            c.id: c for c in self.db.query(self.Course).filter(self.Course.id.in_(cids), self.Course.deleted_at.is_(None))
        }
        enrollments = [e for e in enrollments if e.course_id in courses]

        def by_pair(model: Any) -> Dict[tuple[int, int], List[Any]]:
            rows: Dict[tuple[int, int], List[Any]] = {}
            for row in self.db.query(model).filter(
                model.student_id.in_(sids), model.course_id.in_(cids), model.deleted_at.is_(None)
            ):
                rows.setdefault((row.student_id, row.course_id), []).append(row)
            return rows

        grades, daily, attendance = by_pair(self.Grade), by_pair(self.DailyPerformance), by_pair(self.Attendance)
        # Imported here: the grade sheets build on this service (a module-level import would loop).
        from backend.services.grade_sheet_service import weighted_rules

        with_rules = {cid for cid, course in courses.items() if weighted_rules(course.evaluation_rules)}
        scales = self._participation_scales(courses)

        facts = []
        for e in enrollments:
            key = (e.student_id, e.course_id)
            facts.append(
                self._enrollment_facts(
                    e,
                    courses[e.course_id],
                    grades.get(key, []),
                    daily.get(key, []),
                    attendance.get(key, []),
                    with_rules=e.course_id in with_rules,
                    participation_scale=scales.get(e.course_id),
                )
            )
        return facts, courses

    def _participation_scales(self, courses: Dict[int, Any]) -> Dict[int, str]:
        """How each course measures Class Participation, over all its students (the owner,
        2026-11-23): RATED when anyone has a participation grade or rating that the final grade's
        Class Participation rule takes, OBSERVED when nobody does but a participation observation
        is ticked in Attendance, nothing otherwise.

        One scale per course, so a rating is never judged against a share for being present, and
        over every student of the course, not only those loaded, so every view agrees."""
        rules: Dict[int, bool] = {}  # course -> whether its participation rule takes the ratings
        for cid, course in courses.items():
            rule = next(
                (
                    r
                    for r in (course.evaluation_rules if isinstance(course.evaluation_rules, list) else [])
                    if isinstance(r, dict) and normalize_rule_category(r.get("category")) == "participation"
                ),
                None,
            )
            if rule is not None:
                rules[cid] = rule.get("includeDailyPerformance", True) is not False
        if not rules:
            return {}
        ids = list(rules)
        G, DP = self.Grade, self.DailyPerformance
        rated: set[int] = set()
        observed: set[int] = set()
        for cid, category in self.db.query(G.course_id, G.category).filter(G.course_id.in_(ids), G.deleted_at.is_(None)).distinct():
            if normalize_rule_category(category) == "participation":
                rated.add(cid)
        for cid, category in self.db.query(DP.course_id, DP.category).filter(DP.course_id.in_(ids), DP.deleted_at.is_(None)).distinct():
            name = normalize_rule_category(category)
            if name == "participation" and rules[cid]:
                rated.add(cid)
            elif name in AnalyticsService.participation_observations:
                observed.add(cid)
        return {cid: (RATED if cid in rated else OBSERVED) for cid in rated | observed}

    def _enrollment_facts(
        self,
        enrollment: Any,
        course: Any,
        grades: List[Any],
        daily: List[Any],
        attendance: List[Any],
        *,
        with_rules: bool = False,
        participation_scale: Optional[str] = None,
    ) -> EnrollmentFacts:
        percentages = [g.grade / g.max_grade * 100 for g in grades if g.max_grade]
        final_grade: Optional[float] = None
        basis: Optional[str] = None
        breakdown: Dict[str, Dict[str, Any]] = {}
        participation: Optional[Dict[str, Any]] = None
        participation_deduction = absence_deduction = 0.0
        graded = bool(percentages or daily)
        # Where participation is observed, a student present with nothing graded yet still has
        # a share (the whole of it, less any tick): the calculation runs for it, its grade not.
        if course.evaluation_rules and (graded or (participation_scale == OBSERVED and attendance)):
            data = self._final_grades._calculate_final_grade_from_records(
                enrollment.student_id, course, grades, daily, attendance
            )
            if not data.get("error"):
                if graded and data.get("total_weight_used", 0) > 0:
                    final_grade, basis = float(data["final_grade"]), "rules"
                    breakdown = dict(data.get("category_breakdown") or {})
                    participation_deduction = float(data.get("participation_deduction") or 0.0)
                    # What the grade lost, not the penalty asked: the grade stops at 0.
                    absence_deduction = float(data.get("absence_deduction_applied") or 0.0)
                participation = data.get("participation_share")
        if final_grade is None and percentages:
            final_grade, basis = mean(percentages), "average"
        # One scale per course: where anyone is rated, only a rated share counts; where nobody is,
        # an unrated one (the whole share less the ticks, presence alone); else none at all, or
        # every student of every course would show 100.
        if participation is not None and not (
            (participation_scale == RATED and participation.get("rated"))
            or (participation_scale == OBSERVED and not participation.get("rated"))
        ):
            participation = None

        counts = {"present": 0, "late": 0, "absent": 0, "excused": 0}
        for record in attendance:
            status = str(record.status or "").lower()
            if status in counts:
                counts[status] += 1

        dated = sorted(grades, key=lambda g: (_grade_date(g) or "9999", g.id))
        category_averages, category_names = self._category_averages(
            grades, breakdown if with_rules else None, participation if with_rules else None
        )
        presence_keys = (
            {cats.group_key(participation.get("category"))}
            if with_rules and participation is not None and not participation.get("rated")
            else set()
        )
        return EnrollmentFacts(
            student_id=enrollment.student_id,
            course_id=enrollment.course_id,
            final_grade=final_grade,
            grade_basis=basis,
            grade_count=len(percentages),
            rating_count=len(daily),
            exam_average=_mean(g.grade / g.max_grade * 100 for g in grades if g.max_grade and _is_exam(g.category)),
            absence=absence_limit_service.evaluate(course, absent=counts["absent"], excused=counts["excused"]),
            grades=[
                {
                    "date": _grade_date(g),
                    "category": g.category,
                    "assignment": g.assignment_name,
                    "percentage": round(g.grade / g.max_grade * 100, 2),
                }
                for g in dated
                if g.max_grade
            ],
            category_breakdown=breakdown,
            participation_deduction=participation_deduction,
            absence_deduction=absence_deduction,
            category_averages=category_averages,
            category_names=category_names,
            presence_keys=presence_keys,
            with_rules=with_rules,
            **counts,
        )

    @staticmethod
    def _category_averages(
        grades: List[Any],
        breakdown: Optional[Dict[str, Dict[str, Any]]],
        participation: Optional[Dict[str, Any]] = None,
    ) -> tuple[Dict[str, float], Dict[str, Counter[str]]]:
        """The student's average per category in one course, keyed to compare across courses.

        A course with weighted rules (``breakdown`` given, maybe empty) counts its rules for every
        student, as its grade sheet by category does: the averages the final grade counts (exams
        by their latest grade, ratings included), two rules of one kind ("Θεωρητική Εξέταση",
        "Πρακτική Εξέταση") by their weights, so the figure is that share of the final grade.
        Class Participation is the share kept once the participation observations took theirs
        (``participation``, from ``_calculate_final_grade_from_records``, already filtered by the
        course's scale in ``_enrollment_facts``): rated, what the final grade counts; in a course
        that rates nobody, the whole share for being present less the ticks.
        A category the final grade zeroed for absences is left out: that is attendance, not how
        the student does in it. A grade outside the rules does not count, as in the final grade.
        Without rules (the final grade the mean of the grades): each category's weighted mean of
        its grades, as percentages of their maximum.
        """
        names: Dict[str, Counter[str]] = {}
        totals: Dict[str, List[float]] = {}  # key -> [weighted sum, weights]

        def add(category: Any, average: float, weight: float) -> None:
            key = cats.group_key(category)
            names.setdefault(key, Counter())[str(category or "").strip()] += 1
            total = totals.setdefault(key, [0.0, 0.0])
            total[0] += average * weight
            total[1] += weight

        if breakdown is not None:
            shared = participation.get("category") if participation else None
            for category, details in breakdown.items():
                average = details.get("average")
                if details.get("forfeited") or average is None or category == shared:
                    continue
                add(category, float(average), float(details.get("weight") or 0) or 1.0)
            if participation is not None:
                add(participation.get("category"), float(participation["percent"]), float(participation.get("weight") or 0) or 1.0)
        else:
            for g in grades:
                if g.max_grade:
                    add(g.category, g.grade / g.max_grade * 100, AnalyticsService.grade_weight(g))
        return {key: s / w for key, (s, w) in totals.items() if w}, names

    def course_facts(self, course_id: int) -> List[EnrollmentFacts]:
        """Facts for the live enrollments of active students in one course (the grade sheets)."""
        return self._facts(course_ids=[course_id], active_students_only=True)[0]

    # ------------------------------------------------------------------ views

    @staticmethod
    def _attendance_dict(facts: Sequence[EnrollmentFacts]) -> Dict[str, Any]:
        return {
            "present": sum(f.present for f in facts),
            "late": sum(f.late for f in facts),
            "absent": sum(f.absent for f in facts),
            "excused": sum(f.excused for f in facts),
            "recorded": sum(f.recorded for f in facts),
            "rate": _round(_pooled_rate(facts)),
        }

    @staticmethod
    def _distribution(facts: Iterable[EnrollmentFacts]) -> List[Dict[str, Any]]:
        counts = {label: 0 for label, _ in GRADE_BANDS}
        for f in facts:
            if f.final_grade is not None:
                counts[_band(f.final_grade)] += 1
        return [{"band": label, "count": counts[label]} for label, _ in reversed(GRADE_BANDS)]

    def class_overview(
        self,
        academic_year: Optional[str] = None,
        class_division: Optional[str] = None,
        course_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        all_students = self._active_students()
        year_students = [s for s in all_students if not academic_year or s.academic_year == academic_year]
        students = [s for s in year_students if not class_division or s.class_division == class_division]

        facts, courses = self._facts(
            student_ids=[s.id for s in students], course_ids=[course_id] if course_id else None
        )
        by_student: Dict[int, List[EnrollmentFacts]] = {}
        by_course: Dict[int, List[EnrollmentFacts]] = {}
        for f in facts:
            by_student.setdefault(f.student_id, []).append(f)
            by_course.setdefault(f.course_id, []).append(f)

        student_rows = []
        for s in students:
            sf = by_student.get(s.id, [])
            if course_id and not sf:
                continue  # with a course chosen, only its students belong to the selection
            failing = sorted(courses[f.course_id].course_name for f in sf if f.passing is False)
            worst = _worst_status(f.absence.get("status", "") for f in sf)
            average = _mean(f.final_grade for f in sf)
            student_rows.append(
                {
                    "id": s.id,
                    "student_id": s.student_id,
                    "name": f"{s.first_name} {s.last_name}",
                    "academic_year": s.academic_year,
                    "class_division": s.class_division,
                    "courses": len(sf),
                    "average_final_grade": _round(average),
                    "exam_average": _round(_mean(f.exam_average for f in sf)),
                    "credits": sum(int(courses[f.course_id].credits or 0) for f in sf),
                    "failing_courses": failing,
                    "attendance_rate": _round(_pooled_rate(sf)),
                    "absence_status": worst,
                    "participation_forfeited": [courses[f.course_id].course_name for f in sf if f.participation_forfeited],
                    "at_risk": bool(failing) or any(f.participation_forfeited for f in sf) or worst in (
                        absence_limit_service.STATUS_WARNING,
                        absence_limit_service.STATUS_INSUFFICIENT,
                    ),
                }
            )

        course_rows = []
        for cid, cf in by_course.items():
            course = courses[cid]
            graded = [f for f in cf if f.final_grade is not None]
            course_rows.append(
                {
                    "id": cid,
                    "course_code": course.course_code,
                    "course_name": course.course_name,
                    "students": len(cf),
                    "graded": len(graded),
                    "average_final_grade": _round(_mean(f.final_grade for f in graded)),
                    "passing": sum(1 for f in graded if f.passing),
                    "failing": sum(1 for f in graded if f.passing is False),
                    "attendance_rate": _round(_pooled_rate(cf)),
                    "attendance": self._attendance_dict(cf),
                    "absence_warning": sum(
                        1 for f in cf if f.absence.get("status") == absence_limit_service.STATUS_WARNING
                    ),
                    "absence_insufficient": sum(1 for f in cf if f.absence.get("attendance_insufficient")),
                    "participation_forfeited": sum(1 for f in cf if f.participation_forfeited),
                }
            )
        course_rows.sort(key=lambda r: r["course_name"])

        graded = [f for f in facts if f.final_grade is not None]
        return {
            "categories": self._class_categories(student_rows, by_student, by_course, courses),
            "scope": {"academic_year": academic_year, "class_division": class_division, "course_id": course_id},
            "filters": {
                "academic_years": sorted({s.academic_year for s in all_students if s.academic_year}),
                "class_divisions": sorted({s.class_division for s in year_students if s.class_division}),
            },
            "summary": {
                "students": len(student_rows),
                "courses": len(course_rows),
                "enrollments": len(facts),
                "graded_enrollments": len(graded),
                "average_final_grade": _round(_mean(f.final_grade for f in graded)),
                "pass_rate": _round(sum(1 for f in graded if f.passing) / len(graded) * 100) if graded else None,
                "attendance_rate": _round(_pooled_rate(facts)),
                "at_risk_students": sum(1 for r in student_rows if r["at_risk"]),
            },
            "distribution": self._distribution(facts),
            "courses": course_rows,
            "students": student_rows,
        }

    @staticmethod
    def _class_categories(
        student_rows: List[Dict[str, Any]],
        by_student: Dict[int, List[EnrollmentFacts]],
        by_course: Dict[int, List[EnrollmentFacts]],
        courses: Dict[int, Any],
    ) -> Dict[str, Any]:
        """The selection by category, whatever the course (plan todo 75 stage 3).

        Each student's average per category over all their courses in the selection, marked a
        strength or a difficulty against the class in the same courses: each course's average for
        the category (its students in the selection), then the mean over the student's courses.
        That is how the student view judges (``_student_categories``), so without a year or
        division filter a name opens a profile with the same marks, and a student in a hard course
        is not held to an easy one's average. With a filter, a course's average counts the
        selection's students only, as every figure of the class view. A student with no graded
        category has no row. Then the selection's average per category, and each course's. Every
        figure is sent as it is shown and judged: one decimal (``_shown``).
        """
        course_averages: Dict[int, Dict[str, Optional[float]]] = {}
        for cid, cf in by_course.items():
            found_keys = {key for f in cf for key in f.category_averages}
            course_averages[cid] = {key: _mean(f.category_averages.get(key) for f in cf) for key in found_keys}

        names = _category_names(f for cf in by_course.values() for f in cf)
        student_values: Dict[int, Dict[str, float]] = {}
        student_references: Dict[int, Dict[str, Optional[float]]] = {}
        student_presence: Dict[int, set[str]] = {}
        for row in student_rows:
            own: Dict[str, List[float]] = {}
            theirs: Dict[str, List[Optional[float]]] = {}
            for f in by_student.get(row["id"], []):
                for key, value in f.category_averages.items():
                    own.setdefault(key, []).append(value)
                    theirs.setdefault(key, []).append(course_averages[f.course_id].get(key))
            student_values[row["id"]] = {key: mean(found) for key, found in own.items()}
            student_references[row["id"]] = {key: _mean(found) for key, found in theirs.items()}
            student_presence[row["id"]] = {key for f in by_student.get(row["id"], []) for key in f.presence_keys}
        columns = _category_columns((key for values in student_values.values() for key in values), names)
        keys = [column["key"] for column in columns]
        averages = [_mean(student_values[row["id"]].get(key) for row in student_rows) for key in keys]

        students = []
        for row in student_rows:
            if not student_values[row["id"]]:
                continue
            cells = [student_values[row["id"]].get(key) for key in keys]
            references = [student_references[row["id"]].get(key) for key in keys]
            signals = [
                category_signal(value, reference, _may_be_strength(key, student_presence[row["id"]]))
                for key, value, reference in zip(keys, cells, references)
            ]
            students.append(
                {
                    "id": row["id"],
                    "name": row["name"],
                    "cells": [_shown(value) for value in cells],
                    "class_averages": [_shown(reference) for reference in references],
                    "signals": signals,
                    "difficulties": signals.count(SIGNAL_DIFFICULTY),
                    "strengths": signals.count(SIGNAL_STRENGTH),
                }
            )
        course_rows = [
            {
                "id": cid,
                "course_code": courses[cid].course_code,
                "course_name": courses[cid].course_name,
                "cells": [_shown(course_averages[cid].get(key)) for key in keys],
            }
            for cid in sorted(by_course, key=lambda cid: courses[cid].course_name)
        ]
        return {
            "columns": columns,
            "averages": [_shown(average) for average in averages],
            "students": students,
            "courses": course_rows,
        }

    @staticmethod
    def _student_categories(
        own: List[EnrollmentFacts], peers_by_course: Dict[int, List[EnrollmentFacts]], courses: Dict[int, Any]
    ) -> List[Dict[str, Any]]:
        """Each category of the student's courses: their average over those courses against the
        class's in the same courses, marked a strength or a difficulty, and course by course.
        Every figure as it is shown and judged: one decimal (``_shown``)."""
        # The student is among the peers too (unless inactive): each enrollment counted once.
        loaded = {(f.student_id, f.course_id): f for peers in peers_by_course.values() for f in peers}
        loaded.update({(f.student_id, f.course_id): f for f in own})
        names = _category_names(loaded.values())
        per_key: Dict[str, List[Dict[str, Any]]] = {}
        presence: Dict[tuple[str, int], bool] = {}  # (key, course) -> a figure of presence alone
        for f in own:
            course = courses[f.course_id]
            peers = peers_by_course.get(f.course_id, [])
            for key, value in f.category_averages.items():
                presence[(key, course.id)] = key in f.presence_keys
                per_key.setdefault(key, []).append(
                    {
                        "id": course.id,
                        "course_code": course.course_code,
                        "course_name": course.course_name,
                        "average": value,
                        "class_average": _mean(p.category_averages.get(key) for p in peers),
                    }
                )
        found = []
        for column in _category_columns(per_key, names):
            key = column["key"]
            items = sorted(per_key[key], key=lambda item: item["course_name"])
            overall = _mean(item["average"] for item in items)
            class_overall = _mean(item["class_average"] for item in items)
            # A part of presence alone in any course: the whole figure can be no strength.
            strengths = key not in NEVER_A_STRENGTH and not any(presence[(key, item["id"])] for item in items)
            found.append(
                {
                    **column,
                    "average": _shown(overall),
                    "class_average": _shown(class_overall),
                    "difference": _difference(overall, class_overall),
                    "signal": category_signal(overall, class_overall, strengths),
                    "courses": [
                        {
                            **item,
                            "average": _shown(item["average"]),
                            "class_average": _shown(item["class_average"]),
                            "signal": category_signal(
                                item["average"],
                                item["class_average"],
                                key not in NEVER_A_STRENGTH and not presence[(key, item["id"])],
                            ),
                        }
                        for item in items
                    ],
                }
            )
        return found

    def attendance_gaps(self, today: date, days: int = 7) -> Dict[str, Any]:
        """Scheduled teaching days in the last ``days`` days (today excluded) with no attendance.

        A course counts when it has live enrollments of active students. Its teaching days come
        from ``teaching_schedule`` (as the Attendance page reads it: English day names or a
        Monday-based index); weekends never count. A course without a schedule cannot be
        checked and is listed under ``unscheduled``. Holidays are not known to the app, so a
        missing day may be a day off.
        """
        active_ids = [s.id for s in self._active_students()]
        E = self.CourseEnrollment
        course_ids = (
            {
                cid
                for (cid,) in self.db.query(E.course_id).filter(
                    E.deleted_at.is_(None), E.status != "dropped", E.student_id.in_(active_ids)
                )
            }
            if active_ids
            else set()
        )
        courses = (
            self.db.query(self.Course)
            .filter(self.Course.id.in_(course_ids), self.Course.deleted_at.is_(None))
            .order_by(self.Course.course_name.asc())
            .all()
            if course_ids
            else []
        )
        window = [today - timedelta(days=offset) for offset in range(days, 0, -1)]
        recorded: Dict[int, set] = {}
        if courses and window:
            A = self.Attendance
            for cid, day in self.db.query(A.course_id, A.date).filter(
                A.course_id.in_([c.id for c in courses]),
                A.deleted_at.is_(None),
                A.date >= window[0],
                A.date <= window[-1],
            ):
                recorded.setdefault(cid, set()).add(day)

        missing, unscheduled = [], []
        for course in courses:
            weekdays = scheduled_weekdays(course.teaching_schedule)
            if not weekdays:
                unscheduled.append({"id": course.id, "course_code": course.course_code, "course_name": course.course_name})
                continue
            gaps = [d for d in window if d.weekday() in weekdays and d not in recorded.get(course.id, set())]
            if gaps:
                missing.append(
                    {
                        "id": course.id,
                        "course_code": course.course_code,
                        "course_name": course.course_name,
                        "missing_dates": [d.isoformat() for d in gaps],
                    }
                )
        return {
            "from": window[0].isoformat() if window else None,
            "to": window[-1].isoformat() if window else None,
            "courses_checked": len(courses) - len(unscheduled),
            "missing": missing,
            "unscheduled": unscheduled,
        }

    def student_overview(self, student_id: int) -> Dict[str, Any]:
        student = get_by_id_or_404(self.db, self.Student, student_id)
        own, courses = self._facts(student_ids=[student_id])
        # Class context: every active student enrolled in the same courses (this one included).
        peers, _ = self._facts(course_ids=list(courses), active_students_only=True)
        peers_by_course: Dict[int, List[EnrollmentFacts]] = {}
        for f in peers:
            peers_by_course.setdefault(f.course_id, []).append(f)

        rows = []
        for f in sorted(own, key=lambda x: courses[x.course_id].course_name):
            course = courses[f.course_id]
            peer_finals = sorted(
                (p.final_grade for p in peers_by_course.get(f.course_id, []) if p.final_grade is not None),
                reverse=True,
            )
            rank = peer_finals.index(f.final_grade) + 1 if f.final_grade is not None else None
            absence = f.absence
            rows.append(
                {
                    "id": course.id,
                    "course_code": course.course_code,
                    "course_name": course.course_name,
                    "final_grade": _round(f.final_grade),
                    "grade_basis": f.grade_basis,
                    # With rules and grade_basis "average": the grades so far are all outside the
                    # rules (the final grade fell back to their mean; no category counts them).
                    "has_rules": f.with_rules,
                    "grade_count": f.grade_count,
                    "rating_count": f.rating_count,
                    "passing": f.passing,
                    "class_average": _round(_mean(peer_finals)),
                    "rank": rank,
                    "ranked_of": len(peer_finals),
                    "attendance": self._attendance_dict([f]),
                    "absence": {
                        "status": absence.get("status"),
                        "absences": absence.get("absences"),
                        "allowed_absences": absence.get("allowed_absences"),
                        "remaining_absences": absence.get("remaining_absences"),
                        "absence_percent": absence.get("absence_percent"),
                        "limit_percent": absence.get("limit_percent"),
                        "participation_limit_percent": absence.get("participation_limit_percent"),
                        "participation_allowed_absences": absence.get("participation_allowed_absences"),
                        "participation_forfeited": f.participation_forfeited,
                    },
                    "grades": f.grades,
                }
            )

        worst = _worst_status(f.absence.get("status", "") for f in own)
        failing = sum(1 for f in own if f.passing is False)
        return {
            "student": {
                "id": student.id,
                "student_id": student.student_id,
                "name": f"{student.first_name} {student.last_name}",
                "academic_year": student.academic_year,
                "class_division": student.class_division,
                "is_active": student.is_active is not False,
            },
            "summary": {
                "courses": len(own),
                "graded_courses": sum(1 for f in own if f.final_grade is not None),
                "average_final_grade": _round(_mean(f.final_grade for f in own)),
                "passing": sum(1 for f in own if f.passing),
                "failing": failing,
                "attendance": self._attendance_dict(own),
                "absence_status": worst,
                "participation_forfeited": sum(1 for f in own if f.participation_forfeited),
                "at_risk": failing > 0
                or any(f.participation_forfeited for f in own)
                or worst in (absence_limit_service.STATUS_WARNING, absence_limit_service.STATUS_INSUFFICIENT),
            },
            "courses": rows,
            "categories": self._student_categories(own, peers_by_course, courses),
        }
