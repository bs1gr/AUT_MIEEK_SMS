# Advanced Search & Filtering - API Documentation

**Feature**: #128 - Advanced Search & Filtering
**Version**: 1.0.0
**Status**: Production Ready
**Last Updated**: January 17, 2026

## Overview

The Advanced Search & Filtering API provides 6 RESTful endpoints for searching and filtering students, courses, and grades with support for pagination, advanced filters, suggestions, and statistics.

**Base URL**: `/api/v1/search`

## Authentication

All endpoints require authentication via Bearer token in the `Authorization` header:

```bash
Authorization: Bearer YOUR_ACCESS_TOKEN

```text
## Endpoints

### 1. Search Students

**POST** `/api/v1/search/students`

Search for students by name, email, or other criteria.

#### Request

```json
{
  "query": "Alice",
  "page": 1,
  "page_size": 20,
  "filters": {
    "email": "alice@example.com",
    "phone": "555-0001"
  }
}

```text
#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| query | string | No | Search term (name, email) |
| page | integer | No | Page number (default: 1) |
| page_size | integer | No | Results per page (default: 20, max: 100) |
| filters | object | No | Additional filters (email, phone) |

#### Response - Success (200 OK)

```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": 1,
        "first_name": "Alice",
        "last_name": "Johnson",
        "email": "alice@example.com",
        "phone": "555-0001",
        "created_at": "2026-01-01T10:00:00Z"
      }
    ],
    "page": 1,
    "page_size": 20,
    "total": 1,
    "has_next": false
  },
  "error": null,
  "meta": {
    "request_id": "req_abc123",
    "timestamp": "2026-01-17T12:00:00Z",
    "version": "1.0.0"
  }
}

```text
#### Response - Errors

**400 Bad Request**

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "INVALID_QUERY",
    "message": "Query string is too long (max 200 characters)",
    "details": null
  },
  "meta": {"request_id": "req_xyz789", "timestamp": "2026-01-17T12:00:00Z"}
}

```text
**403 Forbidden**

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "You do not have permission to search students",
    "details": null
  },
  "meta": {"request_id": "req_xyz789", "timestamp": "2026-01-17T12:00:00Z"}
}

```text
#### Examples

**Search by name**

```bash
curl -X POST "http://localhost:8000/api/v1/search/students" \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{"query": "Alice"}'

```text
**Search with pagination**

```bash
curl -X POST "http://localhost:8000/api/v1/search/students" \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "",
    "page": 2,
    "page_size": 50
  }'

```text
**Search with filters**

```bash
curl -X POST "http://localhost:8000/api/v1/search/students" \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Alice",
    "filters": {
      "email": "alice@"
    }
  }'

```text
---

### 2. Search Courses

**POST** `/api/v1/search/courses`

Search for courses by name, code, or credits.

#### Request

```json
{
  "query": "Math",
  "page": 1,
  "page_size": 20,
  "filters": {
    "min_credits": 3,
    "max_credits": 4
  }
}

```text
#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| query | string | No | Search term (name, code) |
| page | integer | No | Page number (default: 1) |
| page_size | integer | No | Results per page (default: 20, max: 100) |
| filters | object | No | Credit range filters (min_credits, max_credits) |

#### Response - Success (200 OK)

```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": 1,
        "name": "Mathematics 101",
        "code": "MATH101",
        "credits": 3,
        "description": "Introduction to mathematics",
        "created_at": "2026-01-01T10:00:00Z"
      }
    ],
    "page": 1,
    "page_size": 20,
    "total": 1,
    "has_next": false
  },
  "error": null,
  "meta": {"request_id": "req_abc123", "timestamp": "2026-01-17T12:00:00Z"}
}

```text
#### Examples

**Search by name**

```bash
curl -X POST "http://localhost:8000/api/v1/search/courses" \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{"query": "Math"}'

```text
**Filter by credits**

```bash
curl -X POST "http://localhost:8000/api/v1/search/courses" \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "",
    "filters": {
      "min_credits": 3,
      "max_credits": 4
    }
  }'

```text
---

### 3. Search Grades

**POST** `/api/v1/search/grades`

Search for grades with student, course, and value filters.

#### Request

```json
{
  "filters": {
    "student_id": 1,
    "course_id": 1,
    "min_grade": 80,
    "max_grade": 100
  },
  "page": 1,
  "page_size": 20
}

```text
#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| filters | object | No | Grade filters (student_id, course_id, min_grade, max_grade) |
| page | integer | No | Page number (default: 1) |
| page_size | integer | No | Results per page (default: 20, max: 100) |

#### Response - Success (200 OK)

```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": 1,
        "student_id": 1,
        "student_name": "Alice Johnson",
        "course_id": 1,
        "course_name": "Mathematics 101",
        "grade": 95.5,
        "created_at": "2026-01-10T10:00:00Z"
      }
    ],
    "page": 1,
    "page_size": 20,
    "total": 1,
    "has_next": false
  },
  "error": null,
  "meta": {"request_id": "req_abc123", "timestamp": "2026-01-17T12:00:00Z"}
}

```text
#### Examples

**Search grades for a student**

```bash
curl -X POST "http://localhost:8000/api/v1/search/grades" \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{
    "filters": {
      "student_id": 1
    }
  }'

```text
**Search grades in a grade range**

```bash
curl -X POST "http://localhost:8000/api/v1/search/grades" \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{
    "filters": {
      "min_grade": 90,
      "max_grade": 100
    }
  }'

```text
**Search with multiple filters**

```bash
curl -X POST "http://localhost:8000/api/v1/search/grades" \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{
    "filters": {
      "student_id": 1,
      "min_grade": 80
    }
  }'

```text
---

