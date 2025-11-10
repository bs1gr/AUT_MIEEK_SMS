"""
Analytics Routes
Provides endpoints for student analytics and final grade computations.
Optimized with eager loading to prevent N+1 query problems.
"""


from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"],
    responses={404: {"description": "Not found"}},
)


from backend.db import get_session as get_db
from backend.db_utils import get_by_id_or_404
from backend.errors import internal_server_error


def get_letter_grade(percentage: float) -> str:
    if percentage >= 90:
        return "A"
    elif percentage >= 80:
        return "B"
    elif percentage >= 70:
        return "C"
    elif percentage >= 60:
        return "D"
    return "F"


@router.get("/student/{student_id}/course/{course_id}/final-grade")
def calculate_final_grade(request: Request, student_id: int, course_id: int, db: Session = Depends(get_db)):
    """Calculate final grade using evaluation rules, grades, daily performance, and attendance."""
    try:
        from backend.import_resolver import import_names

        Course, Grade, DailyPerformance, Attendance, Student = import_names(
            "models", "Course", "Grade", "DailyPerformance", "Attendance", "Student"
        )

        _student = get_by_id_or_404(db, Student, student_id)
        course = get_by_id_or_404(db, Course, course_id)

        evaluation_rules = course.evaluation_rules or []
        if not evaluation_rules:
            return {"error": "No evaluation rules defined for this course"}

        grades = (
            db.query(Grade)
            .filter(
                Grade.student_id == student_id,
                Grade.course_id == course_id,
                Grade.deleted_at.is_(None),
            )
            .all()
        )
        dps = (
            db.query(DailyPerformance)
            .filter(
                DailyPerformance.student_id == student_id,
                DailyPerformance.course_id == course_id,
                DailyPerformance.deleted_at.is_(None),
            )
            .all()
        )
        att = (
            db.query(Attendance)
            .filter(
                Attendance.student_id == student_id,
                Attendance.course_id == course_id,
                Attendance.deleted_at.is_(None),
            )
            .all()
        )

        category_scores: Dict[str, float] = {}
        category_details: Dict[str, Any] = {}

        for rule in evaluation_rules:
            category = rule.get("category")
            weight = float(rule.get("weight", 0))
            include_daily = rule.get("includeDailyPerformance", True)  # Default to True for backward compatibility
            daily_multiplier = float(rule.get("dailyPerformanceMultiplier", 1.0))  # Default multiplier is 1.0

            if not category or weight <= 0:
                continue

            # Use weighted sum approach for proper multiplier handling
            weighted_sum: float = 0.0
            total_item_weight: float = 0.0

            # For Midterm and Final Exam, only use the latest grade (most recent date_submitted or id)
            exam_categories = [
                "Midterm",
                "Midterm Exam",
                "Final Exam",
                "Final",
                "Ενδιάμεση",
                "Ενδιάμεση Εξέταση",
                "Τελική Εξέταση",
                "Τελική",
            ]
            category_grades = [gr for gr in grades if gr.category == category]

            if category in exam_categories and category_grades:
                # Sort by date_submitted (most recent first), fall back to id
                category_grades = sorted(
                    category_grades, key=lambda g: (g.date_submitted or "1970-01-01", g.id), reverse=True
                )
                # Keep only the latest grade
                category_grades = category_grades[:1]

            # regular grades (percentage) with weight 1.0 each
            for g in category_grades:
                if getattr(g, "max_grade", 0):
                    grade_pct = (g.grade / g.max_grade) * 100
                    weighted_sum += grade_pct * 1.0  # Each grade has weight 1.0
                    total_item_weight += 1.0

            # daily performance (percentage) with custom multiplier
            if include_daily:
                for dp in (p for p in dps if p.category == category):
                    if getattr(dp, "max_score", 0):
                        daily_pct = (dp.score / dp.max_score) * 100
                        weighted_sum += daily_pct * daily_multiplier
                        total_item_weight += daily_multiplier

            # attendance category special handling
            if category.lower() in ["attendance", "παρουσία"]:
                if att:
                    total = len(att)
                    present = len([a for a in att if a.status.lower() == "present"])
                    att_pct = (present / total * 100) if total > 0 else 0
                    weighted_sum += att_pct * 1.0
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

        # Apply absence penalty (percentage points deduction per unexcused absence)
        unexcused_absences = 0
        absence_deduction = 0.0
        try:
            penalty_per_absence = float(getattr(course, "absence_penalty", 0.0) or 0.0)
        except Exception:
            penalty_per_absence = 0.0

        if penalty_per_absence > 0:
            unexcused_absences = len([a for a in att if str(a.status).lower() == "absent"])
            absence_deduction = penalty_per_absence * unexcused_absences
            final_grade = max(0.0, final_grade - absence_deduction)

        # Convert to other grading scales
        gpa = (final_grade / 100.0) * 4.0 if final_grade > 0 else 0
        greek_grade = (final_grade / 100.0) * 20.0 if final_grade > 0 else 0
        letter = get_letter_grade(final_grade)

        return {
            "student_id": student_id,
            "course_id": course_id,
            "course_name": course.course_name,
            "final_grade": round(final_grade, 2),
            "percentage": round(final_grade, 2),
            "gpa": round(gpa, 2),
            "greek_grade": round(greek_grade, 2),
            "letter_grade": letter,
            "total_weight_used": total_weight_used,
            "category_breakdown": category_details,
            "absence_penalty": penalty_per_absence,
            "unexcused_absences": unexcused_absences,
            "absence_deduction": round(absence_deduction, 2),
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Final grade calculation failed: %s", exc, exc_info=True)
        raise internal_server_error("Final grade calculation failed", request)


@router.get("/student/{student_id}/all-courses-summary")
def get_student_all_courses_summary(request: Request, student_id: int, db: Session = Depends(get_db)):
    try:
        from backend.import_resolver import import_names

        Student, Course, Grade, DailyPerformance = import_names(
            "models", "Student", "Course", "Grade", "DailyPerformance"
        )

        # Single query with joinedload to avoid N+1
        student = get_by_id_or_404(db, Student, student_id)

        # Get all course IDs in one go
        grade_courses = (
            db.query(Grade.course_id).filter(Grade.student_id == student_id, Grade.deleted_at.is_(None)).distinct()
        )
        daily_courses = (
            db.query(DailyPerformance.course_id)
            .filter(DailyPerformance.student_id == student_id, DailyPerformance.deleted_at.is_(None))
            .distinct()
        )
        course_ids = set([c[0] for c in grade_courses] + [c[0] for c in daily_courses])

        # Fetch all courses in ONE query instead of N queries (OPTIMIZATION)
        courses_dict = {}
        if course_ids:
            courses = db.query(Course).filter(Course.id.in_(course_ids), Course.deleted_at.is_(None)).all()
            courses_dict = {c.id: c for c in courses}

        summaries = []
        overall_gpa = 0.0
        total_credits = 0

        for cid in course_ids:
            try:
                # Get course from pre-loaded dict (no DB query)
                course = courses_dict.get(cid)
                if not course:
                    continue

                data = calculate_final_grade(request, student_id, cid, db)  # reuse logic
                if isinstance(data, dict) and data.get("error"):
                    continue

                summaries.append(
                    {
                        "course_code": course.course_code,
                        "course_name": course.course_name,
                        "credits": course.credits,
                        "final_grade": data["final_grade"],
                        "gpa": data["gpa"],
                        "letter_grade": data["letter_grade"],
                    }
                )
                overall_gpa += float(data["gpa"]) * int(course.credits or 0)
                total_credits += int(course.credits or 0)
            except Exception as e:
                logger.warning(f"Skip course {cid}: {e}")
                continue

        overall_gpa = overall_gpa / total_credits if total_credits > 0 else 0
        return {
            "student": {
                "id": student.id,
                "name": f"{student.first_name} {student.last_name}",
                "student_id": student.student_id,
            },
            "overall_gpa": round(overall_gpa, 2),
            "total_credits": total_credits,
            "courses": summaries,
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Student courses summary failed: %s", exc, exc_info=True)
        raise internal_server_error("Student courses summary failed", request)


@router.get("/student/{student_id}/summary")
def get_student_summary(request: Request, student_id: int, db: Session = Depends(get_db)):
    try:
        from backend.import_resolver import import_names

        Student, Attendance, Grade = import_names("models", "Student", "Attendance", "Grade")

        student = get_by_id_or_404(db, Student, student_id)

        total_att = (
            db.query(Attendance).filter(Attendance.student_id == student_id, Attendance.deleted_at.is_(None)).count()
        )
        present = (
            db.query(Attendance)
            .filter(
                Attendance.student_id == student_id,
                Attendance.status == "Present",
                Attendance.deleted_at.is_(None),
            )
            .count()
        )
        attendance_rate = (present / total_att * 100) if total_att > 0 else 0

        grades = db.query(Grade).filter(Grade.student_id == student_id, Grade.deleted_at.is_(None)).all()
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
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Student summary failed: %s", exc, exc_info=True)
        raise internal_server_error("Student summary failed", request)
