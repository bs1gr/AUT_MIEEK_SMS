"""
Search API router for advanced searching across students, courses, and grades.

Provides RESTful endpoints for:
- Student search (name, email, enrollment number)
- Course search (name, code, description)
- Grade search with filtering
- Advanced filtering with complex criteria
- Real-time search suggestions

Author: AI Agent
Date: January 17, 2026
Version: 1.0.0
"""

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
import logging

from backend.dependencies import get_db
from backend.rbac import optional_require_role
from backend.models import User
from backend.services.search_service import SearchService
from backend.schemas.response import APIResponse, success_response, error_response

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/search",
    tags=["search"],
    responses={
        400: {"description": "Invalid query parameters"},
        401: {"description": "Unauthorized"},
        500: {"description": "Internal server error"},
    },
)


# ============================================================================
# PYDANTIC SCHEMAS
# ============================================================================


class StudentSearchResult:
    """Student search result."""

    id: int
    first_name: str
    last_name: str
    email: str
    enrollment_number: str
    type: str = "student"


class CourseSearchResult:
    """Course search result."""

    id: int
    course_name: str
    course_code: str
    credits: int
    academic_year: int
    type: str = "course"


class GradeSearchResult:
    """Grade search result."""

    id: int
    student_id: int
    student_name: str
    course_id: int
    course_name: str
    grade_value: Optional[float]
    type: str = "grade"


class AdvancedFilterRequest:
    """Advanced filter request schema."""

    filters: Dict[str, Any]
    search_type: str  # "students", "courses", or "grades"


class AdvancedSearchRequest(BaseModel):
    """Request body for advanced search endpoint."""

    entity: Optional[str] = None
    query: Optional[str] = ""
    filters: Dict[str, Any] = {}
    page: Optional[int] = None
    page_size: Optional[int] = None


class SearchSuggestion:
    """Search suggestion result."""

    text: str
    type: str  # "student" or "course"
    id: int


# ============================================================================
# ENDPOINTS
# ============================================================================