### 4. Advanced Search

**POST** `/api/v1/search/advanced`

Search across all entity types (students, courses, grades) with unified filtering.

#### Request

```json
{
  "query": "Alice",
  "entity": "student",
  "filters": {
    "email": "alice@"
  },
  "page": 1,
  "page_size": 20
}

```text
#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| query | string | No | Search term |
| entity | string | Yes | Entity type: "student", "course", or "grade" |
| filters | object | No | Entity-specific filters |
| page | integer | No | Page number (default: 1) |
| page_size | integer | No | Results per page (default: 20, max: 100) |

#### Response - Success (200 OK)

```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": 1,
        "type": "student",
        "first_name": "Alice",
        "last_name": "Johnson",
        "email": "alice@example.com"
      }
    ],
    "page": 1,
    "page_size": 20,
    "total": 1,
    "entity": "student",
    "has_next": false
  },
  "error": null,
  "meta": {"request_id": "req_abc123", "timestamp": "2026-01-17T12:00:00Z"}
}

```text
#### Error Cases

**Invalid entity**

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "INVALID_ENTITY",
    "message": "Entity must be 'student', 'course', or 'grade'",
    "details": null
  },
  "meta": {"request_id": "req_xyz789", "timestamp": "2026-01-17T12:00:00Z"}
}

```text
---

### 5. Search Suggestions

**GET** `/api/v1/search/suggestions?query=A&entity=student`

Get autocomplete suggestions for a given entity type.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| query | string | Yes | Partial search term (min 1 character) |
| entity | string | Yes | Entity type: "student" or "course" |
| limit | integer | No | Max suggestions (default: 10, max: 50) |

#### Response - Success (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Alice Johnson",
      "email": "alice@example.com",
      "type": "student"
    },
    {
      "id": 2,
      "name": "Andrew Smith",
      "email": "andrew@example.com",
      "type": "student"
    }
  ],
  "error": null,
  "meta": {"request_id": "req_abc123", "timestamp": "2026-01-17T12:00:00Z"}
}

```text
#### Examples

**Get student suggestions**

```bash
curl "http://localhost:8000/api/v1/search/suggestions?query=A&entity=student" \
  -H "Authorization: Bearer token"

```text
**Get course suggestions with custom limit**

```bash
curl "http://localhost:8000/api/v1/search/suggestions?query=Math&entity=course&limit=5" \
  -H "Authorization: Bearer token"

```text
---

### 6. Search Statistics

**GET** `/api/v1/search/statistics`

Get statistics about searchable data (total counts by entity type).

#### Response - Success (200 OK)

```json
{
  "success": true,
  "data": {
    "total_students": 150,
    "total_courses": 25,
    "total_grades": 3750,
    "students_by_status": {
      "active": 140,
      "inactive": 10
    },
    "grades_by_range": {
      "excellent": 1500,
      "good": 1500,
      "satisfactory": 600,
      "poor": 150
    }
  },
  "error": null,
  "meta": {"request_id": "req_abc123", "timestamp": "2026-01-17T12:00:00Z"}
}

```text
#### Example

```bash
curl "http://localhost:8000/api/v1/search/statistics" \
  -H "Authorization: Bearer token"

```text
---

## Common Response Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | Query returned results |
| 400 | Bad Request | Invalid query format, too long |
| 401 | Unauthorized | Missing/invalid auth token |
| 403 | Forbidden | No permission for this search |
| 404 | Not Found | Resource doesn't exist |
| 429 | Rate Limited | Too many requests in short time |
| 500 | Server Error | Internal server error |

---

## Rate Limiting

- **Search endpoints**: 10 requests per minute per user
- **Suggestion endpoint**: 30 requests per minute per user
- **Statistics endpoint**: 60 requests per minute per user

Rate limit headers in response:

```text
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 1642419600

```text
---

## Response Format

All responses follow the APIResponse wrapper format:

```json
{
  "success": boolean,
  "data": {
    "results": array,
    "page": number,
    "page_size": number,
    "total": number,
    "has_next": boolean
  },
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": object or null
  },
  "meta": {
    "request_id": "req_xyz789",
    "timestamp": "2026-01-17T12:00:00Z",
    "version": "1.0.0"
  }
}

```text
---

## Best Practices

1. **Pagination**: Always use pagination for large result sets
   ```json
   {"query": "test", "page": 1, "page_size": 50}
   ```

2. **Filtering**: Use filters to narrow results before pagination
   ```json
   {"filters": {"min_grade": 80}, "page": 1}
   ```

3. **Suggestions**: Use suggestions endpoint for autocomplete UI
   ```
   GET /api/v1/search/suggestions?query=A&entity=student
   ```

4. **Query Limits**: Keep query strings under 200 characters
   - Bad: Very long multi-word searches
   - Good: Short, specific search terms

5. **Rate Limits**: Cache results and suggestions when possible
   - Don't make rapid requests for same query
   - Use appropriate page_size to minimize requests

6. **Error Handling**: Always check `success` field
   ```typescript
   if (!response.success) {
     console.error(response.error.message);
   }
   ```

---

## Permissions

| Role | Students | Courses | Grades | Admin |
|------|----------|---------|--------|-------|
| Admin | ✓ | ✓ | ✓ | ✓ |
| Teacher | ✓ | ✓ | ✓ | ✗ |
| Student | Own data | ✓ | Own data | ✗ |

---

## Changelog

### Version 1.0.0 (January 17, 2026)

- Initial release
- 6 search endpoints
- Pagination support
- Advanced filtering
- Rate limiting
- API Response wrapper format

