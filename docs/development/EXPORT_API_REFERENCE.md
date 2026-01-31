# Export System API Reference

**Version**: 1.17.6
**Last Updated**: February 1, 2026
**Status**: Production Ready

This document provides complete API reference for the export system, including all endpoints for job management, scheduling, performance monitoring, and configuration.

---

## Table of Contents

1. [Authentication](#authentication)
2. [Export Jobs API](#export-jobs-api)
3. [Export Schedules API](#export-schedules-api)
4. [Performance Metrics API](#performance-metrics-api)
5. [Configuration API](#configuration-api)
6. [Common Responses](#common-responses)
7. [Error Handling](#error-handling)
8. [Examples](#examples)

---

## Authentication

All endpoints require Bearer token authentication:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     https://your-domain/api/v1/import-export/...
```

**Getting a token:**
```bash
curl -X POST https://your-domain/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "your-password"
  }'
```

---

## Export Jobs API

### 1. Create Export Job

**Endpoint**: `POST /api/v1/import-export/exports`

**Required Permission**: `exports:generate`

**Query Parameters:**
| Parameter | Type | Default | Values | Description |
|-----------|------|---------|--------|-------------|
| export_format | string | excel | excel, csv, pdf | Export file format |

**Request Body:**
```json
{
  "export_type": "students",
  "file_format": "csv",
  "filters": {
    "status": "active",
    "enrollment_type": "regular"
  }
}
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| export_type | string | Yes | Entity type: students, courses, grades |
| file_format | string | Yes | File format: csv, excel, pdf |
| filters | object | No | Filter conditions (see Filters section) |

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": 42,
    "export_type": "students",
    "file_format": "csv",
    "status": "pending",
    "created_at": "2026-02-01T15:30:00Z",
    "file_url": null
  },
  "meta": {
    "request_id": "req_abc123",
    "timestamp": "2026-02-01T15:30:00Z"
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:8080/api/v1/import-export/exports?export_format=csv \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "export_type": "students",
    "file_format": "csv",
    "filters": {"status": "active"}
  }'
```

---

### 2. List Export Jobs

**Endpoint**: `GET /api/v1/import-export/exports`

**Required Permission**: `exports:view`

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| skip | integer | 0 | Number of records to skip |
| limit | integer | 100 | Number of records to return |
| export_type | string | - | Filter by entity type |
| status | string | - | Filter by status (pending, processing, completed, failed) |

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "exports": [
      {
        "id": 42,
        "export_type": "students",
        "file_format": "csv",
        "status": "completed",
        "progress_percent": 100,
        "file_size_bytes": 125432,
        "duration_seconds": 2.3,
        "created_at": "2026-02-01T15:30:00Z",
        "completed_at": "2026-02-01T15:30:02Z",
        "file_url": "/api/v1/import-export/exports/42/download"
      }
    ],
    "total": 1,
    "skip": 0,
    "limit": 100
  }
}
```

**Example:**
```bash
curl -X GET "http://localhost:8080/api/v1/import-export/exports?status=completed&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

---

### 3. Get Export Job Details

**Endpoint**: `GET /api/v1/import-export/exports/{id}`

**Required Permission**: `exports:view`

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Export job ID |

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": 42,
    "export_type": "students",
    "file_format": "csv",
    "status": "completed",
    "progress_percent": 100,
    "file_size_bytes": 125432,
    "duration_seconds": 2.3,
    "created_at": "2026-02-01T15:30:00Z",
    "completed_at": "2026-02-01T15:30:02Z",
    "file_url": "/api/v1/import-export/exports/42/download",
    "error_message": null,
    "record_count": 1234,
    "filters_applied": {
      "status": "active"
    }
  }
}
```

**Example:**
```bash
curl -X GET http://localhost:8080/api/v1/import-export/exports/42 \
  -H "Authorization: Bearer $TOKEN"
```

---

### 4. Download Export File

**Endpoint**: `GET /api/v1/import-export/exports/{id}/download`

**Required Permission**: `exports:download`

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Export job ID |

**Response** (200 OK):
- Returns file content with appropriate MIME type
- Headers: `Content-Disposition: attachment; filename="students_20260201.csv"`

**Example:**
```bash
curl -X GET http://localhost:8080/api/v1/import-export/exports/42/download \
  -H "Authorization: Bearer $TOKEN" \
  -o students_export.csv
```

---

### 5. Delete Export Job

**Endpoint**: `DELETE /api/v1/import-export/exports/{id}`

**Required Permission**: `exports:delete`

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Export job ID |

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": 42,
    "deleted": true,
    "message": "Export job deleted successfully"
  }
}
```

**Example:**
```bash
curl -X DELETE http://localhost:8080/api/v1/import-export/exports/42 \
  -H "Authorization: Bearer $TOKEN"
```

---

## Export Schedules API

### 1. Create Scheduled Export

**Endpoint**: `POST /api/v1/import-export/schedules`

**Required Permission**: `exports:schedule`

**Request Body:**
```json
{
  "name": "Daily Student Export",
  "export_type": "students",
  "file_format": "csv",
  "frequency": "DAILY",
  "cron_expression": null,
  "filters": {
    "status": "active"
  },
  "enabled": true
}
```

**Parameters:**
| Field | Type | Required | Values | Description |
|-------|------|----------|--------|-------------|
| name | string | Yes | - | Schedule name |
| export_type | string | Yes | students, courses, grades | Entity type |
| file_format | string | Yes | excel, csv, pdf | Export format |
| frequency | string | Yes | HOURLY, DAILY, WEEKLY, MONTHLY, CUSTOM | Schedule frequency |
| cron_expression | string | If CUSTOM | Cron expression | Custom schedule (e.g., "0 2 * * *" = 2 AM daily) |
| filters | object | No | - | Export filters |
| enabled | boolean | No | true/false | Enable/disable schedule |

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": 5,
    "name": "Daily Student Export",
    "export_type": "students",
    "file_format": "csv",
    "frequency": "DAILY",
    "next_run": "2026-02-02T00:00:00Z",
    "last_run": null,
    "enabled": true,
    "created_at": "2026-02-01T15:45:00Z"
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:8080/api/v1/import-export/schedules \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Daily Student Export",
    "export_type": "students",
    "file_format": "csv",
    "frequency": "DAILY",
    "filters": {"status": "active"}
  }'
```

---

### 2. List Schedules

**Endpoint**: `GET /api/v1/import-export/schedules`

**Required Permission**: `exports:view`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| skip | integer | Number to skip |
| limit | integer | Number to return |
| enabled | boolean | Filter by enabled status |

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "schedules": [
      {
        "id": 5,
        "name": "Daily Student Export",
        "export_type": "students",
        "file_format": "csv",
        "frequency": "DAILY",
        "next_run": "2026-02-02T00:00:00Z",
        "last_run": "2026-02-01T00:00:00Z",
        "enabled": true,
        "created_at": "2026-02-01T15:45:00Z"
      }
    ],
    "total": 1
  }
}
```

---

### 3. Update Schedule

**Endpoint**: `PUT /api/v1/import-export/schedules/{id}`

**Required Permission**: `exports:schedule`

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Schedule ID |

**Request Body:** (same as create, all fields optional)
```json
{
  "name": "Updated Daily Student Export",
  "frequency": "WEEKLY",
  "enabled": false
}
```

**Example:**
```bash
curl -X PUT http://localhost:8080/api/v1/import-export/schedules/5 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'
```

---

### 4. Delete Schedule

**Endpoint**: `DELETE /api/v1/import-export/schedules/{id}`

**Required Permission**: `exports:schedule`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {"deleted": true}
}
```

---

## Performance Metrics API

### 1. Get Performance Statistics

**Endpoint**: `GET /api/v1/import-export/metrics`

**Required Permission**: `exports:view`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| days | integer | Last N days (default: 7) |
| export_type | string | Filter by type |

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "metrics": {
      "total_exports": 42,
      "successful": 41,
      "failed": 1,
      "success_rate": 0.976,
      "avg_duration_seconds": 2.3,
      "avg_records_per_second": 5420,
      "total_bytes_exported": 52345678,
      "by_format": {
        "excel": {"count": 20, "avg_duration": 3.1},
        "csv": {"count": 15, "avg_duration": 1.2},
        "pdf": {"count": 7, "avg_duration": 2.5}
      },
      "by_entity": {
        "students": {"count": 25, "avg_duration": 2.1},
        "courses": {"count": 10, "avg_duration": 1.8},
        "grades": {"count": 7, "avg_duration": 2.6}
      }
    },
    "period": {
      "start": "2026-01-25T00:00:00Z",
      "end": "2026-02-01T23:59:59Z",
      "days": 7
    }
  }
}
```

---

### 2. Get Slowest Exports

**Endpoint**: `GET /api/v1/import-export/metrics/slowest`

**Required Permission**: `exports:view`

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | integer | 10 | Number of results |
| days | integer | 7 | Historical period |

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "slowest": [
      {
        "export_id": 38,
        "export_type": "grades",
        "file_format": "pdf",
        "duration_seconds": 5.2,
        "record_count": 3245,
        "created_at": "2026-01-30T10:15:00Z"
      }
    ]
  }
}
```

