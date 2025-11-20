# Aggregated exports for easy imports
# Using explicit re-exports to satisfy F401 linter
from .students import StudentCreate as StudentCreate, StudentUpdate as StudentUpdate, StudentResponse as StudentResponse
from .courses import CourseCreate as CourseCreate, CourseUpdate as CourseUpdate, CourseResponse as CourseResponse
from .grades import GradeCreate as GradeCreate, GradeUpdate as GradeUpdate, GradeResponse as GradeResponse
from .attendance import (
    AttendanceCreate as AttendanceCreate,
    AttendanceUpdate as AttendanceUpdate,
    AttendanceResponse as AttendanceResponse,
    AttendanceStats as AttendanceStats,
)
from .performance import (
    DailyPerformanceCreate as DailyPerformanceCreate,
    DailyPerformanceResponse as DailyPerformanceResponse,
)
from .enrollments import (
    EnrollmentCreate as EnrollmentCreate,
    EnrollmentResponse as EnrollmentResponse,
    StudentBrief as StudentBrief,
)
from .auth import (
    UserCreate as UserCreate,
    UserUpdate as UserUpdate,
    UserLogin as UserLogin,
    UserResponse as UserResponse,
    Token as Token,
    PasswordResetRequest as PasswordResetRequest,
    PasswordChangeRequest as PasswordChangeRequest,
)
from .auth import RefreshRequest as RefreshRequest, RefreshResponse as RefreshResponse, LogoutRequest as LogoutRequest
from .common import (
    PaginationParams as PaginationParams,
    PaginatedResponse as PaginatedResponse,
    DateRangeParams as DateRangeParams,
)
