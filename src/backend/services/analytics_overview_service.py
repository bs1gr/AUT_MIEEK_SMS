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

from dataclasses import dataclass, field
from datetime import date, timedelta
from statistics import mean
from typing import Any, Dict, Iterable, List, Optional, Sequence

from sqlalchemy import or_
from sqlalchemy.orm import Session

from backend.db.utils import get_by_id_or_404
from backend.import_resolver import import_names
from backend.services import absence_limit_service
from backend.services.analytics_service import AnalyticsService

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
        return None if self.final_grade is None else self.final_grade >= PASS_MARK


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

        facts = []
        for e in enrollments:
            key = (e.student_id, e.course_id)
            facts.append(
                self._enrollment_facts(e, courses[e.course_id], grades.get(key, []), daily.get(key, []), attendance.get(key, []))
            )
        return facts, courses

    def _enrollment_facts(
        self, enrollment: Any, course: Any, grades: List[Any], daily: List[Any], attendance: List[Any]
    ) -> EnrollmentFacts:
        percentages = [g.grade / g.max_grade * 100 for g in grades if g.max_grade]
        final_grade: Optional[float] = None
        basis: Optional[str] = None
        if percentages or daily:
            if course.evaluation_rules:
                data = self._final_grades._calculate_final_grade_from_records(
                    enrollment.student_id, course, grades, daily, attendance
                )
                if not data.get("error") and data.get("total_weight_used", 0) > 0:
                    final_grade, basis = float(data["final_grade"]), "rules"
            if final_grade is None and percentages:
                final_grade, basis = mean(percentages), "average"

        counts = {"present": 0, "late": 0, "absent": 0, "excused": 0}
        for record in attendance:
            status = str(record.status or "").lower()
            if status in counts:
                counts[status] += 1

        dated = sorted(grades, key=lambda g: (_grade_date(g) or "9999", g.id))
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
            **counts,
        )

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
        }