---

## Configuration API

### 1. Get Export Settings

**Endpoint**: `GET /api/v1/import-export/settings`

**Required Permission**: `exports:admin`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "retention_days": 30,
    "auto_cleanup_enabled": true,
    "cleanup_schedule": "0 2 * * *",
    "archive_old_exports": true,
    "email_notifications_enabled": true,
    "max_concurrent_exports": 5,
    "export_timeout_seconds": 300
  }
}
```

---

### 2. Update Export Settings

**Endpoint**: `PUT /api/v1/import-export/settings`

**Required Permission**: `exports:admin`

**Request Body:**
```json
{
  "retention_days": 45,
  "auto_cleanup_enabled": true,
  "archive_old_exports": true,
  "email_notifications_enabled": true,
  "max_concurrent_exports": 10
}
```

**Example:**
```bash
curl -X PUT http://localhost:8080/api/v1/import-export/settings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "retention_days": 45,
    "max_concurrent_exports": 10
  }'
```

---

## Common Responses

### Success Response Format

```json
{
  "success": true,
  "data": {
    "id": 42,
    "status": "completed"
  },
  "error": null,
  "meta": {
    "request_id": "req_abc123",
    "timestamp": "2026-02-01T15:30:00Z",
    "version": "1.17.6"
  }
}
```

### Error Response Format

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "EXPORT_NOT_FOUND",
    "message": "Export job with id 999 not found",
    "details": {
      "export_id": 999,
      "available_ids": [1, 2, 3]
    }
  },
  "meta": {
    "request_id": "req_xyz789",
    "timestamp": "2026-02-01T15:30:00Z"
  }
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | OK | Export retrieved successfully |
| 201 | Created | New export job created |
| 400 | Bad Request | Invalid filter format |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Export job not found |
| 409 | Conflict | Duplicate schedule name |
| 422 | Validation Error | Invalid export_format parameter |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Internal server error |
| 503 | Service Unavailable | Scheduler offline |

### Common Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| EXPORT_NOT_FOUND | 404 | Export job doesn't exist |
| INVALID_FORMAT | 422 | Invalid export_format value |
| INVALID_FILTERS | 400 | Invalid filter syntax |
| PERMISSION_DENIED | 403 | User lacks permission |
| SCHEDULE_EXISTS | 409 | Schedule name already exists |
| SCHEDULER_OFFLINE | 503 | Export scheduler not running |
| EXPORT_TIMEOUT | 504 | Export took too long |

---

## Examples

### Complete Workflow: Create and Monitor Export

```bash
#!/bin/bash

