# Aggregated exports for easy imports
## Using explicit re-exports to satisfy F401 linter
from .attendance import (
    AttendanceCreate as AttendanceCreate,
)
from .attendance import (
    AttendanceResponse as AttendanceResponse,
)
from .attendance import (
    AttendanceStats as AttendanceStats,
)
from .attendance import (
    AttendanceUpdate as AttendanceUpdate,
)
from .auth import LogoutRequest as LogoutRequest
from .auth import (
    PasswordChangeRequest as PasswordChangeRequest,
)
from .auth import (
    PasswordResetRequest as PasswordResetRequest,
)
from .auth import RefreshRequest as RefreshRequest
from .auth import RefreshResponse as RefreshResponse
from .auth import (
    Token as Token,
)
from .auth import (
    UserCreate as UserCreate,
)
from .auth import (
    UserLogin as UserLogin,
)

## Removed duplicate UserResponse import from .auth to fix Ruff F811
from .auth import (
    UserUpdate as UserUpdate,
)
from .common import (
    DateRangeParams as DateRangeParams,
)
from .common import (
    PaginatedResponse as PaginatedResponse,
)
from .common import (
    PaginationParams as PaginationParams,
)
from .courses import CourseCreate as CourseCreate
from .analytics import AnalyticsLookupsResponse as AnalyticsLookupsResponse
from .courses import CourseResponse as CourseResponse
from .courses import CourseUpdate as CourseUpdate
from .enrollments import (
    EnrollmentCreate as EnrollmentCreate,
)
from .enrollments import (
    EnrollmentResponse as EnrollmentResponse,
)
from .enrollments import (
    StudentBrief as StudentBrief,
)
from .import_export import (
    ExportJobCreate as ExportJobCreate,
    ExportJobResponse as ExportJobResponse,
    ExportListResponse as ExportListResponse,
    ImportExportHistoryEntry as ImportExportHistoryEntry,
    ImportExportHistoryResponse as ImportExportHistoryResponse,
    ImportJobCommitRequest as ImportJobCommitRequest,
    ImportJobCreate as ImportJobCreate,
    ImportJobPreview as ImportJobPreview,
    ImportJobResponse as ImportJobResponse,
    ImportJobRollbackRequest as ImportJobRollbackRequest,
    ImportRowData as ImportRowData,
    ImportValidationResult as ImportValidationResult,
    ValidationError as ValidationError,
)
from .grades import GradeCreate as GradeCreate
from .grades import GradeResponse as GradeResponse
from .grades import GradeUpdate as GradeUpdate
from .highlights import (
    HighlightBase as HighlightBase,
    HighlightCreate as HighlightCreate,
    HighlightListResponse as HighlightListResponse,
    HighlightResponse as HighlightResponse,
    HighlightUpdate as HighlightUpdate,
)
from .jobs import (
    ImportPreviewItem as ImportPreviewItem,
)
from .jobs import (
    ImportPreviewRequest as ImportPreviewRequest,
)
from .jobs import (
    ImportPreviewResponse as ImportPreviewResponse,
)
from .jobs import (
    JobCreate as JobCreate,
)
from .jobs import (
    JobListResponse as JobListResponse,
)
from .jobs import (
    JobProgress as JobProgress,
)
from .jobs import (
    JobResponse as JobResponse,
)
from .jobs import (
    JobResult as JobResult,
)
from .jobs import (
    JobStatus as JobStatus,
)
from .jobs import (
    JobType as JobType,
)
from .metrics import AttendanceMetrics as AttendanceMetrics
from .metrics import CourseMetrics as CourseMetrics
from .metrics import DashboardMetrics as DashboardMetrics
from .metrics import GradeMetrics as GradeMetrics
from .metrics import StudentMetrics as StudentMetrics
from .notifications import BroadcastNotificationCreate as BroadcastNotificationCreate
from .notifications import NotificationCreate as NotificationCreate
from .notifications import NotificationListResponse as NotificationListResponse
from .notifications import NotificationPreferenceCreate as NotificationPreferenceCreate
from .notifications import NotificationPreferenceResponse as NotificationPreferenceResponse
from .notifications import NotificationPreferenceUpdate as NotificationPreferenceUpdate
from .notifications import NotificationResponse as NotificationResponse
from .notifications import NotificationUpdate as NotificationUpdate
from .performance import (
    DailyPerformanceCreate as DailyPerformanceCreate,
)
from .performance import (
    DailyPerformanceResponse as DailyPerformanceResponse,
)
from .permissions import (
    PermissionBase as PermissionBase,
    PermissionCreate as PermissionCreate,
    PermissionDetail as PermissionDetail,
    PermissionListItem as PermissionListItem,
    PermissionStatsResponse as PermissionStatsResponse,
    PermissionUpdate as PermissionUpdate,
    PermissionsByResourceResponse as PermissionsByResourceResponse,
    RolePermissionGrant as RolePermissionGrant,
    RolePermissionRevoke as RolePermissionRevoke,
    UserPermissionGrant as UserPermissionGrant,
    UserPermissionRevoke as UserPermissionRevoke,
    UserPermissionsResponse as UserPermissionsResponse,
)
from .rbac import (
    AssignRoleRequest as AssignRoleRequest,
)
from .rbac import (
    BulkAssignRolesRequest as BulkAssignRolesRequest,
)
from .rbac import (
    BulkGrantPermissionsRequest as BulkGrantPermissionsRequest,
)
from .rbac import (
    GrantPermissionToRoleRequest as GrantPermissionToRoleRequest,
)
from .rbac import (
    PermissionResponse as PermissionResponse,
)
from .rbac import (
    RBACSummary as RBACSummary,
)
from .rbac import (
    RoleResponse as RoleResponse,
)
from .reports import (
    AttendanceSummary as AttendanceSummary,
)
from .reports import (
    CourseSummary as CourseSummary,
)
from .reports import (
    GradeSummary as GradeSummary,
)
from .reports import (
    BulkReportRequest as BulkReportRequest,
)
from .reports import (
    HighlightSummary as HighlightSummary,
)
from .reports import (
    PerformanceReportRequest as PerformanceReportRequest,
)
from .reports import (
    PerformanceSummary as PerformanceSummary,
)
from .reports import (
    ReportFormat as ReportFormat,
)
from .reports import (
    ReportJobStatus as ReportJobStatus,
)
from .reports import (
    ReportPeriod as ReportPeriod,
)
from .reports import (
    StudentPerformanceReport as StudentPerformanceReport,
)
from .custom_reports import (
    BulkReportGenerationRequest as BulkReportGenerationRequest,
    BulkReportGenerationResponse as BulkReportGenerationResponse,
    CustomReportCreate as CustomReportCreate,
    CustomReportResponse as CustomReportResponse,
    CustomReportUpdate as CustomReportUpdate,
    GeneratedReportCreate as GeneratedReportCreate,
    GeneratedReportResponse as GeneratedReportResponse,
    GeneratedReportUpdate as GeneratedReportUpdate,
    ReportGenerationRequest as ReportGenerationRequest,
    ReportGenerationResponse as ReportGenerationResponse,
    ReportStatistics as ReportStatistics,
    ReportTemplateCreate as ReportTemplateCreate,
    ReportTemplateResponse as ReportTemplateResponse,
    ReportTemplateUpdate as ReportTemplateUpdate,
)
from .response import APIResponse as APIResponse
from .response import ErrorDetail as ErrorDetail
from .response import PaginatedData as PaginatedData
from .response import ResponseMeta as ResponseMeta
from .response import error_response as error_response
from .response import paginated_response as paginated_response
from .response import success_response as success_response
from .search import (
    AdvancedFilterRequestSchema as AdvancedFilterRequestSchema,
)
from .search import (
    ApplyFilterRequestSchema as ApplyFilterRequestSchema,
)
from .search import (
    CourseSearchRequestSchema as CourseSearchRequestSchema,
)
from .search import (
    CourseSearchResultSchema as CourseSearchResultSchema,
)
from .search import (
    FilterCriteriaSchema as FilterCriteriaSchema,
)
from .search import (
    GradeSearchRequestSchema as GradeSearchRequestSchema,
)
from .search import (
    GradeSearchResultSchema as GradeSearchResultSchema,
)
from .search import (
    SavedSearchCreateSchema as SavedSearchCreateSchema,
)
from .search import (
    SavedSearchListResponseSchema as SavedSearchListResponseSchema,
)
from .search import (
    SavedSearchResponseSchema as SavedSearchResponseSchema,
)
from .search import (
    SavedSearchUpdateSchema as SavedSearchUpdateSchema,
)
from .search import (
    SearchSuggestionSchema as SearchSuggestionSchema,
)
from .search import (
    SearchSuggestionsResponseSchema as SearchSuggestionsResponseSchema,
)
from .search import (
    StudentSearchRequestSchema as StudentSearchRequestSchema,
)
from .search import (
    StudentSearchResultSchema as StudentSearchResultSchema,
)
from .search import (
    UnifiedSearchRequestSchema as UnifiedSearchRequestSchema,
)
from .search import (
    UnifiedSearchResultSchema as UnifiedSearchResultSchema,
)

# Phase 4 Full-Text Search schemas
from .search import (
    FullTextSearchRequest as FullTextSearchRequest,
)
from .search import (
    AdvancedSearchRequest as AdvancedSearchRequest,
)
from .search import (
    StudentFullTextSearchResult as StudentFullTextSearchResult,
)
from .search import (
    FullTextSearchResponse as FullTextSearchResponse,
)
from .search import (
    AdvancedSearchResponse as AdvancedSearchResponse,
)
from .search import (
    SearchFilterRequest as SearchFilterRequest,
)
from .search import (
    SearchSortRequest as SearchSortRequest,
)
from .search import (
    SearchFacets as SearchFacets,
)
from .search import (
    SearchFacetsResponse as SearchFacetsResponse,
)

# Phase 4 Faceted Navigation schemas
from .search import (
    FacetValue as FacetValue,
)
from .search import (
    FacetCategory as FacetCategory,
)
from .search import (
    StudentFacetsResponse as StudentFacetsResponse,
)
from .search import (
    CourseFacetsResponse as CourseFacetsResponse,
)
from .students import StudentCreate as StudentCreate
from .students import StudentResponse as StudentResponse
from .students import StudentUpdate as StudentUpdate
from .users import UserResponse as UserResponse
