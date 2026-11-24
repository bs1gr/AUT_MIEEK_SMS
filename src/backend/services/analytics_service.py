from __future__ import annotations

import logging
import re
import unicodedata
from dataclasses import asdict, dataclass
from datetime import date, datetime, timezone
from typing import Any, Dict, Iterable, List, Optional, Pattern, Tuple, cast

from sqlalchemy import case, func, inspect
from sqlalchemy.engine.reflection import Inspector
from sqlalchemy.orm import Session

from backend.db.utils import get_by_id_or_404
from backend.import_resolver import import_names
from backend.services import absence_limit_service
from backend.services.cache_service import get_cache_manager

logger = logging.getLogger(__name__)


def _fold_rule_name(name: Any) -> str:
    """A name as the final grade compares it: no case, no accents, punctuation as spaces, single
    spaces ("Τελική-Εξέταση" -> "τελικη εξεταση"; casefold makes a final sigma a sigma)."""
    decomposed = unicodedata.normalize("NFD", str(name))
    bare = "".join(ch for ch in decomposed if not unicodedata.combining(ch)).casefold()
    for ch in ":;,.-_()/":
        bare = bare.replace(ch, " ")
    return " ".join(bare.split())


# Whole names first (written as people type them; folded like the names compared with them).
_RULE_SYNONYMS: Dict[str, str] = {
    _fold_rule_name(spelling): key
    for spelling, key in {
        # Exams
        "midterm exam": "midterm",
        "midterm": "midterm",
        "intermediate": "midterm",
        "ενδιάμεση": "midterm",
        "ενδιάμεση εξέταση": "midterm",
        "final exam": "final",
        "final": "final",
        "τελική": "final",
        "τελική εξέταση": "final",
        # Coursework
        "homework": "homework",
        "assignment": "homework",
        "assignments": "homework",
        "εργασία": "homework",
        "άσκηση": "homework",
        "project": "project",
        "πρότζεκτ": "project",
        "lab": "lab",
        "lab work": "lab",
        "εργαστήριο": "lab",
        "quiz": "quiz",
        "κουίζ": "quiz",
        # The course editor saves the Greek name as the English one: both one category.
        "continuous assessment": "continuous",
        "συνεχής αξιολόγηση": "continuous",
        # Participation / attendance
        "class participation": "participation",
        "participation": "participation",
        "συμμετοχή": "participation",
        "no participation": "no participation",
        "minor participation": "minor participation",
        "minor participation mobile usage": "minor participation (mobile usage)",
        "minor participation with mobile usage": "minor participation (mobile usage)",
        # The observations as the Greek page names them, which the course editor saves as the
        # English names (todo 77 point 2's review: they were read as Class Participation).
        "καμία συμμετοχή": "no participation",
        "μικρή συμμετοχή": "minor participation",
        "μικρή συμμετοχή (χρήση κινητού)": "minor participation (mobile usage)",
        "attendance": "attendance",
        "παρουσία": "attendance",
    }.items()
}

# Then the first key with a word that starts with one of its stems, in this order: the more
# specific stem wins where one word holds another's (the owner, 2026-11-23, plan todo 77 point 2).
# Continuous assessment first: the templates' «Συνεχής Αξιολόγηση (Εκπόνηση εργασιών στο σπίτι)»
# and «… και Ενδιάμεση Εξέταση)» are that rule, whatever their brackets name (the owner,
# 2026-11-23: "homework, any other exercise or any other assessment and task during the lesson's
# period, belongs to «Συνεχής Αξιολόγηση»"). Coursework before the exams: "Τελική Εργασία" is
# homework, "Final Project" a project, "Final Quiz" and «Τελικό Τεστ» quizzes, «Τελική Παρουσίαση»
# a presentation, not the final exam (the owner, the same evening: only a name that is just the
# exam counts the exam's one grade; plan todo 86: a quiz or a presentation read as the exam could
# be taken for a final exam retake and fail the course). A project before a lab and homework, as
# the standard category list has it (`grade_categories`); a lab before homework ("Εργαστήρια",
# "Εργαστηριακή Εργασία", "Εργαστ. Ασκήσεις" hold "εργασ"); a presentation before attendance, by
# stems that go past the "σ" ("Παρουσίαση", "Παρουσιάσεις"), since the genitive of attendance folds
# to "παρουσιασ" too ("Ποσοστό Παρουσίας"); participation before both ("Παρουσία και Συμμετοχή" is
# participation). A stem counts only at the start of a word, as in that list, so "Collaboration" is
# no lab and "Επεξεργασία" no homework. The course editor finds a rule's kind by the same stems in
# the same order (`categoryLabels.ts`, `getRuleKind`). Until then homework came before lab, project
# after it, attendance took any "παρουσ", and a stem counted anywhere in a word.
_RULE_STEMS: Tuple[Tuple[str, Tuple[Pattern[str], ...]], ...] = tuple(
    (key, tuple(re.compile(r"(?<!\w)" + re.escape(_fold_rule_name(stem))) for stem in stems))
    for key, stems in (
        (
            "minor participation (mobile usage)",
            (
                "minor participation mobile usage",
                "minor participation with mobile usage",
                "mobile usage participation",
                "mobile use participation",
                "μικρή συμμετοχή χρήση κινητού",
            ),
        ),
        ("no participation", ("no participation", "καμία συμμετοχή")),
        ("minor participation", ("minor participation", "μικρή συμμετοχή")),
        ("continuous", ("continuous", "συνεχ")),
        ("project", ("project", "πρότζεκ")),
        ("lab", ("lab", "εργαστ")),
        ("homework", ("homework", "assignment", "εργασ", "άσκη", "εξάσκη")),
        ("quiz", ("quiz", "κουίζ", "τεστ")),
        ("participation", ("participation", "συμμετο")),
        ("presentation", ("presentation", "παρουσιαση", "παρουσιασε")),
        ("midterm", ("midterm", "mid term", "ενδιάμεσ")),
        ("final", ("final", "τελικ")),
        ("attendance", ("attendance", "παρουσ")),
    )
)