TOKEN="your_jwt_token"
BASE_URL="http://localhost:8080/api/v1"

# 1. Create export
echo "Creating export..."
RESPONSE=$(curl -s -X POST "$BASE_URL/import-export/exports?export_format=csv" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "export_type": "students",
    "file_format": "csv",
    "filters": {"status": "active"}
  }')

EXPORT_ID=$(echo $RESPONSE | jq '.data.id')
echo "Export created with ID: $EXPORT_ID"

# 2. Poll for completion
while true; do
  STATUS_RESPONSE=$(curl -s -X GET "$BASE_URL/import-export/exports/$EXPORT_ID" \
    -H "Authorization: Bearer $TOKEN")

  STATUS=$(echo $STATUS_RESPONSE | jq -r '.data.status')
  PROGRESS=$(echo $STATUS_RESPONSE | jq '.data.progress_percent')

  echo "Status: $STATUS ($PROGRESS%)"

  if [ "$STATUS" = "completed" ] || [ "$STATUS" = "failed" ]; then
    break
  fi

  sleep 2
done

# 3. Download file
if [ "$STATUS" = "completed" ]; then
  echo "Downloading export..."
  curl -X GET "$BASE_URL/import-export/exports/$EXPORT_ID/download" \
    -H "Authorization: Bearer $TOKEN" \
    -o "export_$EXPORT_ID.csv"
  echo "File saved to export_$EXPORT_ID.csv"
fi
```

### Create Recurring Export Schedule

```bash
curl -X POST http://localhost:8080/api/v1/import-export/schedules \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Weekly Grade Report",
    "export_type": "grades",
    "file_format": "pdf",
    "frequency": "WEEKLY",
    "filters": {
      "course_code": "CS101"
    },
    "enabled": true
  }'
```

### Get Performance Report

```bash
curl -X GET "http://localhost:8080/api/v1/import-export/metrics?days=30" \
  -H "Authorization: Bearer $TOKEN" | jq '.data.metrics | {
    total_exports,
    success_rate,
    avg_duration_seconds,
    by_format
  }'
```

---

## Permissions Required

| Operation | Permission | Description |
|-----------|-----------|-------------|
| Create Export | exports:generate | Trigger new export jobs |
| View Exports | exports:view | List and view export details |
| Download File | exports:download | Download export files |
| Delete Export | exports:delete | Delete export jobs |
| Create Schedule | exports:schedule | Create scheduled exports |
| Update Settings | exports:admin | Modify export configuration |

---

## Rate Limiting

- **Exports per minute**: 10 (configurable)
- **Metrics queries per minute**: 60 (unlimited for admins)
- **Schedule operations per minute**: 5

---

**For more information, see:**
- [EXPORT_ENHANCEMENTS_COMPLETE.md](EXPORT_ENHANCEMENTS_COMPLETE.md)
- [EXPORT_ENHANCEMENTS_COMPLETION_SUMMARY.md](EXPORT_ENHANCEMENTS_COMPLETION_SUMMARY.md)
