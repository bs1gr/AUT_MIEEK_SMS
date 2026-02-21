# API Contract Documentation

**Version**: 1.0
**Date**: 2025-12-12
**Status**: Production Ready
**Base URL**: `/api/v1`
**API Version**: v1
**Target Release**: $11.18.3

---

## Table of Contents

1. [Overview](#overview)
2. [API Versioning Strategy](#api-versioning-strategy)
3. [Base URL & Authentication](#base-url--authentication)
4. [Response Format](#response-format)
5. [Error Codes](#error-codes)
6. [Endpoint Categories](#endpoint-categories)
7. [Breaking Change Policy](#breaking-change-policy)
8. [Deprecation Process](#deprecation-process)
9. [Migration Guide](#migration-guide)
10. [Versioning Timeline](#versioning-timeline)
11. [RBAC API and Permission Matrix](#rbac-api-and-permission-matrix)

---

## Overview

The Student Management System provides a RESTful API for managing students, courses, grades, and attendance. This document defines the API contract, versioning strategy, and backward compatibility guarantees.

### Current API Status

- **Current Version**: v1 (Stable)
- **Base Path**: `/api/v1`
- **Status**: Production
- **Support Period**: Until v2 is released + 6 months
- **Stability Guarantee**: All v1 endpoints will remain stable

### API Capabilities

| Capability | v1 | v2+ |
|------------|-----|------|
| Student Management | ✅ | ✅ |
| Course Management | ✅ | ✅ |
| Grades & Attendance | ✅ | ✅ |
| Analytics & Reporting | ✅ | Enhanced |
| Bulk Operations | ❌ | ✅ |
| Advanced Filtering | Limited | ✅ |
| Webhooks | ❌ | ✅ |
| GraphQL | ❌ | ✅ |

---

## API Versioning Strategy

### Version Format

The API follows semantic versioning:

```text
/api/v{MAJOR}

```text
- **MAJOR**: Incremented when breaking changes are introduced
- **MINOR**: Incremented when backward-compatible features are added (not in URL)
- **PATCH**: Incremented for bug fixes and non-API changes (not in URL)

### Version Lifecycle

Each major version follows a standard lifecycle:

```text
v1 Lifecycle (Expected):
├── Release: 2025-01-01
├── Bug Fixes & Small Features: 2025-01-01 → 2025-12-31
├── v2 Released: 2025-12-01
├── Deprecation Period: 2025-12-01 → 2026-06-01 (6 months)
├── Support Ends: 2026-06-01
└── Sunset: 2026-06-01

```text
### Support Matrix

| Version | Released | Support Ends | Status |
|---------|----------|-------------|--------|
| v1 | 2025-01-01 | 2026-06-01 | Current |
| v2 | 2025-12-01 (planned) | TBD | Planned |
| v3 | 2026-06-01 (planned) | TBD | Planned |

---

## Base URL & Authentication

### Base URLs

```text
Development:  http://localhost:8000/api/v1
Production:   https://sms.example.com/api/v1

```text
### Authentication

All API endpoints require authentication via JWT bearer token:

```bash
curl -H "Authorization: Bearer <access_token>" \
     https://api.example.com/api/v1/students

```text
### Token Acquisition

```text
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}

Response:
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer",
  "expires_in": 3600
}

```text
### Rate Limiting

API endpoints are rate-limited to prevent abuse:

```text
Default Limits:
- Read operations:  100 requests/minute per user
- Write operations: 10 requests/minute per user
- Bulk operations:  1 request/minute per user

Headers:
X-RateLimit-Limit:     100
X-RateLimit-Remaining: 95
X-RateLimit-Reset:     1702476960

```text
---

## Response Format

### Success Response (200, 201)

```json
{
  "status": "ok",
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com"
  },
  "meta": {
    "request_id": "req_abc123",
    "timestamp": "2025-12-12T10:30:00Z",
    "version": "1.0"
  }
}

```text
### List Response (200)

```json
{
  "status": "ok",
  "data": [
    { "id": 1, "name": "Student 1" },
    { "id": 2, "name": "Student 2" }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 1500,
    "pages": 75
  },
  "meta": {
    "request_id": "req_abc123",
    "timestamp": "2025-12-12T10:30:00Z"
  }
}

```text
### Error Response (4xx, 5xx)

```json
{
  "status": "error",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "email": ["Email is required"],
      "password": ["Password must be at least 8 characters"]
    }
  },
  "meta": {
    "request_id": "req_abc123",
    "timestamp": "2025-12-12T10:30:00Z"
  }
}

```text
---

## Error Codes

### HTTP Status Codes

| Status | Code | Meaning | Example |
|--------|------|---------|---------|
| 200 | OK | Request succeeded | Student fetched |
| 201 | Created | Resource created | Student created |
| 204 | No Content | Success, no content | Batch operation completed |
| 400 | Bad Request | Invalid input | Missing required field |
| 401 | Unauthorized | Missing/invalid token | Expired JWT |
| 403 | Forbidden | Insufficient permissions | User cannot delete |
| 404 | Not Found | Resource not found | Student doesn't exist |
| 409 | Conflict | State conflict | Email already exists |
| 422 | Unprocessable | Validation failed | Invalid email format |
| 429 | Too Many | Rate limit exceeded | Too many requests |
| 500 | Server Error | Internal error | Unexpected exception |
| 503 | Unavailable | Service down | Database offline |

### API Error Codes

| Code | HTTP | Meaning | Retry | Action |
|------|------|---------|-------|--------|
| VALIDATION_ERROR | 422 | Input validation failed | No | Fix input |
| UNAUTHORIZED | 401 | Authentication failed | No | Re-authenticate |
| FORBIDDEN | 403 | Not authorized for action | No | Request access |
| NOT_FOUND | 404 | Resource doesn't exist | No | Verify ID |
| CONFLICT | 409 | Resource state conflict | No | Resolve conflict |
| RATE_LIMIT | 429 | Too many requests | Yes | Retry later |
| DATABASE_ERROR | 503 | Database operation failed | Yes | Retry later |
| EXTERNAL_SERVICE_ERROR | 503 | External service down | Yes | Retry later |
| INTERNAL_ERROR | 500 | Unexpected error | Maybe | Check logs |

---

## Endpoint Categories

### 1. Authentication Endpoints

#### Login

```text
POST /auth/login
Content-Type: application/json

Request:
{
  "email": "user@example.com",
  "password": "password"
}

Response: 200 OK
{
  "status": "ok",
  "data": {
    "access_token": "eyJ0eXAi...",
    "refresh_token": "eyJ0eXAi...",
    "token_type": "bearer",
    "expires_in": 3600
  }
}

```text
#### Refresh Token

```text
POST /auth/refresh
Authorization: Bearer <refresh_token>

Response: 200 OK
{
  "status": "ok",
  "data": {
    "access_token": "eyJ0eXAi...",
    "token_type": "bearer",
    "expires_in": 3600
  }
}

```text
### 2. Student Endpoints

#### List Students

```text
GET /students?page=1&per_page=20&active=true
Authorization: Bearer <token>

Response: 200 OK
{
  "status": "ok",
  "data": [
    {
      "id": 1,
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "student_id": "STU001",
      "is_active": true,
      "enrollment_date": "2025-09-01"
    }
  ],
  "pagination": { "page": 1, "per_page": 20, "total": 150 }
}

```text
#### Get Student

```text
GET /students/{id}
Authorization: Bearer <token>

Response: 200 OK
{
  "status": "ok",
  "data": {
    "id": 1,
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "student_id": "STU001",
    "is_active": true,
    "father_name": "James Doe",
    "mobile_phone": "+30 6900000000",
    "enrollment_date": "2025-09-01"
  }
}

```text
#### Create Student

```text
POST /students
Authorization: Bearer <token>
Content-Type: application/json

Request:
{
  "first_name": "Jane",
  "last_name": "Smith",
  "email": "jane@example.com",
  "student_id": "STU002",
  "enrollment_date": "2025-09-01"
}

Response: 201 Created
{
  "status": "ok",
  "data": {
    "id": 2,
    "first_name": "Jane",
    "last_name": "Smith",
    "email": "jane@example.com",
    "student_id": "STU002",
    "created_at": "2025-12-12T10:30:00Z"
  }
}

```text
#### Update Student

```text
PUT /students/{id}
Authorization: Bearer <token>
Content-Type: application/json

Request:
{
  "first_name": "Jane",
  "last_name": "Smith",
  "is_active": true
}

Response: 200 OK
{
  "status": "ok",
  "data": {
    "id": 2,
    "first_name": "Jane",
    "last_name": "Smith",
    "email": "jane@example.com",
    "updated_at": "2025-12-12T10:31:00Z"
  }
}

```text
#### Delete Student

```text
DELETE /students/{id}
Authorization: Bearer <token>

Response: 204 No Content

```text
### 3. Course Endpoints

#### List Courses

```text
GET /courses?semester=Fall2025&page=1
Authorization: Bearer <token>

Response: 200 OK
{
  "status": "ok",
  "data": [
    {
      "id": 1,
      "course_code": "CS101",
      "course_name": "Introduction to Programming",
      "semester": "Fall2025",
      "credits": 3,
      "hours_per_week": 3,
      "absence_penalty": 0.5
    }
  ],
  "pagination": { "page": 1, "per_page": 20, "total": 45 }
}

```text
#### Get Course

```text
GET /courses/{id}
Authorization: Bearer <token>

Response: 200 OK
{
  "status": "ok",
  "data": {
    "id": 1,
    "course_code": "CS101",
    "course_name": "Introduction to Programming",
    "semester": "Fall2025",
    "credits": 3,
    "description": "Basic programming concepts",
    "hours_per_week": 3,
    "absence_penalty": 0.5,
    "evaluation_rules": {
      "midterm": 0.3,
      "final": 0.4,
      "participation": 0.3
    }
  }
}

```text
### 4. Grade Endpoints

#### List Grades

```text
GET /grades?student_id=1&course_id=1&page=1
Authorization: Bearer <token>

Response: 200 OK
{
  "status": "ok",
  "data": [
    {
      "id": 1,
      "student_id": 1,
      "course_id": 1,
      "assignment_name": "Assignment 1",
      "category": "assignment",
      "grade": 85,
      "max_grade": 100,
      "weight": 0.1,
      "date_submitted": "2025-12-10"
    }
  ]
}

```text
#### Create Grade

```text
POST /grades
Authorization: Bearer <token>
Content-Type: application/json

Request:
{
  "student_id": 1,
  "course_id": 1,
  "assignment_name": "Final Exam",
  "category": "exam",
  "grade": 92,
  "max_grade": 100,
  "weight": 0.4,
  "date_submitted": "2025-12-12"
}

Response: 201 Created
{
  "status": "ok",
  "data": {
    "id": 50,
    "student_id": 1,
    "course_id": 1,
    "assignment_name": "Final Exam",
    "grade": 92,
    "created_at": "2025-12-12T10:30:00Z"
  }
}

```text
### 5. Attendance Endpoints

#### List Attendance

```text
GET /attendances?student_id=1&course_id=1&start_date=2025-12-01&end_date=2025-12-15
Authorization: Bearer <token>

Response: 200 OK
{
  "status": "ok",
  "data": [
    {
      "id": 1,
      "student_id": 1,
      "course_id": 1,
      "date": "2025-12-10",
      "status": "Present",
      "period_number": 1
    }
  ]
}

```text
#### Record Attendance

```text
POST /attendances
Authorization: Bearer <token>
Content-Type: application/json

Request:
{
  "student_id": 1,
  "course_id": 1,
  "date": "2025-12-12",
  "status": "Present",
  "period_number": 1
}

Response: 201 Created
{
  "status": "ok",
  "data": {
    "id": 100,
    "student_id": 1,
    "course_id": 1,
    "date": "2025-12-12",
    "status": "Present"
  }
}

```text
---

## Breaking Change Policy

### What is a Breaking Change?

A change is **breaking** if it requires client code modifications:

| Change | Breaking? | Example |
|--------|-----------|---------|
| New endpoint | No | Add `/students/{id}/achievements` |
| Add optional parameter | No | Add `?include_deleted=true` |
| Add optional response field | No | Add `"phone"` field to student |
| Remove endpoint | Yes | Remove `/students` |
| Remove response field | Yes | Remove `"email"` from response |
| Change field type | Yes | Change `age: int` to `age: string` |
| Change response structure | Yes | Flatten nested object |
| Change required parameter | Yes | Make `email` required |
| Change HTTP method | Yes | Change POST to GET |
| Change URL path | Yes | Change `/students` to `/user` |

### Breaking Change Notification

Breaking changes require:

1. **6-month deprecation period**
2. **2 weeks advance notice** via:
   - Email to all API users
   - Changelog entry
   - Deprecation headers in responses
   - API documentation updates

3. **Example deprecation header:**
   ```
   Deprecation: true
   Sunset: Sun, 15 Jun 2026 23:59:59 GMT
   Link: </api/v2/students>; rel="successor-version"
   ```

---

## Deprecation Process

### Phase 1: Announcement (Month 1)

```text
Email: "API Endpoint Deprecation Notice"

Subject: Important - /students endpoint will be deprecated

Dear API User,

We're planning to deprecate the /students endpoint in 6 months
(June 2026) in favor of /users/students.

Action Required:
- Review migration guide: https://docs.example.com/migration-v2
- Test with v2 endpoints
- Update your integration
- Contact support with questions

Timeline:
- v1 deprecation announced: Dec 2025
- v1 endpoints still fully supported: Dec 2025 - June 2026
- v1 support ends: June 2026

```text
### Phase 2: Dual Support (Months 2-6)

Both v1 and v2 endpoints work:

```text
v1 (deprecated):  GET /api/v1/students
v2 (preferred):   GET /api/v2/students

Both return same data, headers indicate deprecation.

```text
### Phase 3: Sunset (Month 7+)

```text
v1 endpoints: Returns 410 Gone
v2 endpoints: Only option

```text
Example sunset response:

```text
HTTP/1.1 410 Gone

{
  "status": "error",
  "error": {
    "code": "ENDPOINT_DEPRECATED",
    "message": "This endpoint is no longer supported",
    "successor": "/api/v2/students",
    "details": {
      "sunset_date": "2026-06-15",
      "migration_guide": "https://docs.example.com/migration-v2"
    }
  }
}

```text
---

## Migration Guide

### v1 → v2 (Planned)

#### Endpoint Changes

| v1 | v2 | Change |
|----|----|--------|
| `/students` | `/students` | Structure improved |
| `/grades` | `/grades` | Added categorization |
| `/analytics/dashboard` | `/reports/dashboard` | New reporting system |

#### Response Changes

**v1 Response:**

```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+30 6900000000"
}

```text
**v2 Response:**

```json
{
  "id": 1,
  "first_name": "John",
  "last_name": "Doe",
  "contact": {
    "email": "john@example.com",
    "phone": "+30 6900000000"
  }
}

```text
#### Migration Steps

1. Identify v1 endpoints in use
2. Review v2 documentation
3. Update code to use v2 endpoints
4. Test with v2 endpoints
5. Deploy updated code during v1 support period
6. Monitor for issues

---

## Versioning Timeline

### Release Calendar

| Date | Version | Status | Action |
|------|---------|--------|--------|
| 2025-01-01 | $11.18.3 | Released | Initial release |
| 2025-12-12 | $11.18.3 | Current | Bug fixes, minor features |
| 2026-01-01 | $11.18.3 (planned) | Release | Breaking changes allowed |
| 2026-06-01 | v1 Sunset | Deprecated | v1 endpoints return 410 |
| 2026-06-01 | v2 Current | Stable | Full support |

### Support Timeline

```text
v1.x.x:  2025-01-01 -------- 2026-06-01 (18 months)
  Active    [========]    Deprecated
              Dec'25        Jun'26

v2.x.x:          2026-01-01 -------- 2026-12-01 (planned)
  Alpha/Beta      [=======]  Release
                   Dec'25      Dec'26

```text
---

## API Stability Commitment

We commit to:

1. ✅ All v1 endpoints remain available until June 2026
2. ✅ No breaking changes without 6-month notice
3. ✅ At least 2 major versions supported simultaneously
4. ✅ Clear deprecation headers and messages
5. ✅ Migration guides for all breaking changes
6. ✅ API compatibility tests in CI/CD
7. ✅ Backward compatibility for 1+ year minimum

---

## Contacting Support

- 📧 Email: api-support@example.com
- 💬 Slack: #api-support
- 🐛 Issues: https://github.com/bs1gr/AUT_MIEEK_SMS/issues
- 📖 Docs: https://docs.example.com/api

---

## RBAC API and Permission Matrix

See `RBAC_API_MATRIX.md` for a full list of RBAC endpoints and required permissions.

- All RBAC endpoints are under `/admin/rbac/`
- Role and Permission CRUD endpoints:
  - `POST   /admin/rbac/roles`           — Create a new role (permission: `rbac.roles.create`)
  - `GET    /admin/rbac/roles`           — List all roles (permission: `rbac.roles.read`)
  - `PUT    /admin/rbac/roles/{role_id}` — Update a role (permission: `rbac.roles.update`)
  - `DELETE /admin/rbac/roles/{role_id}` — Delete a role (permission: `rbac.roles.delete`)
  - `POST   /admin/rbac/permissions`                — Create a new permission (permission: `rbac.permissions.create`)
  - `GET    /admin/rbac/permissions`                — List all permissions (permission: `rbac.permissions.read`)
  - `PUT    /admin/rbac/permissions/{permission_id}`— Update a permission (permission: `rbac.permissions.update`)
  - `DELETE /admin/rbac/permissions/{permission_id}`— Delete a permission (permission: `rbac.permissions.delete`)
- Assignment and grant/revoke endpoints require wildcard (`*`) permission (admin only).
- See also: `docs/api/RBAC_API_MATRIX.md` for a permission matrix table.

---
