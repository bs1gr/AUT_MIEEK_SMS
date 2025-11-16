from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

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
        ) = import_names(
            "models", "Student", "Course", "Grade", "DailyPerformance", "Attendance"
        )

    # ----------------------------- Public API ---------------------------------
    def calculate_final_grade(self, student_id: int, course_id: int) -> Dict[str, Any]:
        get_by_id_or_404(self.db, self.Student, student_id)
        course = get_by_id_or_404(self.db, self.Course, course_id)

        grades = (
            self.db.query(self.Grade)
            .filter(
                self.Grade.student_id == student_id,
                self.Grade.course_id == course_id,
                self.Grade.deleted_at.is_(None),
            )
            .all()
        )
        daily = (
            self.db.query(self.DailyPerformance)
            .filter(
                self.DailyPerformance.student_id == student_id,
                self.DailyPerformance.course_id == course_id,
                self.DailyPerformance.deleted_at.is_(None),
            )
            .all()
        )
        attendance = (
            self.db.query(self.Attendance)
            .filter(
                self.Attendance.student_id == student_id,
                self.Attendance.course_id == course_id,
                self.Attendance.deleted_at.is_(None),
            )
            .all()
        )

        return self._calculate_final_grade_from_records(student_id, course, grades, daily, attendance)

    def get_student_all_courses_summary(self, student_id: int) -> Dict[str, Any]:
        student = get_by_id_or_404(self.db, self.Student, student_id)

        grade_courses = (
            self.db.query(self.Grade.course_id)
            .filter(self.Grade.student_id == student_id, self.Grade.deleted_at.is_(None))
            .distinct()
        )
        daily_courses = (
            self.db.query(self.DailyPerformance.course_id)
            .filter(
                self.DailyPerformance.student_id == student_id,
                self.DailyPerformance.deleted_at.is_(None),
            )
            .distinct()
        )
        attendance_courses = (
            self.db.query(self.Attendance.course_id)
            .filter(
                self.Attendance.student_id == student_id,
                self.Attendance.deleted_at.is_(None),
            )
            .distinct()
        )
        course_ids = {
            *(cid for (cid,) in grade_courses),
            *(cid for (cid,) in daily_courses),
            *(cid for (cid,) in attendance_courses),
        }

        courses_dict: Dict[int, Any] = {}
        if course_ids:
            courses = (
                self.db.query(self.Course)
                .filter(self.Course.id.in_(course_ids), self.Course.deleted_at.is_(None))
                .all()
            )
            courses_dict = {c.id: c for c in courses}

        grades_by_course: Dict[int, List[Any]] = {}
        daily_by_course: Dict[int, List[Any]] = {}
        attendance_by_course: Dict[int, List[Any]] = {}

        if course_ids:
            course_id_list = list(course_ids)

            grade_rows = (
                self.db.query(self.Grade)
                .filter(
                    self.Grade.student_id == student_id,
                    self.Grade.course_id.in_(course_id_list),
                    self.Grade.deleted_at.is_(None),
                )
                .all()
            )
            for item in grade_rows:
                grades_by_course.setdefault(item.course_id, []).append(item)

            daily_rows = (
                self.db.query(self.DailyPerformance)
                .filter(
                    self.DailyPerformance.student_id == student_id,
                    self.DailyPerformance.course_id.in_(course_id_list),
                    self.DailyPerformance.deleted_at.is_(None),
                )
                .all()
            )
            for item in daily_rows:
                daily_by_course.setdefault(item.course_id, []).append(item)

            attendance_rows = (
                self.db.query(self.Attendance)
                .filter(
                    self.Attendance.student_id == student_id,
                    self.Attendance.course_id.in_(course_id_list),
                    self.Attendance.deleted_at.is_(None),
                )
                .all()
            )
            for item in attendance_rows:
                attendance_by_course.setdefault(item.course_id, []).append(item)

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
        student = get_by_id_or_404(self.db, self.Student, student_id)

        total_att = (
            self.db.query(self.Attendance)
            .filter(self.Attendance.student_id == student_id, self.Attendance.deleted_at.is_(None))
            .count()
        )
        present = (
            self.db.query(self.Attendance)
            .filter(
                self.Attendance.student_id == student_id,
                self.Attendance.status == "Present",
                self.Attendance.deleted_at.is_(None),
            )
            .count()
        )
        attendance_rate = (present / total_att * 100) if total_att > 0 else 0

        grades = (
            self.db.query(self.Grade)
            .filter(self.Grade.student_id == student_id, self.Grade.deleted_at.is_(None))
            .all()
        )
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

        for rule in evaluation_rules:
            category = rule.get("category")
            weight = float(rule.get("weight", 0))
            include_daily = rule.get("includeDailyPerformance", True)
            daily_multiplier = float(rule.get("dailyPerformanceMultiplier", 1.0))

            if not category or weight <= 0:
                continue

            weighted_sum = 0.0
            total_item_weight = 0.0

            category_lower = category.lower()
            category_grades = [gr for gr in grades if gr.category == category]

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
                for perf in (p for p in daily_performance if p.category == category):
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

        final_grade = 0.0
        total_weight_used = 0.0
        for rule in evaluation_rules:
            category = rule.get("category")
            weight = float(rule.get("weight", 0))
            if category in category_scores and weight > 0:
                final_grade += (category_scores[category] * weight) / 100
                total_weight_used += weight

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
