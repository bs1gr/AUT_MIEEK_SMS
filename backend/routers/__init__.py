"""
Routers package initialization
Re-exports all router modules for easier imports
"""

from . import routers_students as students
from . import routers_courses as courses
from . import routers_grades as grades
from . import routers_attendance as attendance

__all__ = ["students", "courses", "grades", "attendance"]
