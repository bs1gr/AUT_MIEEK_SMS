"""
Cache invalidation hooks for analytics.

These functions should be called whenever data changes that affects analytics queries:
- Grade creation/update/deletion
- Attendance creation/update/deletion
- Course updates
- Daily performance updates
"""

import logging

logger = logging.getLogger(__name__)


def on_grade_created(student_id: int, course_id: int) -> None:
    """Called when a grade is created.

    Args:
        student_id: Student ID
        course_id: Course ID
    """
    from backend.services.analytics_service import AnalyticsService

    AnalyticsService.clear_all_cache()
    logger.debug("Cache invalidated: grade created (student=%d, course=%d)", student_id, course_id)


def on_grade_updated(student_id: int, course_id: int) -> None:
    """Called when a grade is updated.

    Args:
        student_id: Student ID
        course_id: Course ID
    """
    from backend.services.analytics_service import AnalyticsService

    AnalyticsService.clear_all_cache()
    logger.debug("Cache invalidated: grade updated (student=%d, course=%d)", student_id, course_id)


def on_grade_deleted(student_id: int, course_id: int) -> None:
    """Called when a grade is deleted.

    Args:
        student_id: Student ID
        course_id: Course ID
    """
    from backend.services.analytics_service import AnalyticsService

    AnalyticsService.clear_all_cache()
    logger.debug("Cache invalidated: grade deleted (student=%d, course=%d)", student_id, course_id)


def on_attendance_created(student_id: int, course_id: int) -> None:
    """Called when attendance is created.

    Args:
        student_id: Student ID
        course_id: Course ID
    """
    from backend.services.analytics_service import AnalyticsService

    AnalyticsService.clear_all_cache()
    logger.debug("Cache invalidated: attendance created (student=%d, course=%d)", student_id, course_id)


def on_attendance_updated(student_id: int, course_id: int) -> None:
    """Called when attendance is updated.

    Args:
        student_id: Student ID
        course_id: Course ID
    """
    from backend.services.analytics_service import AnalyticsService

    AnalyticsService.clear_all_cache()
    logger.debug("Cache invalidated: attendance updated (student=%d, course=%d)", student_id, course_id)


def on_attendance_deleted(student_id: int, course_id: int) -> None:
    """Called when attendance is deleted.

    Args:
        student_id: Student ID
        course_id: Course ID
    """
    from backend.services.analytics_service import AnalyticsService

    AnalyticsService.clear_all_cache()
    logger.debug("Cache invalidated: attendance deleted (student=%d, course=%d)", student_id, course_id)


def on_course_updated(course_id: int) -> None:
    """Called when a course is updated.

    Args:
        course_id: Course ID
    """
    from backend.services.analytics_service import AnalyticsService

    AnalyticsService.clear_all_cache()
    logger.debug("Cache invalidated: course updated (course=%d)", course_id)