def normalize_rule_category(name: Optional[str]) -> str:
    """Normalize category names to improve matching between evaluation rules and recorded items.

    Compares names without case, accents or punctuation, and maps common synonyms and Greek
    equivalents to one key; any other name is its folded self, so a course's own name matches its
    grades whatever the accents ("Θεωρητική Εξέταση" is "ΘΕΩΡΗΤΙΚΗ ΕΞΕΤΑΣΗ"). This is the final
    grade's own matching (``_calculate_final_grade_from_records``); it lives at module level so
    that the grade sheets can tell which rule the calculation treats as Class Participation.
    Changing it changes final grades.
    """
    if not name:
        return ""
    n = _fold_rule_name(name)
    if n in _RULE_SYNONYMS:
        return _RULE_SYNONYMS[n]
    for key, stems in _RULE_STEMS:
        if any(stem.search(n) for stem in stems):
            return key
    return n


@dataclass
class StudentCourseSummary:
    course_code: str
    course_name: str
    credits: int
    final_grade: float
    gpa: float
    letter_grade: str
    course_id: int = 0
    # Plan todo 83: the final grade is the course's figure on the Students page and the Profile
    # (else the average of the grades so far); see AnalyticsService.final_grade_ready.
    final_grade_ready: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class AnalyticsService:
    """Encapsulates analytics-related business logic and heavy DB work."""

    # The exams, by normalized name: each counts one grade, its retake when one is marked, else
    # its latest sitting (`counted_grades`; plan todo 80).
    # The owner, 2026-11-23: "There is only one official midterm per semester for each course. The
    # second midterm is only if the student missed the first one", and "there should no averaging
    # any exam per course". Until todo 77 point 2 a rule had to be spelled one of eight ways to
    # count its latest grade, and "ΤΕΛΙΚΗ ΕΞΕΤΑΣΗ", "Τελικές Εξετάσεις" or two rules "Midterm 1"
    # and "Midterm 2" averaged a retake with the first sitting.
    exam_categories = frozenset({"midterm", "final"})
    # Participation observations ticked per day in Attendance, by normalized name (see
    # _normalize_category), with the default share of that day's Class Participation each one
    # takes, by severity (owner, 2026-10-13). A rule's `deduction_percent` overrides the default.
    # They are deductions, not weighted categories; what a day keeps is credit for being present.
    observation_default_percent = {
        "no participation": 60.0,
        "minor participation (mobile usage)": 40.0,
        "minor participation": 20.0,
    }
    participation_observations = set(observation_default_percent)
    # What a continuous-assessment rule never takes for want of a rule of its own: these are not
    # graded tasks (see `_calculate_final_grade_from_records`).
    not_continuous = frozenset({"participation", "attendance"} | participation_observations)

    @classmethod
    def counted_grades(cls, grades: Iterable[Any]) -> List[Any]:
        """Of the grades a rule takes, those that count: every grade that has a maximum, but of a
        Midterm and of a Final one sitting only. A course has one midterm and one final; a second
        sitting is for a student who missed the first, and replaces it, never averaged with it,
        whatever the grades are called (the owner, 2026-11-23).

        The sitting that counts is the retake when the teacher marked one (``is_retake``; plan
        todo 80, the owner, 2026-11-24: "After retake exam the first final exam should not count
        in grading and the retake exam replaces it"), whatever the dates; else the latest sitting.
        Among several of the same kind, the latest by the day the exam was taken (date_submitted),
        then the latest entry; an undated grade counts as the oldest."""
        kept: List[Any] = []
        latest: Dict[str, Any] = {}
        for grade in grades:
            if not getattr(grade, "max_grade", 0):
                continue
            kind = normalize_rule_category(getattr(grade, "category", None))
            if kind not in cls.exam_categories:
                kept.append(grade)
                continue
            current = latest.get(kind)
            if current is None or cls._sitting_order(grade) > cls._sitting_order(current):
                latest[kind] = grade
        return kept + list(latest.values())

    @staticmethod
    def _sitting_order(grade: Any) -> Tuple[bool, date, int]:
        """How an exam's sittings rank: a retake above any other, then by day, then by entry."""
        return (bool(getattr(grade, "is_retake", False)), grade.date_submitted or date.min, grade.id or 0)

    @classmethod
    def final_grade_ready(cls, course: Any, grades: Iterable[Any]) -> bool:
        """Whether the final grade is the course's figure where the pages show an average (plan todo 83).

        The owner, 2026-11-24: "should show averages if not exams grades published yet. otherwise,
        the real grades should populate", the Final Exam's grade deciding. True once the student's
        Final Exam is graded (the sitting that counts, under any spelling), or when the course's
        rules name no Final Exam (nothing to wait for); a course without rules waits for a Final
        Exam grade. Until then the pages show the plain average of the grades so far."""
        if any(normalize_rule_category(getattr(g, "category", None)) == "final" for g in cls.counted_grades(grades)):
            return True
        rules = [r for r in (getattr(course, "evaluation_rules", None) or []) if isinstance(r, dict)]
        return bool(rules) and not any(normalize_rule_category(r.get("category")) == "final" for r in rules)

    # Plan todo 80 (the owner, 2026-11-23): "in the second effort, iff the exam grade is under 50,
    # is considered a fail". The final exam only; a midterm retake only replaces the first sitting.
    retake_pass_mark = 50.0

    @classmethod
    def final_exam_retake(cls, grades: Iterable[Any]) -> Optional[Dict[str, Any]]:
        """The student's retake of the final exam, when it is the sitting that counts, or None.

        {"date", "percentage", "failed"}: the day it was taken (ISO text, or None when undated),
        its score in percent as shown (2 decimals), and whether it is under 50. The final grade is
        worked out as always; a retake under 50 only fails the course, as the ΜΙΕΕΚ absence limit
        does (the owner, 2026-11-23: the course failed, the grade still worked out and shown)."""
        final = next(
            (g for g in cls.counted_grades(grades) if normalize_rule_category(getattr(g, "category", None)) == "final"),
            None,
        )
        if final is None or not getattr(final, "is_retake", False):
            return None
        day = final.date_submitted
        if isinstance(day, datetime):
            day = day.date()
        percentage = round(final.grade / final.max_grade * 100, 2)
        return {
            "date": day.isoformat() if isinstance(day, date) else None,
            "percentage": percentage,
            "failed": percentage < cls.retake_pass_mark,
        }

    @staticmethod
    def grade_weight(grade: Any) -> float:
        """How many times a grade counts in the average of its category.

        The Weight box of Grades > Grade Entry ("Weight (multiplier)"; the server accepts 0
        to 3). A grade without a weight, or with 0, counts once:
        that is how the pages have always shown such a grade ("×1"), and a grade that is
        recorded and silently left out of the average would be worse than one that counts.
        """
        try:
            weight = float(getattr(grade, "weight", None) or 0)
        except (TypeError, ValueError):
            return 1.0
        return weight if weight > 0 else 1.0

    @classmethod
    def grade_mean(cls, grades: Iterable[Any]) -> Optional[float]:
        """The grades' own mean, in percent, where no rule takes them (the owner, 2026-11-23,
        plan todo 77 point 3): of ``counted_grades`` (a Midterm or Final by its latest sitting
        alone, as under rules), each as often as its Weight says. None without a grade that has
        a maximum."""
        kept = cls.counted_grades(grades)
        if not kept:
            return None

        # An exam counts once, as the Grading page saves it (its Weight box is closed): a Weight
        # stored on one by an import or the API does not make the exam count more.
        def weight(g: Any) -> float:
            exam = normalize_rule_category(getattr(g, "category", None)) in cls.exam_categories
            return 1.0 if exam else cls.grade_weight(g)

        total = sum(weight(g) for g in kept)
        return sum(g.grade / g.max_grade * 100 * weight(g) for g in kept) / total

    def __init__(self, db: Session) -> None:
        self.db = db
        (
            self.Student,
            self.Course,
            self.Grade,
            self.DailyPerformance,
            self.Attendance,
            self.CourseEnrollment,
        ) = import_names("models", "Student", "Course", "Grade", "DailyPerformance", "Attendance", "CourseEnrollment")

    # ----------------------------- Public API ---------------------------------
    def calculate_final_grade(self, student_id: int, course_id: int) -> Dict[str, Any]:
        get_by_id_or_404(self.db, self.Student, student_id)
        course = get_by_id_or_404(self.db, self.Course, course_id)

        # Use separate, simpler queries instead of complex joinedload to avoid lock contention
        grades = [
            g
            for g in self.db.query(self.Grade)
            .filter(
                self.Grade.student_id == student_id, self.Grade.course_id == course_id, self.Grade.deleted_at.is_(None)
            )
            .all()
        ]

        daily = [
            d
            for d in self.db.query(self.DailyPerformance)
            .filter(
                self.DailyPerformance.student_id == student_id,
                self.DailyPerformance.course_id == course_id,
                self.DailyPerformance.deleted_at.is_(None),
            )
            .all()
        ]

        attendance = [
            a
            for a in self.db.query(self.Attendance)
            .filter(
                self.Attendance.student_id == student_id,
                self.Attendance.course_id == course_id,
                self.Attendance.deleted_at.is_(None),
            )
            .all()
        ]

        result = self._calculate_final_grade_from_records(student_id, course, grades, daily, attendance)

        # ΜΙΕΕΚ absence rules: over the fail limit is flagged (the app never blocks grade entry);
        # over the Class Participation limit is already applied inside the final grade.
        absence_status = absence_limit_service.evaluate_records(course, attendance)
        result["absence_limit"] = absence_status
        result["attendance_insufficient"] = absence_status["attendance_insufficient"]
        # The periods by status, a Late among them, for the teacher's evaluation (plan todo 77):
        # also where the calculation stops before counting (no evaluation rules and no grade).
        result.setdefault("attendance", self._attendance_counts(attendance))
        result.setdefault("final_exam_retake", None)
        return result

    def get_student_all_courses_summary(self, student_id: int) -> Dict[str, Any]:
        # Fetch student without expensive joinedloads
        student = self.db.query(self.Student).filter(self.Student.id == student_id).first()

        if not student:
            get_by_id_or_404(self.db, self.Student, student_id)  # Raises 404
        assert student is not None

        # Try to fetch course enrollments first (most efficient)
        enrollments = (
            self.db.query(self.CourseEnrollment)
            .filter(self.CourseEnrollment.student_id == student_id, self.CourseEnrollment.deleted_at.is_(None))
            .all()
        )

        course_ids = {e.course_id for e in enrollments}

        # If no enrollments exist, fall back to finding courses from grades/attendance/daily performance
        if not course_ids:
            course_ids = {
                *(
                    g.course_id
                    for g in self.db.query(self.Grade.course_id)
                    .filter(self.Grade.student_id == student_id, self.Grade.deleted_at.is_(None))
                    .distinct()
                ),
                *(
                    d.course_id
                    for d in self.db.query(self.DailyPerformance.course_id)
                    .filter(self.DailyPerformance.student_id == student_id, self.DailyPerformance.deleted_at.is_(None))
                    .distinct()
                ),
                *(
                    a.course_id
                    for a in self.db.query(self.Attendance.course_id)
                    .filter(self.Attendance.student_id == student_id, self.Attendance.deleted_at.is_(None))
                    .distinct()
                ),
            }

        if not course_ids:
            # No data at all for this student
            return {
                "student": {
                    "id": student.id,
                    "name": f"{student.first_name} {student.last_name}",
                    "student_id": student.student_id,
                },
                "overall_gpa": 0,
                "total_credits": 0,
                "courses": [],
            }

        # Fetch courses in enrolled list only
        courses_dict: Dict[int, Any] = {
            c.id: c
            for c in self.db.query(self.Course)
            .filter(self.Course.id.in_(course_ids), self.Course.deleted_at.is_(None))
            .all()
        }

        # Fetch related data for enrolled courses only
        grades_by_course: Dict[int, List[Any]] = {}
        for grade in (
            self.db.query(self.Grade)
            .filter(
                self.Grade.student_id == student_id,
                self.Grade.course_id.in_(course_ids),
                self.Grade.deleted_at.is_(None),
            )
            .all()
        ):
            grades_by_course.setdefault(grade.course_id, []).append(grade)

        daily_by_course: Dict[int, List[Any]] = {}
        for daily in (
            self.db.query(self.DailyPerformance)
            .filter(
                self.DailyPerformance.student_id == student_id,
                self.DailyPerformance.course_id.in_(course_ids),
                self.DailyPerformance.deleted_at.is_(None),
            )
            .all()
        ):
            daily_by_course.setdefault(daily.course_id, []).append(daily)

        attendance_by_course: Dict[int, List[Any]] = {}
        for att in (
            self.db.query(self.Attendance)
            .filter(
                self.Attendance.student_id == student_id,
                self.Attendance.course_id.in_(course_ids),
                self.Attendance.deleted_at.is_(None),
            )
            .all()
        ):
            attendance_by_course.setdefault(att.course_id, []).append(att)

        summaries: List[StudentCourseSummary] = []
        overall_gpa = 0.0
        total_credits = 0

        for course_id in course_ids:
            course = courses_dict.get(course_id)
            if not course:
                continue

            data = self._calculate_final_grade_from_records(
                student_id,
                course,
                grades_by_course.get(course_id, []),
                daily_by_course.get(course_id, []),
                attendance_by_course.get(course_id, []),
            )
            if isinstance(data, dict) and data.get("error"):
                continue

            summaries.append(
                StudentCourseSummary(
                    course_code=course.course_code,
                    course_name=course.course_name,
                    credits=course.credits,
                    final_grade=data["final_grade"],
                    gpa=data["gpa"],
                    letter_grade=data["letter_grade"],
                    course_id=course.id,
                    final_grade_ready=bool(data.get("final_grade_ready")),
                )
            )
            overall_gpa += float(data["gpa"]) * int(course.credits or 0)
            total_credits += int(course.credits or 0)

        overall_gpa = overall_gpa / total_credits if total_credits > 0 else 0
        return {
            "student": {
                "id": student.id,
                "name": f"{student.first_name} {student.last_name}",
                "student_id": student.student_id,
            },
            "overall_gpa": round(overall_gpa, 2),
            "total_credits": total_credits,
            "courses": [summary.to_dict() for summary in summaries],
        }

    def get_dashboard_summary(self) -> Dict[str, Any]:
        """Return a small system-wide summary used by the UI/dashboard.

        This is intentionally lightweight for load-testing and health UIs: counts of
        students, courses and basic totals.
        """
        # Use simple count queries; models were resolved in __init__ via import_names
        inspector = cast(Inspector, inspect(self.db.get_bind()))
        tables = set(inspector.get_table_names())

        student_count = 0
        course_count = 0
        enrollment_count = 0
        grade_count = 0
        attendance_count = 0
        avg_grade = 0.0
        avg_attendance = 0.0

        if "students" in tables:
            student_count = self.db.query(self.Student).filter(self.Student.deleted_at.is_(None)).count()

        if "courses" in tables:
            course_count = self.db.query(self.Course).filter(self.Course.deleted_at.is_(None)).count()

        if "course_enrollments" in tables:
            enrollment_count = (
                self.db.query(self.CourseEnrollment).filter(self.CourseEnrollment.deleted_at.is_(None)).count()
            )

        if "grades" in tables:
            grade_count = self.db.query(self.Grade).filter(self.Grade.deleted_at.is_(None)).count()
            grade_pct: Any = case(
                (
                    self.Grade.max_grade.isnot(None) & (self.Grade.max_grade > 0),
                    (self.Grade.grade / self.Grade.max_grade) * 100,
                ),
                else_=None,
            )
            avg_grade_val = self.db.query(func.avg(grade_pct)).filter(self.Grade.deleted_at.is_(None)).scalar()
            avg_grade = float(avg_grade_val or 0.0)

        if "attendances" in tables:
            attendance_count = self.db.query(self.Attendance).filter(self.Attendance.deleted_at.is_(None)).count()
            attended_count = (
                self.db.query(self.Attendance)
                .filter(
                    self.Attendance.deleted_at.is_(None),
                    func.lower(self.Attendance.status).in_(sorted(absence_limit_service.ATTENDED_STATUSES)),
                )
                .count()
            )
            avg_attendance = (attended_count / attendance_count * 100) if attendance_count > 0 else 0.0

        return {
            "total_students": int(student_count),
            "total_courses": int(course_count),
            "enrollments": int(enrollment_count),
            "total_grades": int(grade_count),
            "total_attendance_records": int(attendance_count),
            "average_grade": round(avg_grade, 2),
            "average_attendance": round(avg_attendance, 2),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    # ----------------------------- Helpers ------------------------------------
    @staticmethod
    def get_letter_grade(percentage: float) -> str:
        """Convert percentage to letter grade using standard academic scale.

        Scale: A+ (97-100), A (93-96), A- (90-92), B+ (87-89), B (83-86),
               B- (80-82), C+ (77-79), C (65-76), D (50-64), F (0-49)

        Pass mark is 50%, matching the Greek 0-20 scale's pass threshold
        (10/20) used elsewhere in this system.
        """
        if percentage >= 97:
            return "A+"
        if percentage >= 93:
            return "A"
        if percentage >= 90:
            return "A-"
        if percentage >= 87:
            return "B+"
        if percentage >= 83:
            return "B"
        if percentage >= 80:
            return "B-"
        if percentage >= 77:
            return "C+"
        if percentage >= 65:
            return "C"
        if percentage >= 50:
            return "D"
        return "F"

    # Statuses that count as attended, as on every page: Present and Late (the owner,
    # 2026-11-23). Until then Excused counted here and Late did not.
    _ATTENDED_STATUSES = absence_limit_service.ATTENDED_STATUSES

    def get_student_predictive_analytics(
        self,
        student_id: int,
        course_id: Optional[int] = None,
        weeks_ahead: int = 4,
        include_attendance: bool = True,
        include_risk_assessment: bool = True,
        include_final_grade: bool = True,
    ) -> Dict[str, Any]:
        """Predictions for one student (Student Profile), from their grades and attendance.

        Grades are percentages of max_grade, ordered by submission date (else assignment date);
        grades without either date cannot be placed on a timeline and are left out. The scoring
        is PredictiveAnalyticsService; its text fields are codes the frontend translates. A
        section without enough data (fewer than 3 dated grades or attendance records) is empty
        and named in ``insufficient_data``.
        """
        from backend.services.predictive_analytics_service import PredictiveAnalyticsService

        student = self.db.query(self.Student).filter(self.Student.id == student_id).first()
        if not student:
            get_by_id_or_404(self.db, self.Student, student_id)

        grade_query = self.db.query(self.Grade).filter(
            self.Grade.student_id == student_id, self.Grade.deleted_at.is_(None)
        )
        attendance_query = self.db.query(self.Attendance).filter(
            self.Attendance.student_id == student_id, self.Attendance.deleted_at.is_(None)
        )
        if course_id:
            grade_query = grade_query.filter(self.Grade.course_id == course_id)
            attendance_query = attendance_query.filter(self.Attendance.course_id == course_id)

        dated_grades: List[tuple[datetime, float]] = []
        for grade in grade_query.all():
            day = grade.date_submitted or grade.date_assigned
            if day and grade.max_grade:
                pct = float(grade.grade) / float(grade.max_grade) * 100
                dated_grades.append((datetime(day.year, day.month, day.day), pct))
        dated_grades.sort(key=lambda item: item[0])
        percentages = [pct for _, pct in dated_grades]

        attendance = [
            (datetime(r.date.year, r.date.month, r.date.day), str(r.status).lower() in self._ATTENDED_STATUSES)
            for r in attendance_query.all()
            if r.date
        ]

        predictor = PredictiveAnalyticsService()
        insufficient: List[str] = []
        result: Dict[str, Any] = {
            "student_id": student_id,
            "course_id": course_id,
            "grade_trend": None,
            "grade_predictions": [],
            "attendance_predictions": [],
            "risk_assessment": None,
            "final_grade_projection": None,
            "insufficient_data": insufficient,
        }

        trend = predictor.predict_grade_trend(dated_grades, weeks_ahead=weeks_ahead)
        if "error" in trend:
            insufficient.append("grades")
        else:
            result["grade_trend"] = trend["current_trend"]
            result["grade_predictions"] = trend["predictions"]

        attendance_rate: Optional[float] = None
        if include_attendance or include_risk_assessment:
            pattern = predictor.predict_attendance_pattern(attendance)
            if "error" in pattern:
                insufficient.append("attendance")
            else:
                attendance_rate = pattern["overall_attendance_rate"]
                if include_attendance:
                    result["attendance_predictions"] = pattern["attendance_by_day"]

        if include_risk_assessment and percentages and attendance_rate is not None:
            risk = predictor.assess_student_risk(percentages[-10:], attendance_rate, result["grade_trend"] or "stable")
            if risk.get("risk_level") in {"low", "medium", "high"}:
                result["risk_assessment"] = risk

        if include_final_grade and percentages:
            final = predictor.predict_final_grade(percentages, {}, missing_assessments=0)
            if "error" not in final:
                result["final_grade_projection"] = final

        return result

    def _calculate_final_grade_from_records(
        self,
        student_id: int,
        course: Any,
        grades: Optional[List[Any]],
        daily_performance: Optional[List[Any]],
        attendance: Optional[List[Any]],
    ) -> Dict[str, Any]:
        evaluation_rules = course.evaluation_rules or []
        grades = grades or []
        daily_performance = daily_performance or []
        attendance = attendance or []

        # Where no rule takes a grade (the course has none, or none matches the student's
        # grades), the final grade is the grades' own mean (the owner, 2026-11-23, plan todo 77
        # point 3: one final grade everywhere). Without rules and without a grade there is none.
        grade_mean = self.grade_mean(grades)
        if not evaluation_rules and grade_mean is None:
            return {"error": "No evaluation rules defined for this course"}

        category_scores: Dict[str, float] = {}
        category_details: Dict[str, Any] = {}

        _normalize_category = normalize_rule_category

        def _as_float(value: Any) -> float:
            try:
                return float(value or 0)
            except (TypeError, ValueError):
                return 0.0

        # Participation observations leave the weighted rules. Sub-weights saved under the old
        # layout (weight carved out of Class Participation) go back into Class Participation.
        weighted_rules: List[Dict[str, Any]] = []
        observation_rules: List[Dict[str, Any]] = []
        returned_weight = 0.0
        for rule in evaluation_rules:
            if _normalize_category(rule.get("category")) in self.participation_observations:
                observation_rules.append(rule)
                returned_weight += max(0.0, _as_float(rule.get("weight")))
            else:
                weighted_rules.append(dict(rule))
        participation_rule = next(
            (r for r in weighted_rules if _normalize_category(r.get("category")) == "participation"), None
        )
        if participation_rule is not None and returned_weight > 0:
            participation_rule["weight"] = _as_float(participation_rule.get("weight")) + returned_weight
        evaluation_rules = weighted_rules

        # ΜΙΕΕΚ: over the Class Participation absence limit (10%), the whole Class Participation
        # share counts as 0 (and there is nothing left to deduct observations from).
        participation_forfeited = bool(
            absence_limit_service.evaluate_records(course, attendance)["participation_forfeited"]
        )

        # Which rule takes a grade or a rating (the owner, 2026-11-23): the rules of its own kind;
        # else, in a course with a continuous-assessment rule, that rule ("homework, any other
        # exercise or any other assessment and task during the lesson's period, belongs to
        # «Συνεχής Αξιολόγηση»"), except Class Participation, attendance and the observations. A
        # Midterm or Final with no rule of its own goes there too, as its one grade: "there is no
        # course without a midterm exam and a final exam in MIEEK", so where the rules have none
        # it is part of continuous assessment (the templates' «Συνεχής Αξιολόγηση (Εκπόνηση
        # εργασιών στο σπίτι και Ενδιάμεση Εξέταση)», which the course importer saves as
        # "Continuous Assessment"). A grade without a category counts nowhere, as before: it could
        # be anything. Until then a grade no rule named counted nowhere: a quiz or a project in a
        # template course, or a grade filed under the Grading page's «Συνεχής Αξιολόγηση» option
        # where the rule read as homework.
        rule_kinds = {
            _normalize_category(r.get("category"))
            for r in evaluation_rules
            if r.get("category") and _as_float(r.get("weight")) > 0
        }

        def _taken_by(name: Any) -> Optional[str]:
            kind = _normalize_category(name)
            if not kind:
                return None
            # A rule of the grade's own kind first: a course's Midterm rule keeps the midterm.
            if kind in rule_kinds:
                return kind
            if "continuous" not in rule_kinds or kind in self.not_continuous:
                return None
            return "continuous"

        grades_taken = [(g, _taken_by(getattr(g, "category", None))) for g in grades]
        ratings_taken = [(p, _taken_by(getattr(p, "category", None))) for p in daily_performance]

        for rule in evaluation_rules:
            category = rule.get("category")
            weight = float(rule.get("weight", 0))
            include_daily = rule.get("includeDailyPerformance", True)
            daily_multiplier = float(rule.get("dailyPerformanceMultiplier", 1.0))

            if not category or weight <= 0:
                continue

            if participation_forfeited and _normalize_category(category) == "participation":
                category_scores[category] = 0.0
                category_details[category] = {
                    "average": 0.0,
                    "weight": weight,
                    "contribution": 0.0,
                    "total_items": 0,
                    "forfeited": True,
                }
                continue

            weighted_sum = 0.0
            total_item_weight = 0.0
            item_count = 0

            # The grades this rule takes, an exam by its latest sitting alone (`counted_grades`; a
            # grade without the date counts as the oldest. Until November 2026 that stand-in date
            # was the text "1970-01-01", and an exam with one dated and one undated grade raised
            # TypeError, comparing a date with a str).
            rule_norm = _normalize_category(category)
            category_grades = self.counted_grades(g for g, taken in grades_taken if taken == rule_norm)

            for grade in category_grades:
                if getattr(grade, "max_grade", 0):
                    grade_pct = (grade.grade / grade.max_grade) * 100
                    # The grade's own Weight: one with weight 2 counts like two grades of its
                    # category. Until November 2026 the box was stored and never read, and
                    # every grade counted once.
                    item_weight = self.grade_weight(grade)
                    weighted_sum += grade_pct * item_weight
                    total_item_weight += item_weight
                    item_count += 1

            if include_daily:
                for perf in (p for p, taken in ratings_taken if taken == rule_norm):
                    if getattr(perf, "max_score", 0):
                        daily_pct = (perf.score / perf.max_score) * 100
                        weighted_sum += daily_pct * daily_multiplier
                        total_item_weight += daily_multiplier
                        item_count += 1

            # The Attendance rule, under any spelling ("Παρουσίες", "ΠΑΡΟΥΣΙΑ"; the owner,
            # 2026-11-23): until then only "attendance" or "παρουσία" counted the periods.
            if rule_norm == "attendance":
                if attendance:
                    # Present and Late are attended (the owner, 2026-11-23); Absent and Excused
                    # are absences, as the ΜΙΕΕΚ limit counts them. Until then Late lost here.
                    total = len(attendance)
                    present = len([a for a in attendance if absence_limit_service.is_attended(a.status)])
                    att_pct = (present / total * 100) if total > 0 else 0
                    weighted_sum += att_pct
                    total_item_weight += 1.0
                    item_count += 1

            if total_item_weight > 0:
                avg = weighted_sum / total_item_weight
                category_scores[category] = avg
                category_details[category] = {
                    "average": avg,
                    "weight": weight,
                    "contribution": (avg * weight) / 100,
                    # How many grades and ratings the average is made of (not the sum of
                    # their weights, which this used to be).
                    "total_items": item_count,
                }

        # Calculate final grade based on COMPLETED work only
        # Normalize by total weight of categories with actual grades/data
        final_grade = 0.0
        total_weight_used = 0.0
        for rule in evaluation_rules:
            category = rule.get("category")
            weight = float(rule.get("weight", 0))
            if category in category_scores and weight > 0:
                final_grade += (category_scores[category] * weight) / 100
                total_weight_used += weight

        # Normalize to 100% scale based on completed work
        # If only 40% of work is done, scale up to show current performance out of 100%
        normalization = 100.0 / total_weight_used if 0 < total_weight_used < 100 else 1.0
        final_grade *= normalization

        # Each attended day is worth an equal slice of Class Participation. The most severe
        # observation ticked on a day takes its percentage of that slice; the rest of the slice
        # stays as credit for being present. Never more than Class Participation earned (its whole
        # share when the student has no participation ratings yet).
        observations: Dict[str, Dict[str, float]] = {}
        participation_deduction = 0.0
        # The share of Class Participation the student keeps, in percent, for the Analytics page
        # (plan todo 75 stage 3): what the ratings earned, or the whole share for being present
        # while there are none (as the cap below counts it), less what the observations took.
        # Worked out from the ticks themselves, never from what the final grade could absorb (with
        # nothing else graded the final grade has nothing to take them from). For a rated student
        # it is exactly the share the final grade counts. None without a participation rule, when
        # it is forfeited, or with nothing to count.
        participation_share: Optional[Dict[str, Any]] = None
        if participation_rule is not None and not participation_forfeited:
            percents = dict(self.observation_default_percent)
            for rule in observation_rules:
                if rule.get("deduction_percent") is not None:
                    percents[_normalize_category(rule.get("category"))] = min(
                        100.0, max(0.0, _as_float(rule.get("deduction_percent")))
                    )
            observations = {name: {"ticks": 0, "percent": pct} for name, pct in percents.items()}
            day_loss: Dict[Any, float] = {}
            for perf in daily_performance:
                perf_norm = _normalize_category(getattr(perf, "category", None))
                if perf_norm in percents:
                    observations[perf_norm]["ticks"] += 1
                    day_loss[perf.date] = max(day_loss.get(perf.date, 0.0), percents[perf_norm])
            attended_days = {a.date for a in attendance if str(a.status).lower() in {"present", "late"}} | set(day_loss)
            participation_weight = _as_float(participation_rule.get("weight"))
            participation_category = participation_rule["category"]
            rated = participation_category in category_scores
            requested = sum(day_loss.values()) / 100 * participation_weight / len(attended_days) if day_loss else 0.0
            if requested > 0:
                if rated:
                    requested *= normalization
                    earned = category_scores[participation_category] * participation_weight / 100 * normalization
                else:
                    earned = participation_weight
                participation_deduction = max(0.0, min(requested, earned, final_grade))
                final_grade -= participation_deduction
                if participation_category in category_details:
                    category_details[participation_category]["deduction"] = round(participation_deduction, 2)
            if participation_weight > 0 and (rated or attended_days):
                kept = category_scores[participation_category] if rated else 100.0
                # The days' losses, in percent of the share: each attended day is an equal slice.
                lost = sum(day_loss.values()) / len(attended_days) if day_loss else 0.0
                participation_share = {
                    "category": participation_category,
                    "weight": participation_weight,
                    "rated": rated,
                    "percent": max(0.0, kept - lost),
                }

        # No rule took any of the student's grades, or the course has none: the grades' own mean,
        # less the absence penalty below as with rules (the owner: "a student whose grades match
        # no rule"). Whatever else a rule counted (the attendance records, a rating, a forfeited
        # Class Participation share) does not make the grade then; until todo 77 point 3's review
        # it did, and one Present record turned a homework of 40 into 100. Until todo 77 point 3
        # this was 0 here (no rule matched) or an error (no rules), while Analytics and the grade
        # sheets showed the plain mean.
        grade_basis = "rules"
        if grade_mean is not None and not any(
            taken is not None for g, taken in grades_taken if getattr(g, "max_grade", 0)
        ):
            final_grade = grade_mean
            grade_basis = "average"
            total_weight_used = 0.0
            category_details = {}
            participation_deduction = 0.0
            participation_share = None

        penalty_per_absence = float(getattr(course, "absence_penalty", 0.0) or 0.0)
        unexcused_absences = 0
        absence_deduction = 0.0
        # What the final grade really lost to the penalty: it never goes below 0, so a penalty
        # larger than the grade takes only the grade. Reported for the grade sheets; the grade
        # itself is computed as before.
        absence_deduction_applied = 0.0

        if penalty_per_absence > 0:
            unexcused_absences = len([a for a in attendance if str(a.status).lower() == "absent"])
            absence_deduction = penalty_per_absence * unexcused_absences
            absence_deduction_applied = min(absence_deduction, max(0.0, final_grade))
            final_grade = max(0.0, final_grade - absence_deduction)

        gpa = (final_grade / 100.0) * 4.0 if final_grade > 0 else 0
        greek_grade = (final_grade / 100.0) * 20.0 if final_grade > 0 else 0

        return {
            "student_id": student_id,
            "course_id": course.id,
            "course_name": course.course_name,
            "final_grade": round(final_grade, 2),
            "percentage": round(final_grade, 2),
            "gpa": round(gpa, 2),
            "greek_grade": round(greek_grade, 2),
            "letter_grade": self.get_letter_grade(final_grade),
            "total_weight_used": total_weight_used,
            # "rules": the evaluation rules' categories; "average": the grades' own mean, where no
            # rule takes a grade (plan todo 77 point 3).
            "grade_basis": grade_basis,
            "category_breakdown": category_details,
            "absence_penalty": penalty_per_absence,
            "unexcused_absences": unexcused_absences,
            "absence_deduction": round(absence_deduction, 2),
            "absence_deduction_applied": round(absence_deduction_applied, 2),
            # A Class Participation share lost to absences: only where a participation rule makes
            # the grade (a course without one, or a mean of the grades, has no share to lose).
            "participation_forfeited": participation_forfeited and participation_rule is not None and grade_basis == "rules",
            "participation_deduction": round(participation_deduction, 2),
            "participation_observations": observations,
            "participation_share": participation_share,
            # The periods recorded, by status, for the teacher's evaluation (the Lates are not
            # absences but are shown: plan todo 77).
            "attendance": self._attendance_counts(attendance),
            # A retake of the final exam (plan todo 80): {"date", "percentage", "failed"}, or None.
            # Under 50 it fails the course whatever final_grade says, which stays as worked out.
            "final_exam_retake": self.final_exam_retake(grades),
            # Plan todo 83: whether the pages that show an average show this final grade instead.
            "final_grade_ready": self.final_grade_ready(course, grades),
        }

    @staticmethod
    def _attendance_counts(attendance: Iterable[Any]) -> Dict[str, int]:
        counts = {"present": 0, "late": 0, "absent": 0, "excused": 0}
        for record in attendance:
            status = str(getattr(record, "status", "") or "").strip().lower()
            if status in counts:
                counts[status] += 1
        counts["recorded"] = sum(counts.values())
        return counts

    # ----------------------------- Cache Invalidation ---------------------------------
    def invalidate_cache_for_student(self, student_id: int, course_id: Optional[int] = None) -> None:
        """Invalidate analytics cache when student data changes.

        Args:
            student_id: Student ID
            course_id: Optional specific course ID (if None, invalidates all courses)
        """
        cache = get_cache_manager()

        if course_id:
            # Specific course invalidation
            cache.invalidate_student_cache(student_id)
            cache.invalidate_course_cache(course_id)
        else:
            # Full student invalidation
            cache.invalidate_student_cache(student_id)

        logger.debug("Invalidated analytics cache: student_id=%d, course_id=%s", student_id, course_id)

    @staticmethod
    def clear_all_cache() -> None:
        """Clear all analytics cache (admin operation only)."""
        cache = get_cache_manager()
        cache.delete_pattern("analytics:*")
        logger.info("Cleared all analytics cache")
