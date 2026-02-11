# API Examples

**Status**: Draft (Initial Skeleton)
**Last Updated**: 2025-11-16
**Applies To**: $11.9.7+

Concise examples of common API interactions. Replace placeholder values where noted.

---

## 1. Authentication (JWT)

### Login (obtain token)

```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "teacher1", "password": "CorrectHorseBatteryStaple1!"}'

```text
Successful response (200):

```json
{
  "access_token": "<jwt>",
  "token_type": "bearer",
  "expires_in": 3600
}

```text
### Authenticated request

```bash
curl -X GET "http://localhost:8000/api/v1/students" \
  -H "Authorization: Bearer <jwt>" \
  -H "Accept-Language: en"

```text
---

## 2. Error Response (Validation)

Example: submitting an invalid grade (greater than max).

```bash
curl -X POST "http://localhost:8000/api/v1/grades" \
  -H "Content-Type: application/json" \
  -d '{"student_id": 1, "course_id": 5, "grade": 105, "max_grade": 100}'

```text
Failure (422):

```json
{
  "detail": [
    {
      "type": "value_error",
      "msg": "grade must be <= max_grade",
      "loc": ["body", "grade"],
      "error_id": "GRADE_VALIDATION_ERROR"
    }
  ]
}

```text
---

## 3. Rate Limiting Example

After exceeding allowed requests:

```json
{
  "detail": "Rate limit exceeded",
  "error_id": "RATE_LIMIT_EXCEEDED",
  "retry_after": 30
}

```text
Headers to inspect:

- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `Retry-After`

---

## 4. Caching Behavior (GET)

First request (uncached):

```bash
curl -w '\nTime: %{time_total}\n' -X GET "http://localhost:8000/api/v1/courses"

```text
Second request (cached within TTL): Should have reduced `time_total`.

---

## 5. Internationalization (Accept-Language)

```bash
curl -X GET "http://localhost:8000/api/v1/students" -H "Accept-Language: el"

```text
Expect translated headers / localized strings where supported.

---

## 6. Pagination (If Implemented)

```bash
curl -X GET "http://localhost:8000/api/v1/students?page=2&limit=25"

```text
Response shape (example):

```json
{
  "items": [],
  "page": 2,
  "limit": 25,
  "total": 143
}

```text
---

## 7. Common HTTP Status Codes

| Status | Meaning | Typical Cause |
|--------|---------|---------------|
| 200 | OK | Successful operation |
| 201 | Created | Resource creation (POST) |
| 400 | Bad Request | Invalid query params / business rule violation |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Authenticated but insufficient role |
| 404 | Not Found | Resource does not exist |
| 422 | Unprocessable Entity | Validation error (Pydantic) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unhandled exception |

---

## 8. Stable Error IDs

Errors include `error_id` fields (examples):

- `GRADE_VALIDATION_ERROR`
- `RATE_LIMIT_EXCEEDED`
- `AUTH_INVALID_CREDENTIALS`
- `RESOURCE_NOT_FOUND`

Use these for client-side localization and reliable condition handling.

---

## 9. Future Enhancements

- Add more domain-specific examples (attendance, daily performance)
- Document bulk import endpoints
- Add Swagger example references in schemas
- Include response for soft-deleted entities

---

**Reference**: See `docs/DOCUMENTATION_INDEX.md` for full documentation set.
