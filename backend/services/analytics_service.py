from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session, joinedload

from backend.db_utils import get_by_id_or_404
from backend.import_resolver import import_names


@dataclass
class StudentCourseSummary:
    course_code: str
    course_name: str
    credits: int
    final_grade: float
    gpa: float
    letter_grade: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class AnalyticsService:
    """Encapsulates analytics-related business logic and heavy DB work."""

    exam_categories = {
        "midterm",
        "midterm exam",
        "final exam",
        "final",
        "ενδιάμεση",
        "ενδιάμεση εξέταση",
        "τελική εξέταση",
        "τελική",
    }

    def __init__(self, db: Session) -> None:
        self.db = db
        (
            self.Student,
            self.Course,
            self.Grade,
            self.DailyPerformance,
            self.Attendance,
            self.CourseEnrollment,
        ) = import_names(
            "models", "Student", "Course", "Grade", "DailyPerformance", "Attendance", "CourseEnrollment"
        )

    # ----------------------------- Public API ---------------------------------
    def calculate_final_grade(self, student_id: int, course_id: int) -> Dict[str, Any]:
        get_by_id_or_404(self.db, self.Student, student_id)
        course = get_by_id_or_404(self.db, self.Course, course_id)

        # Use separate, simpler queries instead of complex joinedload to avoid lock contention
        grades = [
            g for g in self.db.query(self.Grade)
            .filter(self.Grade.student_id == student_id, self.Grade.course_id == course_id, self.Grade.deleted_at.is_(None))
            .all()
        ]
        
        daily = [
            d for d in self.db.query(self.DailyPerformance)
            .filter(self.DailyPerformance.student_id == student_id, self.DailyPerformance.course_id == course_id, self.DailyPerformance.deleted_at.is_(None))
            .all()
        ]
        
        attendance = [
            a for a in self.db.query(self.Attendance)
            .filter(self.Attendance.student_id == student_id, self.Attendance.course_id == course_id, self.Attendance.deleted_at.is_(None))
            .all()
        ]

        return self._calculate_final_grade_from_records(student_id, course, grades, daily, attendance)

    def get_student_all_courses_summary(self, student_id: int) -> Dict[str, Any]:
        # Fetch student without expensive joinedloads
        student = (
            self.db.query(self.Student)
            .filter(self.Student.id == student_id)
            .first()
        )

        if not student:
            get_by_id_or_404(self.db, self.Student, student_id)  # Raises 404
        assert student is not None

        # Try to fetch course enrollments first (most efficient)
        enrollments = (
            self.db.query(self.CourseEnrollment)
            .filter(
                self.CourseEnrollment.student_id == student_id,
                self.CourseEnrollment.deleted_at.is_(None)
            )
            .all()
        )
        
        course_ids = {e.course_id for e in enrollments}
        
        # If no enrollments exist, fall back to finding courses from grades/attendance/daily performance
        if not course_ids:
            course_ids = {
                *(g.course_id for g in self.db.query(self.Grade.course_id).filter(
                    self.Grade.student_id == student_id, 
                    self.Grade.deleted_at.is_(None)
                ).distinct()),
                *(d.course_id for d in self.db.query(self.DailyPerformance.course_id).filter(
                    self.DailyPerformance.student_id == student_id,
                    self.DailyPerformance.deleted_at.is_(None)
                ).distinct()),
                *(a.course_id for a in self.db.query(self.Attendance.course_id).filter(
                    self.Attendance.student_id == student_id,
                    self.Attendance.deleted_at.is_(None)
                ).distinct()),
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
            .filter(
                self.Course.id.in_(course_ids),
                self.Course.deleted_at.is_(None)
            )
            .all()
        }

        # Fetch related data for enrolled courses only  
        grades_by_course: Dict[int, List[Any]] = {}
        for grade in (
            self.db.query(self.Grade)
            .filter(
                self.Grade.student_id == student_id,
                self.Grade.course_id.in_(course_ids),
                self.Grade.deleted_at.is_(None)
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
                self.DailyPerformance.deleted_at.is_(None)
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
                self.Attendance.deleted_at.is_(None)
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

    def get_student_summary(self, student_id: int) -> Dict[str, Any]:
        # Single query with eager loading for all related data
        student = (
            self.db.query(self.Student)
            .options(
                joinedload(self.Student.grades),
                joinedload(self.Student.attendances),
            )
            .filter(self.Student.id == student_id)
            .first()
        )

        if not student:
            get_by_id_or_404(self.db, self.Student, student_id)  # Raises 404
        assert student is not None

        # Calculate from loaded relationships (no additional queries)
        attendance_records = [a for a in student.attendances if a.deleted_at is None]
        total_att = len(attendance_records)
        present = len([a for a in attendance_records if a.status == "Present"])
        attendance_rate = (present / total_att * 100) if total_att > 0 else 0

        grades = [g for g in student.grades if g.deleted_at is None]
        avg_grade = sum((g.grade / g.max_grade * 100) for g in grades) / len(grades) if grades else 0

        return {
            "student": {
                "id": student.id,
                "first_name": student.first_name,
                "last_name": student.last_name,
                "email": student.email,
                "student_id": student.student_id,
            },
            "attendance_rate": round(attendance_rate, 2),
            "total_classes": total_att,
            "average_grade": round(avg_grade, 2),
            "total_assignments": len(grades),
        }

    # ----------------------------- Helpers ------------------------------------
    @staticmethod
    def get_letter_grade(percentage: float) -> str:
        if percentage >= 90:
            return "A"
        if percentage >= 80:
            return "B"
        if percentage >= 70:
            return "C"
        if percentage >= 60:
            return "D"
        return "F"

    def _calculate_final_grade_from_records(
        self,
        student_id: int,
        course: Any,
        grades: Optional[List[Any]],
        daily_performance: Optional[List[Any]],
        attendance: Optional[List[Any]],
    ) -> Dict[str, Any]:
        evaluation_rules = course.evaluation_rules or []
        if not evaluation_rules:
            return {"error": "No evaluation rules defined for this course"}

        grades = grades or []
        daily_performance = daily_performance or []
        attendance = attendance or []

        category_scores: Dict[str, float] = {}
        category_details: Dict[str, Any] = {}

        def _normalize_category(name: Optional[str]) -> str:
            """Normalize category names to improve matching between evaluation rules and recorded items.

            Handles case-insensitive comparisons, common synonyms, and Greek equivalents.
            """
            if not name:
                return ""
            n = str(name).strip().lower()
            # Remove common punctuation
            for ch in [":", ";", ",", ".", "-", "_", "(", ")"]:
                n = n.replace(ch, " ")
            n = " ".join(n.split())  # collapse whitespace

            # Synonyms map (both EN and EL)
            synonyms = {
                # Exams
                "midterm exam": "midterm",
                "midterm": "midterm",
                "intermediate": "midterm",
                "ενδιάμεση": "midterm",
                "ενδιάμεση εξέταση": "midterm",
                "ενδιάμεση εξεταση": "midterm",
                "final exam": "final",
                "final": "final",
                "τελική": "final",
                "τελική εξέταση": "final",
                "τελικη": "final",
                "τελικη εξεταση": "final",
                # Coursework
                "homework": "homework",
                "assignment": "homework",
                "assignments": "homework",
                "εργασία": "homework",
                "εργασια": "homework",
                "άσκηση": "homework",
                "ασκηση": "homework",
                "project": "project",
                "πρότζεκτ": "project",
                "προτζεκτ": "project",
                "lab": "lab",
                "lab work": "lab",
                "εργαστήριο": "lab",
                "εργαστηριο": "lab",
                "quiz": "quiz",
                "κουίζ": "quiz",
                "κουιζ": "quiz",
                # Participation / attendance
                "class participation": "participation",
                "participation": "participation",
                "συμμετοχή": "participation",
                "συμμετοχη": "participation",
                "attendance": "attendance",
                "παρουσία": "attendance",
                "παρουσια": "attendance",
            }

            # Direct map
            if n in synonyms:
                return synonyms[n]

            # Heuristic contains-based mapping
            contains_map = {
                "midterm": ["midterm", "ενδιάμεση", "ενδιαμεση"],
                "final": ["final", "τελική", "τελικη"],
                "homework": ["homework", "assignment", "εργασ", "άσκη", "ασκη"],
                "project": ["project", "πρότζεκ", "προτζεκ"],
                "lab": ["lab", "εργαστηρ"],
                "quiz": ["quiz", "κουιζ", "κουίζ", "τεστ"],
                "participation": ["participation", "συμμετο"],
                "attendance": ["attendance", "παρουσ"],
            }
            for key, needles in contains_map.items():
                if any(needle in n for needle in needles):
                    return key
            return n

        for rule in evaluation_rules:
            category = rule.get("category")
            weight = float(rule.get("weight", 0))
            include_daily = rule.get("includeDailyPerformance", True)
            daily_multiplier = float(rule.get("dailyPerformanceMultiplier", 1.0))

            if not category or weight <= 0:
                continue

            weighted_sum = 0.0
            total_item_weight = 0.0

            category_lower = (category or "").lower()
            # Match grades to this rule category using normalized names
            rule_norm = _normalize_category(category)
            category_grades = [
                gr
                for gr in grades
                if _normalize_category(getattr(gr, "category", None)) == rule_norm
            ]

            if category_lower in self.exam_categories and category_grades:
                category_grades = sorted(
                    category_grades,
                    key=lambda g: (g.date_submitted or "1970-01-01", g.id),
                    reverse=True,
                )[:1]

            for grade in category_grades:
                if getattr(grade, "max_grade", 0):
                    grade_pct = (grade.grade / grade.max_grade) * 100
                    weighted_sum += grade_pct
                    total_item_weight += 1.0

            if include_daily:
                for perf in (
                    p for p in daily_performance if _normalize_category(getattr(p, "category", None)) == rule_norm
                ):
                    if getattr(perf, "max_score", 0):
                        daily_pct = (perf.score / perf.max_score) * 100
                        weighted_sum += daily_pct * daily_multiplier
                        total_item_weight += daily_multiplier

            if category_lower in {"attendance", "παρουσία"}:
                if attendance:
                    total = len(attendance)
                    present = len([a for a in attendance if str(a.status).lower() == "present"])
                    att_pct = (present / total * 100) if total > 0 else 0
                    weighted_sum += att_pct
                    total_item_weight += 1.0

            if total_item_weight > 0:
                avg = weighted_sum / total_item_weight
                category_scores[category] = avg
                category_details[category] = {
                    "average": avg,
                    "weight": weight,
                    "contribution": (avg * weight) / 100,
                    "total_items": int(total_item_weight),
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
        if total_weight_used > 0 and total_weight_used < 100:
            final_grade = (final_grade / total_weight_used) * 100

        penalty_per_absence = float(getattr(course, "absence_penalty", 0.0) or 0.0)
        unexcused_absences = 0
        absence_deduction = 0.0

        if penalty_per_absence > 0:
            unexcused_absences = len([a for a in attendance if str(a.status).lower() == "absent"])
            absence_deduction = penalty_per_absence * unexcused_absences
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
            "category_breakdown": category_details,
            "absence_penalty": penalty_per_absence,
            "unexcused_absences": unexcused_absences,
            "absence_deduction": round(absence_deduction, 2),
        }