@router.get(
    "/students",
    response_model=APIResponse[List[Dict[str, Any]]],
    summary="Search students",
    description="Search for students by name, email, or enrollment number",
)
async def search_students(
    request: Request,
    q: str = Query(..., min_length=1, max_length=255, description="Search query"),
    limit: int = Query(20, ge=1, le=100, description="Results limit"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(optional_require_role("students:view")),
) -> APIResponse[List[Dict[str, Any]]]:
    """
    Search for students by name, email, or enrollment number.

    **Query Parameters:**
    - `q`: Search query (required, 1-255 characters)
    - `limit`: Results limit (1-100, default: 20)
    - `offset`: Pagination offset (default: 0)

    **Response:**
    Returns list of matching students with basic information.

    **Example:**
    ```
    GET /api/v1/search/students?q=John&limit=10
    ```

    **Permissions:**
    - Public if AUTH_MODE=disabled
    - Requires `students:view` if AUTH_MODE=permissive or strict
    """
    try:
        search_service = SearchService(db)
        results = search_service.search_students(query=q, limit=limit, offset=offset)
        return success_response(results, request_id=request.state.request_id)
    except Exception as e:
        logger.error(f"Error searching students: {str(e)}")
        return error_response(code="SEARCH_ERROR", message="Failed to search students", details={"error": str(e)})


@router.get(
    "/courses",
    response_model=APIResponse[List[Dict[str, Any]]],
    summary="Search courses",
    description="Search for courses by name, code, or description",
)
async def search_courses(
    request: Request,
    q: str = Query(..., min_length=1, max_length=255, description="Search query"),
    limit: int = Query(20, ge=1, le=100, description="Results limit"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(optional_require_role("courses:view")),
) -> APIResponse[List[Dict[str, Any]]]:
    """
    Search for courses by name, code, or description.

    **Query Parameters:**
    - `q`: Search query (required, 1-255 characters)
    - `limit`: Results limit (1-100, default: 20)
    - `offset`: Pagination offset (default: 0)

    **Response:**
    Returns list of matching courses with basic information.

    **Example:**
    ```
    GET /api/v1/search/courses?q=Mathematics
    ```

    **Permissions:**
    - Public if AUTH_MODE=disabled
    - Requires `courses:view` if AUTH_MODE=permissive or strict
    """
    try:
        search_service = SearchService(db)
        results = search_service.search_courses(query=q, limit=limit, offset=offset)
        return success_response(results, request_id=request.state.request_id)
    except Exception as e:
        logger.error(f"Error searching courses: {str(e)}")
        return error_response(code="SEARCH_ERROR", message="Failed to search courses", details={"error": str(e)})


@router.get(
    "/grades",
    response_model=APIResponse[List[Dict[str, Any]]],
    summary="Search grades",
    description="Search for grades with optional text query and filtering",
)
async def search_grades(
    request: Request,
    q: Optional[str] = Query(None, max_length=255, description="Optional search query"),
    grade_min: Optional[float] = Query(None, ge=0, le=100, description="Minimum grade"),
    grade_max: Optional[float] = Query(None, ge=0, le=100, description="Maximum grade"),
    student_id: Optional[int] = Query(None, description="Filter by student ID"),
    course_id: Optional[int] = Query(None, description="Filter by course ID"),
    limit: int = Query(20, ge=1, le=100, description="Results limit"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(optional_require_role("grades:view")),
) -> APIResponse[List[Dict[str, Any]]]:
    """
    Search for grades with optional text query and filtering.

    **Query Parameters:**
    - `q`: Optional search query (student name or course name)
    - `grade_min`: Minimum grade value (0-100)
    - `grade_max`: Maximum grade value (0-100)
    - `student_id`: Filter by specific student
    - `course_id`: Filter by specific course
    - `limit`: Results limit (1-100, default: 20)
    - `offset`: Pagination offset (default: 0)

    **Response:**
    Returns list of matching grades with student and course information.

    **Example:**
    ```
    GET /api/v1/search/grades?grade_min=80&student_id=5
    ```

    **Permissions:**
    - Public if AUTH_MODE=disabled
    - Requires `grades:view` if AUTH_MODE=permissive or strict
    """
    try:
        filters = {"grade_min": grade_min, "grade_max": grade_max, "student_id": student_id, "course_id": course_id}
        search_service = SearchService(db)
        results = search_service.search_grades(query=q, filters=filters, limit=limit, offset=offset)
        return success_response(results, request_id=request.state.request_id)
    except Exception as e:
        logger.error(f"Error searching grades: {str(e)}")
        return error_response(code="SEARCH_ERROR", message="Failed to search grades", details={"error": str(e)})


@router.post(
    "/advanced",
    response_model=APIResponse[List[Dict[str, Any]]],
    summary="Advanced search with filters",
    description="Perform advanced search with complex filter combinations",
)
async def advanced_search(
    request: Request,
    body: AdvancedSearchRequest,
    limit: int = Query(20, ge=1, le=100, description="Results limit"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(optional_require_role("*:view")),
) -> APIResponse[List[Dict[str, Any]]]:
    """
    Perform advanced search with complex filter combinations.

    **Supported search types:**
    - `students`: Filter by name, email, status, academic year
    - `courses`: Filter by name, code, credits, academic year
    - `grades`: Filter by grade range, student, course, pass/fail

    **Request Body:**
    ```json
    {
        "entity": "students|courses|grades",
        "query": "optional search text",
        "filters": {
            "field": "value"
        },
        "page": optional,
        "page_size": optional
    }
    ```

    **Response:**
    Returns list of matching records with all applicable fields.

    **Permissions:**
    - Public if AUTH_MODE=disabled
    - Requires entity-specific view permission (students:view, courses:view, grades:view)

    **Example:**
    ```
    POST /api/v1/search/advanced
    {
        "entity": "courses",
        "filters": {
            "credits": 3,
            "semester": "Fall 2024"
        }
    }
    ```
    """
    try:
        # Validate entity
        entity = body.entity or "students"
        if entity not in ["students", "courses", "grades"]:
            return error_response(
                code="INVALID_ENTITY",
                message="Invalid entity. Must be 'students', 'courses', or 'grades'",
                request_id=request.state.request_id,
            )

        search_service = SearchService(db)

        # Use entity as search_type for backward compatibility
        results = search_service.advanced_filter(
            filters=body.filters or {}, search_type=entity, limit=limit, offset=offset
        )

        return success_response(results, request_id=request.state.request_id)
    except ValueError as ve:
        logger.warning(f"Invalid filter value: {str(ve)}")
        return error_response(
            code="INVALID_FILTER",
            message="Invalid filter value",
            details={"error": str(ve)},
            request_id=request.state.request_id,
        )
    except Exception as e:
        logger.error(f"Error in advanced search: {str(e)}")
        return error_response(
            code="SEARCH_ERROR",
            message="Failed to perform advanced search",
            details={"error": str(e)},
            request_id=request.state.request_id,
        )


@router.get(
    "/suggestions",
    response_model=APIResponse[List[Dict[str, Any]]],
    summary="Get search suggestions",
    description="Get real-time search suggestions based on partial query",
)
async def get_suggestions(
    request: Request,
    q: str = Query(..., min_length=1, max_length=255, description="Partial query"),
    limit: int = Query(5, ge=1, le=20, description="Maximum suggestions"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(optional_require_role(None)),
) -> APIResponse[List[Dict[str, Any]]]:
    """
    Get real-time search suggestions for autocomplete.

    Returns matching student names and course names as suggestions.

    **Query Parameters:**
    - `q`: Partial query string (required, 1-255 characters)
    - `limit`: Maximum suggestions (1-20, default: 5)

    **Response:**
    Returns list of suggestions with text, type, and ID.

    **Example:**
    ```
    GET /api/v1/search/suggestions?q=mat&limit=5
    ```
    Returns:
    ```json
    {
        "success": true,
        "data": [
            {"text": "Mathematics", "type": "course", "id": 5},
            {"text": "Materials Science", "type": "course", "id": 7},
            {"text": "Matt Johnson", "type": "student", "id": 15}
        ]
    }
    ```

    **Permissions:**
    - Public - No authentication required
    """
    try:
        search_service = SearchService(db)
        suggestions = search_service.get_search_suggestions(query=q, limit=limit)
        return success_response(suggestions, request_id=request.state.request_id)
    except Exception as e:
        logger.error(f"Error getting suggestions: {str(e)}")
        return error_response(
            code="SUGGESTION_ERROR", message="Failed to get search suggestions", details={"error": str(e)}
        )


# ============================================================================
# UTILITY ENDPOINT
# ============================================================================


@router.get(
    "/statistics",
    response_model=APIResponse[Dict[str, int]],
    summary="Get search statistics",
    description="Get system-wide statistics for searchable entities",
)
async def get_statistics(
    request: Request, db: Session = Depends(get_db), current_user: Optional[User] = Depends(optional_require_role(None))
) -> APIResponse[Dict[str, int]]:
    """
    Get system-wide statistics for searchable entities.

    Returns total counts of students, courses, and grades.

    **Response:**
    ```json
    {
        "success": true,
        "data": {
            "total_students": 245,
            "total_courses": 32,
            "total_grades": 2890
        }
    }
    ```

    **Permissions:**
    - Public - No authentication required

    **Use Cases:**
    - Dashboard statistics
    - Search result set size estimation
    - System capacity monitoring
    """
    try:
        search_service = SearchService(db)
        stats = search_service.get_search_statistics()
        return success_response(stats, request_id=request.state.request_id)
    except Exception as e:
        logger.error(f"Error getting statistics: {str(e)}")
        return error_response(code="STATS_ERROR", message="Failed to get search statistics", details={"error": str(e)})


# ============================================================================
# SAVED SEARCHES ENDPOINTS
# ============================================================================


@router.post(
    "/saved",
    response_model=APIResponse[Dict[str, Any]],
    summary="Create saved search",
    description="Save a search query for later reuse",
)
async def create_saved_search(
    request: Request,
    body: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(optional_require_role(None)),
) -> APIResponse[Dict[str, Any]]:
    """
    Create a new saved search.

    **Request Body:**
    ```json
    {
        "name": "High performers",
        "description": "Students with grades >= 90",
        "search_type": "students",
        "query": "Optional full-text query",
        "filters": {
            "grade_min": 90
        },
        "is_favorite": false
    }
    ```

    **Permissions:**
    - Requires authentication
    """
    if not current_user:
        return error_response(
            code="UNAUTHORIZED",
            message="Authentication required to save searches",
            request_id=request.state.request_id,
        )

    try:
        from backend.services.saved_search_service import SavedSearchService
        from backend.schemas.search import SavedSearchCreateSchema

        create_data = SavedSearchCreateSchema(**body)
        service = SavedSearchService(db)
        saved_search = service.create_saved_search(current_user.id, create_data)

        if not saved_search:
            return error_response(
                code="CREATE_ERROR",
                message="Failed to create saved search",
                request_id=request.state.request_id,
            )

        result = {
            "id": saved_search.id,
            "name": saved_search.name,
            "search_type": saved_search.search_type,
            "created_at": saved_search.created_at.isoformat() if saved_search.created_at else None,
        }
        return success_response(result, request_id=request.state.request_id)
    except Exception as e:
        logger.error(f"Error creating saved search: {str(e)}")
        return error_response(
            code="CREATE_ERROR",
            message="Failed to create saved search",
            details={"error": str(e)},
            request_id=request.state.request_id,
        )


@router.get(
    "/saved",
    response_model=APIResponse[List[Dict[str, Any]]],
    summary="List saved searches",
    description="Get all saved searches for current user",
)
async def list_saved_searches(
    request: Request,
    search_type: Optional[str] = Query(None, description="Filter by search type"),
    is_favorite: Optional[bool] = Query(None, description="Filter by favorite status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(optional_require_role(None)),
) -> APIResponse[List[Dict[str, Any]]]:
    """
    Get all saved searches for the current user.

    **Query Parameters:**
    - `search_type`: Optional filter ('students', 'courses', 'grades')
    - `is_favorite`: Optional filter for favorite searches

    **Permissions:**
    - Requires authentication
    """
    if not current_user:
        return error_response(
            code="UNAUTHORIZED",
            message="Authentication required",
            request_id=request.state.request_id,
        )

    try:
        from backend.services.saved_search_service import SavedSearchService

        service = SavedSearchService(db)
        searches = service.get_user_saved_searches(current_user.id, search_type=search_type, is_favorite=is_favorite)

        result = [
            {
                "id": s.id,
                "name": s.name,
                "description": s.description,
                "search_type": s.search_type,
                "is_favorite": s.is_favorite,
                "created_at": s.created_at.isoformat() if s.created_at else None,
                "updated_at": s.updated_at.isoformat() if s.updated_at else None,
            }
            for s in searches
        ]
        return success_response(result, request_id=request.state.request_id)
    except Exception as e:
        logger.error(f"Error listing saved searches: {str(e)}")
        return error_response(
            code="LIST_ERROR",
            message="Failed to list saved searches",
            details={"error": str(e)},
            request_id=request.state.request_id,
        )


@router.get(
    "/saved/{search_id}",
    response_model=APIResponse[Dict[str, Any]],
    summary="Get saved search",
    description="Get details of a specific saved search",
)
async def get_saved_search(
    request: Request,
    search_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(optional_require_role(None)),
) -> APIResponse[Dict[str, Any]]:
    """
    Get details of a specific saved search.

    **Path Parameters:**
    - `search_id`: Saved search ID

    **Permissions:**
    - Requires authentication
    - User can only access their own saved searches
    """
    if not current_user:
        return error_response(
            code="UNAUTHORIZED",
            message="Authentication required",
            request_id=request.state.request_id,
        )

    try:
        from backend.services.saved_search_service import SavedSearchService

        service = SavedSearchService(db)
        saved_search = service.get_saved_search(search_id, current_user.id)

        if not saved_search:
            return error_response(
                code="NOT_FOUND",
                message="Saved search not found",
                request_id=request.state.request_id,
            )

        result = {
            "id": saved_search.id,
            "name": saved_search.name,
            "description": saved_search.description,
            "search_type": saved_search.search_type,
            "query": saved_search.query,
            "filters": saved_search.filters,
            "is_favorite": saved_search.is_favorite,
            "created_at": saved_search.created_at.isoformat() if saved_search.created_at else None,
            "updated_at": saved_search.updated_at.isoformat() if saved_search.updated_at else None,
        }
        return success_response(result, request_id=request.state.request_id)
    except Exception as e:
        logger.error(f"Error getting saved search {search_id}: {str(e)}")
        return error_response(
            code="GET_ERROR",
            message="Failed to get saved search",
            details={"error": str(e)},
            request_id=request.state.request_id,
        )


@router.put(
    "/saved/{search_id}",
    response_model=APIResponse[Dict[str, Any]],
    summary="Update saved search",
    description="Update a saved search",
)
async def update_saved_search(
    request: Request,
    search_id: int,
    body: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(optional_require_role(None)),
) -> APIResponse[Dict[str, Any]]:
    """
    Update a saved search.

    **Path Parameters:**
    - `search_id`: Saved search ID

    **Request Body:**
    All fields are optional:
    ```json
    {
        "name": "New name",
        "description": "New description",
        "query": "Updated query",
        "filters": {},
        "is_favorite": true
    }
    ```

    **Permissions:**
    - Requires authentication
    - User can only update their own searches
    """
    if not current_user:
        return error_response(
            code="UNAUTHORIZED",
            message="Authentication required",
            request_id=request.state.request_id,
        )

    try:
        from backend.services.saved_search_service import SavedSearchService
        from backend.schemas.search import SavedSearchUpdateSchema

        update_data = SavedSearchUpdateSchema(**body)
        service = SavedSearchService(db)
        saved_search = service.update_saved_search(search_id, current_user.id, update_data)

        if not saved_search:
            return error_response(
                code="NOT_FOUND",
                message="Saved search not found",
                request_id=request.state.request_id,
            )

        result = {
            "id": saved_search.id,
            "name": saved_search.name,
            "description": saved_search.description,
            "search_type": saved_search.search_type,
            "updated_at": saved_search.updated_at.isoformat() if saved_search.updated_at else None,
        }
        return success_response(result, request_id=request.state.request_id)
    except Exception as e:
        logger.error(f"Error updating saved search {search_id}: {str(e)}")
        return error_response(
            code="UPDATE_ERROR",
            message="Failed to update saved search",
            details={"error": str(e)},
            request_id=request.state.request_id,
        )


@router.delete(
    "/saved/{search_id}",
    response_model=APIResponse[Dict[str, str]],
    summary="Delete saved search",
    description="Delete a saved search",
)
async def delete_saved_search(
    request: Request,
    search_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(optional_require_role(None)),
) -> APIResponse[Dict[str, str]]:
    """
    Delete a saved search.

    **Path Parameters:**
    - `search_id`: Saved search ID

    **Permissions:**
    - Requires authentication
    - User can only delete their own searches
    """
    if not current_user:
        return error_response(
            code="UNAUTHORIZED",
            message="Authentication required",
            request_id=request.state.request_id,
        )

    try:
        from backend.services.saved_search_service import SavedSearchService

        service = SavedSearchService(db)
        success = service.delete_saved_search(search_id, current_user.id)

        if not success:
            return error_response(
                code="NOT_FOUND",
                message="Saved search not found",
                request_id=request.state.request_id,
            )

        return success_response({"message": "Saved search deleted successfully"}, request_id=request.state.request_id)
    except Exception as e:
        logger.error(f"Error deleting saved search {search_id}: {str(e)}")
        return error_response(
            code="DELETE_ERROR",
            message="Failed to delete saved search",
            details={"error": str(e)},
            request_id=request.state.request_id,
        )


@router.post(
    "/saved/{search_id}/favorite",
    response_model=APIResponse[Dict[str, Any]],
    summary="Toggle saved search favorite",
    description="Toggle favorite status of a saved search",
)
async def toggle_saved_search_favorite(
    request: Request,
    search_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(optional_require_role(None)),
) -> APIResponse[Dict[str, Any]]:
    """
    Toggle favorite status of a saved search.

    **Path Parameters:**
    - `search_id`: Saved search ID

    **Permissions:**
    - Requires authentication
    - User can only modify their own searches
    """
    if not current_user:
        return error_response(
            code="UNAUTHORIZED",
            message="Authentication required",
            request_id=request.state.request_id,
        )

    try:
        from backend.services.saved_search_service import SavedSearchService

        service = SavedSearchService(db)
        saved_search = service.toggle_favorite(search_id, current_user.id)

        if not saved_search:
            return error_response(
                code="NOT_FOUND",
                message="Saved search not found",
                request_id=request.state.request_id,
            )

        result = {
            "id": saved_search.id,
            "is_favorite": saved_search.is_favorite,
            "message": f"Marked as {'favorite' if saved_search.is_favorite else 'not favorite'}",
        }
        return success_response(result, request_id=request.state.request_id)
    except Exception as e:
        logger.error(f"Error toggling favorite for search {search_id}: {str(e)}")
        return error_response(
            code="UPDATE_ERROR",
            message="Failed to toggle favorite",
            details={"error": str(e)},
            request_id=request.state.request_id,
        )
