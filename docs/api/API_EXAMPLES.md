# API Request/Response Examples

**Version**: 1.11.1  
**Last Updated**: 2025-12-11  
**Base URL**: `http://localhost:8080/api/v1` (Docker) or `http://localhost:8000/api/v1` (native)

This guide provides curl examples and response payloads for common API workflows.

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Students](#2-students)
3. [Courses](#3-courses)
4. [Grades](#4-grades)
5. [Attendance](#5-attendance)
6. [Analytics](#6-analytics)
7. [Audit Logs](#7-audit-logs)
8. [Jobs & Background Tasks](#8-jobs--background-tasks)
9. [Reports](#9-reports)
10. [Imports](#10-imports)
11. [Exports](#11-exports)
12. [Highlights](#12-highlights)
13. [Performance](#13-performance)
14. [Enrollments](#14-enrollments)
15. [RBAC (Role-Based Access Control)](#15-rbac-role-based-access-control)
16. [Sessions](#16-sessions)
17. [Error Handling](#17-error-handling)
18. [Rate Limiting](#18-rate-limiting)

---

## 1. Authentication

### 1.1 Login

**Request:**
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "securepassword123"
  }'
```

**Response (201 Created):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "admin@example.com",
    "role": "admin",
    "first_name": "Admin",
    "last_name": "User"
  }
}
```

**Error Response (401 Unauthorized):**
```json
{
  "detail": "Invalid email or password"
}
```

---

### 1.2 Get Current User

**Request:**
```bash
curl -X GET http://localhost:8080/api/v1/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response (200 OK):**
```json
{
  "id": 1,
  "email": "admin@example.com",
  "role": "admin",
  "first_name": "Admin",
  "last_name": "User"
}
```

---

### 1.3 Logout

**Request:**
```bash
curl -X POST http://localhost:8080/api/v1/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response (200 OK):**
```json
{
  "detail": "Logged out successfully"
}
```

---

### 1.4 Refresh Token

**Request:**
```bash
curl -X POST http://localhost:8080/api/v1/auth/refresh \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

---

## 2. Students

### 2.1 List All Students

**Request:**
```bash
curl -X GET "http://localhost:8080/api/v1/students?skip=0&limit=10&search=john" \
  -H "Authorization: Bearer TOKEN"
```

**Query Parameters:**
- `skip`: Pagination offset (default: 0)
- `limit`: Page size (default: 10, max: 1000)
- `search`: Filter by first/last name or email
- `study_year`: Filter by year (1-4)
- `is_active`: Filter by status (true/false)

**Response (200 OK):**
```json
{
  "items": [
    {
      "id": 1,
      "student_id": "S001",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john.doe@example.com",
      "phone": "+30 210 1234567",
      "address": "123 Main St",
      "enrollment_date": "2023-09-01",
      "study_year": 2,
      "is_active": true,
      "created_at": "2023-09-01T10:00:00",
      "updated_at": "2025-12-11T15:30:00"
    }
  ],
  "total": 1,
  "skip": 0,
  "limit": 10
}
```

---

### 2.2 Get Student by ID

**Request:**
```bash
curl -X GET http://localhost:8080/api/v1/students/1 \
  -H "Authorization: Bearer TOKEN"
```

**Response (200 OK):**
```json
{
  "id": 1,
  "student_id": "S001",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com",
  "phone": "+30 210 1234567",
  "address": "123 Main St",
  "enrollment_date": "2023-09-01",
  "study_year": 2,
  "is_active": true,
  "created_at": "2023-09-01T10:00:00",
  "updated_at": "2025-12-11T15:30:00"
}
```

---

### 2.3 Create Student

**Request:**
```bash
curl -X POST http://localhost:8080/api/v1/students \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "student_id": "S002",
    "first_name": "Jane",
    "last_name": "Smith",
    "email": "jane.smith@example.com",
    "phone": "+30 210 9876543",
    "address": "456 Oak Ave",
    "enrollment_date": "2024-09-01",
    "study_year": 1
  }'
```

**Validation Rules:**
- `student_id`: Unique, alphanumeric, max 50 chars
- `email`: Valid email format, unique
- `study_year`: 1-4
- `phone`: Optional, max 20 chars

**Response (201 Created):**
```json
{
  "id": 2,
  "student_id": "S002",
  "first_name": "Jane",
  "last_name": "Smith",
  "email": "jane.smith@example.com",
  "phone": "+30 210 9876543",
  "address": "456 Oak Ave",
  "enrollment_date": "2024-09-01",
  "study_year": 1,
  "is_active": true,
  "created_at": "2025-12-11T15:45:00",
  "updated_at": "2025-12-11T15:45:00"
}
```

**Error Response (400 Bad Request):**
```json
{
  "detail": "Student with ID S002 already exists"
}
```

---

### 2.4 Update Student

**Request:**
```bash
curl -X PUT http://localhost:8080/api/v1/students/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "first_name": "Jonathan",
    "study_year": 3
  }'
```

**Response (200 OK):**
```json
{
  "id": 1,
  "student_id": "S001",
  "first_name": "Jonathan",
  "last_name": "Doe",
  "email": "john.doe@example.com",
  "phone": "+30 210 1234567",
  "address": "123 Main St",
  "enrollment_date": "2023-09-01",
  "study_year": 3,
  "is_active": true,
  "created_at": "2023-09-01T10:00:00",
  "updated_at": "2025-12-11T16:00:00"
}
```

---

### 2.5 Delete Student (Soft Delete)

**Request:**
```bash
curl -X DELETE http://localhost:8080/api/v1/students/1 \
  -H "Authorization: Bearer TOKEN"
```

**Response (204 No Content):**
```
(empty)
```

---

## 3. Courses

### 3.1 List All Courses

**Request:**
```bash
curl -X GET "http://localhost:8080/api/v1/courses?skip=0&limit=20&semester=Fall%202024" \
  -H "Authorization: Bearer TOKEN"
```

**Query Parameters:**
- `skip`: Pagination offset
- `limit`: Page size
- `semester`: Filter by semester
- `is_active`: Filter by status

**Response (200 OK):**
```json
{
  "items": [
    {
      "id": 1,
      "course_code": "CS101",
      "course_name": "Introduction to Computer Science",
      "semester": "Fall 2024",
      "credits": 3,
      "absence_penalty": 2.0,
      "is_active": true,
      "created_at": "2024-08-15T09:00:00",
      "updated_at": "2025-12-11T10:00:00"
    }
  ],
  "total": 1,
  "skip": 0,
  "limit": 20
}
```

---

### 3.2 Get Course by ID

**Request:**
```bash
curl -X GET http://localhost:8080/api/v1/courses/1 \
  -H "Authorization: Bearer TOKEN"
```

**Response (200 OK):**
```json
{
  "id": 1,
  "course_code": "CS101",
  "course_name": "Introduction to Computer Science",
  "semester": "Fall 2024",
  "credits": 3,
  "absence_penalty": 2.0,
  "is_active": true,
  "created_at": "2024-08-15T09:00:00",
  "updated_at": "2025-12-11T10:00:00"
}
```

---

### 3.3 Create Course

**Request:**
```bash
curl -X POST http://localhost:8080/api/v1/courses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "course_code": "CS102",
    "course_name": "Data Structures",
    "semester": "Spring 2025",
    "credits": 4,
    "absence_penalty": 1.5
  }'
```

**Validation Rules:**
- `course_code`: Unique, alphanumeric, max 10 chars
- `course_name`: Non-empty, max 255 chars
- `credits`: 1-20
- `absence_penalty`: 0-5

**Response (201 Created):**
```json
{
  "id": 2,
  "course_code": "CS102",
  "course_name": "Data Structures",
  "semester": "Spring 2025",
  "credits": 4,
  "absence_penalty": 1.5,
  "is_active": true,
  "created_at": "2025-12-11T15:50:00",
  "updated_at": "2025-12-11T15:50:00"
}
```

---

## 4. Grades

### 4.1 List Grades by Student & Course

**Request:**
```bash
curl -X GET "http://localhost:8080/api/v1/grades/student/1/course/1" \
  -H "Authorization: Bearer TOKEN"
```

**Response (200 OK):**
```json
{
  "items": [
    {
      "id": 1,
      "student_id": 1,
      "course_id": 1,
      "grade": 18.5,
      "max_grade": 20.0,
      "component_type": "Midterm Exam",
      "weight": 0.4,
      "date_assigned": "2024-10-15",
      "date_submitted": "2024-10-15T14:00:00",
      "is_active": true,
      "created_at": "2024-10-15T14:00:00",
      "updated_at": "2024-10-15T14:00:00"
    },
    {
      "id": 2,
      "student_id": 1,
      "course_id": 1,
      "grade": 17.0,
      "max_grade": 20.0,
      "component_type": "Final Exam",
      "weight": 0.6,
      "date_assigned": "2024-12-10",
      "date_submitted": "2024-12-10T16:30:00",
      "is_active": true,
      "created_at": "2024-12-10T16:30:00",
      "updated_at": "2024-12-10T16:30:00"
    }
  ],
  "total": 2
}
```

---

### 4.2 Create Grade

**Request:**
```bash
curl -X POST http://localhost:8080/api/v1/grades \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "student_id": 1,
    "course_id": 1,
    "grade": 19.0,
    "max_grade": 20.0,
    "component_type": "Quiz",
    "weight": 0.2,
    "date_assigned": "2024-11-01"
  }'
```

**Validation Rules:**
- `grade`: 0 ≤ grade ≤ max_grade
- `max_grade`: > 0 (typically 20 for Greek scale)
- `weight`: 0-1 (percentage of final grade)
- `component_type`: Enum (Midterm Exam, Final Exam, Quiz, Homework, etc.)

**Response (201 Created):**
```json
{
  "id": 3,
  "student_id": 1,
  "course_id": 1,
  "grade": 19.0,
  "max_grade": 20.0,
  "component_type": "Quiz",
  "weight": 0.2,
  "date_assigned": "2024-11-01",
  "date_submitted": "2025-12-11T15:55:00",
  "is_active": true,
  "created_at": "2025-12-11T15:55:00",
  "updated_at": "2025-12-11T15:55:00"
}
```

---

### 4.3 Get Final Grade for Student in Course

**Request:**
```bash
curl -X GET http://localhost:8080/api/v1/analytics/student/1/course/1/final-grade \
  -H "Authorization: Bearer TOKEN"
```

**Response (200 OK):**
```json
{
  "student_id": 1,
  "course_id": 1,
  "final_grade_percentage": 87.5,
  "final_grade_greek": 17.5,
  "final_letter_grade": "A",
  "absence_penalty": 2.0,
  "unexcused_absences": 1,
  "total_deduction": 2.0,
  "final_grade_after_deduction": 15.5,
  "components": {
    "Midterm Exam": {
      "average": 18.5,
      "percentage": 92.5,
      "weight": 0.4,
      "weighted_contribution": 0.37
    },
    "Final Exam": {
      "average": 17.0,
      "percentage": 85.0,
      "weight": 0.6,
      "weighted_contribution": 0.51
    }
  }
}
```

---

## 5. Attendance

### 5.1 List Attendance Records

**Request:**
```bash
curl -X GET "http://localhost:8080/api/v1/attendance/student/1/course/1?start_date=2024-09-01&end_date=2024-12-31" \
  -H "Authorization: Bearer TOKEN"
```

**Query Parameters:**
- `start_date`: Format YYYY-MM-DD
- `end_date`: Format YYYY-MM-DD
- `session_type`: Filter by type (lecture, lab, etc.)

**Response (200 OK):**
```json
{
  "items": [
    {
      "id": 1,
      "student_id": 1,
      "course_id": 1,
      "session_date": "2024-09-05",
      "status": "present",
      "notes": null,
      "created_at": "2024-09-05T09:00:00",
      "updated_at": "2024-09-05T09:00:00"
    },
    {
      "id": 2,
      "student_id": 1,
      "course_id": 1,
      "session_date": "2024-09-12",
      "status": "absent",
      "notes": "Excused - medical appointment",
      "created_at": "2024-09-12T09:00:00",
      "updated_at": "2024-09-12T10:30:00"
    },
    {
      "id": 3,
      "student_id": 1,
      "course_id": 1,
      "session_date": "2024-09-19",
      "status": "late",
      "notes": null,
      "created_at": "2024-09-19T09:15:00",
      "updated_at": "2024-09-19T09:15:00"
    }
  ],
  "total": 3,
  "summary": {
    "total": 30,
    "present": 25,
    "absent": 3,
    "late": 2,
    "excused": 1,
    "attendance_rate": "83.3%"
  }
}
```

---

### 5.2 Record Attendance

**Request:**
```bash
curl -X POST http://localhost:8080/api/v1/attendance \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "student_id": 1,
    "course_id": 1,
    "session_date": "2025-12-11",
    "status": "present",
    "notes": null
  }'
```

**Status Values:**
- `present`: Student attended
- `absent`: Student was absent (unexcused)
- `late`: Student arrived late
- `excused`: Student had valid excuse

**Response (201 Created):**
```json
{
  "id": 4,
  "student_id": 1,
  "course_id": 1,
  "session_date": "2025-12-11",
  "status": "present",
  "notes": null,
  "created_at": "2025-12-11T15:58:00",
  "updated_at": "2025-12-11T15:58:00"
}
```

---

## 6. Analytics

### 6.1 Get Student Performance Summary

**Request:**
```bash
curl -X GET "http://localhost:8080/api/v1/analytics/student/1/performance?semester=Fall%202024" \
  -H "Authorization: Bearer TOKEN"
```

**Response (200 OK):**
```json
{
  "student_id": 1,
  "student_name": "John Doe",
  "semester": "Fall 2024",
  "courses": [
    {
      "course_id": 1,
      "course_code": "CS101",
      "course_name": "Introduction to Computer Science",
      "final_grade": 17.5,
      "percentage": 87.5,
      "letter_grade": "A",
      "attendance_rate": "83.3%"
    },
    {
      "course_id": 2,
      "course_code": "MATH101",
      "course_name": "Calculus I",
      "final_grade": 16.0,
      "percentage": 80.0,
      "letter_grade": "B",
      "attendance_rate": "88.0%"
    }
  ],
  "overall_gpa": 3.8,
  "average_attendance": "85.65%"
}
```

---

### 6.2 Get Dashboard Statistics

**Request:**
```bash
curl -X GET http://localhost:8080/api/v1/analytics/dashboard \
  -H "Authorization: Bearer TOKEN"
```

**Response (200 OK):**
```json
{
  "total_students": 150,
  "active_students": 145,
  "total_courses": 12,
  "active_courses": 11,
  "average_gpa": 3.2,
  "average_attendance": "82.4%",
  "top_performers": [
    {
      "student_id": 1,
      "name": "John Doe",
      "gpa": 3.9,
      "attendance": "96%"
    }
  ],
  "courses_needing_attention": [
    {
      "course_id": 5,
      "course_code": "PHYS101",
      "average_grade": 14.5,
      "students_below_threshold": 8
    }
  ]
}
```

---

## 7. Audit Logs

### 7.1 List Audit Logs

**Request:**
```bash
curl -X GET "http://localhost:8080/api/v1/audit/logs" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

**Response (200 OK):**
```json
{
  "logs": [
    {
      "id": 1,
      "timestamp": "2025-12-14T10:30:00Z",
      "user_id": 1,
      "email": "admin@example.com",
      "action": "LOGIN",
      "resource": "USER",
      "resource_id": "1",
      "ip_address": "192.168.1.100",
      "user_agent": "Mozilla/5.0...",
      "details": {
        "login_method": "password"
      },
      "success": true
    }
  ],
  "total": 1,
  "skip": 0,
  "limit": 100
}
```

### 7.2 Get Specific Audit Log

**Request:**
```bash
curl -X GET "http://localhost:8080/api/v1/audit/logs/1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 7.3 Filter Audit Logs by User

**Request:**
```bash
curl -X GET "http://localhost:8080/api/v1/audit/logs/user/1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 8. Jobs & Background Tasks

### 8.1 Create Background Job

**Request:**
```bash
curl -X POST "http://localhost:8080/api/v1/jobs" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "BULK_IMPORT",
    "description": "Import students from CSV",
    "parameters": {
      "file_path": "/uploads/students.csv",
      "delimiter": ","
    }
  }'
```

**Response (202 Accepted):**
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "PENDING",
  "type": "BULK_IMPORT",
  "created_at": "2025-12-14T10:30:00Z",
  "description": "Import students from CSV"
}
```

### 8.2 Check Job Status

**Request:**
```bash
curl -X GET "http://localhost:8080/api/v1/jobs/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200 OK):**
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "COMPLETED",
  "type": "BULK_IMPORT",
  "created_at": "2025-12-14T10:30:00Z",
  "updated_at": "2025-12-14T10:35:00Z",
  "progress": {
    "current": 100,
    "total": 100,
    "message": "Import completed successfully"
  },
  "result": {
    "records_processed": 150,
    "records_created": 145,
    "records_failed": 5,
    "errors": ["Invalid email format on line 23"]
  }
}
```

### 8.3 List All Jobs

**Request:**
```bash
curl -X GET "http://localhost:8080/api/v1/jobs" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 8.4 Cancel Job

**Request:**
```bash
curl -X POST "http://localhost:8080/api/v1/jobs/550e8400-e29b-41d4-a716-446655440000/cancel" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 8.5 Delete Completed Job

**Request:**
```bash
curl -X DELETE "http://localhost:8080/api/v1/jobs/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 9. Reports

### 9.1 Generate Student Performance Report

**Request:**
```bash
curl -X POST "http://localhost:8080/api/v1/reports/student-performance" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": 1,
    "period": "semester",
    "include_grades": true,
    "include_attendance": true,
    "include_highlights": true
  }'
```

**Response (200 OK):**
```json
{
  "student_id": 1,
  "student_name": "John Doe",
  "period": "semester",
  "generated_at": "2025-12-14T10:30:00Z",
  "attendance_summary": {
    "total_sessions": 45,
    "present": 42,
    "late": 2,
    "absent": 1,
    "attendance_rate": 93.3
  },
  "grades_summary": {
    "courses": [
      {
        "course_name": "Mathematics",
        "final_grade": 16.5,
        "components": [
          {"name": "Midterm", "grade": 17.0, "weight": 40},
          {"name": "Final", "grade": 16.0, "weight": 60}
        ]
      }
    ],
    "overall_average": 16.5
  },
  "recommendations": [
    "Excellent performance in Mathematics",
    "Consider improving attendance consistency"
  ]
}
```

### 9.2 Get Available Report Formats

**Request:**
```bash
curl -X GET "http://localhost:8080/api/v1/reports/formats" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200 OK):**
```json
["json", "pdf", "csv"]
```

### 9.3 Get Available Report Periods

**Request:**
```bash
curl -X GET "http://localhost:8080/api/v1/reports/periods" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200 OK):**
```json
["week", "month", "semester", "year", "custom"]
```

### 9.4 Download Report

**Request:**
```bash
curl -X POST "http://localhost:8080/api/v1/reports/student-performance/download" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": 1,
    "period": "semester",
    "format": "pdf"
  }' \
  --output report.pdf
```

### 9.5 Bulk Report Generation

**Request:**
```bash
curl -X POST "http://localhost:8080/api/v1/reports/bulk/student-performance" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "student_ids": [1, 2, 3],
    "period": "semester",
    "format": "csv"
  }'
```

### 9.6 Clear Report Cache

**Request (Clear specific student):**
```bash
curl -X DELETE "http://localhost:8080/api/v1/reports/cache/1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Request (Clear all cache):**
```bash
curl -X DELETE "http://localhost:8080/api/v1/reports/cache" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 10. Imports

### 10.1 Preview Import

**Request:**
```bash
curl -X POST "http://localhost:8080/api/v1/imports/preview" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "students",
    "data": [
      {"first_name": "John", "last_name": "Doe", "email": "john@example.com"},
      {"first_name": "Jane", "last_name": "Smith", "email": "jane@example.com"}
    ]
  }'
```

**Response (200 OK):**
```json
{
  "type": "students",
  "total_records": 2,
  "valid_records": 2,
  "invalid_records": 0,
  "preview": [
    {
      "row": 1,
      "data": {"first_name": "John", "last_name": "Doe", "email": "john@example.com"},
      "validation": {"valid": true}
    },
    {
      "row": 2,
      "data": {"first_name": "Jane", "last_name": "Smith", "email": "jane@example.com"},
      "validation": {"valid": true}
    }
  ]
}
```

### 10.2 Execute Import

**Request:**
```bash
curl -X POST "http://localhost:8080/api/v1/imports/execute" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "job_id": "550e8400-e29b-41d4-a716-446655440000",
    "type": "students",
    "data": [
      {"first_name": "John", "last_name": "Doe", "email": "john@example.com"}
    ]
  }'
```

### 10.3 Import Students from CSV

**Request:**
```bash
curl -X POST "http://localhost:8080/api/v1/imports/students" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@students.csv"
```

### 10.4 Import Courses from CSV

**Request:**
```bash
curl -X POST "http://localhost:8080/api/v1/imports/courses" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@courses.csv"
```

### 10.5 Upload File for Import

**Request:**
```bash
curl -X POST "http://localhost:8080/api/v1/imports/upload" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@data.xlsx" \
  -F "type=students"
```

### 10.6 Check Import Diagnostics

**Request:**
```bash
curl -X GET "http://localhost:8080/api/v1/imports/diagnose" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 11. Exports

### 11.1 Export Students to Excel

**Request:**
```bash
curl -X GET "http://localhost:8080/api/v1/export/students/excel" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output students.xlsx
```

### 11.2 Export Student Grades to Excel

**Request:**
```bash
curl -X GET "http://localhost:8080/api/v1/export/grades/excel/1" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output student_grades.xlsx
```

### 11.3 Export Students to PDF

**Request:**
```bash
curl -X GET "http://localhost:8080/api/v1/export/students/pdf" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output students.pdf
```

### 11.4 Export Attendance to Excel

**Request:**
```bash
curl -X GET "http://localhost:8080/api/v1/export/attendance/excel" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output attendance.xlsx
```

### 11.5 Export Course Analytics to PDF

**Request:**
```bash
curl -X GET "http://localhost:8080/api/v1/export/analytics/course/1/pdf" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output course_analytics.pdf
```

### 11.6 Export Student Performance Report to PDF

**Request:**
```bash
curl -X GET "http://localhost:8080/api/v1/export/student-report/pdf/1" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output performance_report.pdf
```

---

## 12. Highlights

### 12.1 Create Student Highlight

**Request:**
```bash
curl -X POST "http://localhost:8080/api/v1/highlights" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": 1,
    "title": "Outstanding Performance",
    "description": "Achieved 95% in Mathematics final exam",
    "category": "academic",
    "priority": "high"
  }'
```

**Response (201 Created):**
```json
{
  "id": 1,
  "student_id": 1,
  "title": "Outstanding Performance",
  "description": "Achieved 95% in Mathematics final exam",
  "category": "academic",
  "priority": "high",
  "created_at": "2025-12-14T10:30:00Z",
  "updated_at": "2025-12-14T10:30:00Z"
}
```

### 12.2 List All Highlights

**Request:**
```bash
curl -X GET "http://localhost:8080/api/v1/highlights" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 12.3 Get Student Highlights

**Request:**
```bash
curl -X GET "http://localhost:8080/api/v1/highlights/student/1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 12.4 Update Highlight

**Request:**
```bash
curl -X PUT "http://localhost:8080/api/v1/highlights/1" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Exceptional Performance",
    "priority": "critical"
  }'
```

### 12.5 Delete Highlight

**Request:**
```bash
curl -X DELETE "http://localhost:8080/api/v1/highlights/1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 13. Performance

### 13.1 Record Daily Performance

**Request:**
```bash
curl -X POST "http://localhost:8080/api/v1/performance" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": 1,
    "course_id": 1,
    "date": "2025-12-14",
    "engagement_score": 85,
    "participation_level": "high",
    "notes": "Very active in today's discussion"
  }'
```

### 13.2 Get Performance by ID

**Request:**
```bash
curl -X GET "http://localhost:8080/api/v1/performance/1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 13.3 Get Student Performance History

**Request:**
```bash
curl -X GET "http://localhost:8080/api/v1/performance/student/1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 13.4 Get Student Performance by Course

**Request:**
```bash
curl -X GET "http://localhost:8080/api/v1/performance/student/1/course/1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 13.5 Get Course Performance by Date

**Request:**
```bash
curl -X GET "http://localhost:8080/api/v1/performance/date/2025-12-14/course/1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 13.6 Update Performance Record

**Request:**
```bash
curl -X PUT "http://localhost:8080/api/v1/performance/1" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "engagement_score": 90,
    "participation_level": "excellent"
  }'
```

### 13.7 Ensure Default Performance Records

**Request:**
```bash
curl -X POST "http://localhost:8080/api/v1/performance/ensure-defaults" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": 1,
    "course_id": 1,
    "date": "2025-12-14"
  }'
```

---

## 14. Enrollments

### 14.1 List Enrollments

**Request:**
```bash
curl -X GET "http://localhost:8080/api/v1/enrollments" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 14.2 Get Course Enrollments

**Request:**
```bash
curl -X GET "http://localhost:8080/api/v1/enrollments/course/1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 14.3 Get Student Enrollments

**Request:**
```bash
curl -X GET "http://localhost:8080/api/v1/enrollments/student/1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 14.4 Get Enrolled Students for Course

**Request:**
```bash
curl -X GET "http://localhost:8080/api/v1/enrollments/course/1/students" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 14.5 Enroll Student in Course

**Request:**
```bash
curl -X POST "http://localhost:8080/api/v1/enrollments/course/1" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": 1,
    "enrollment_date": "2025-12-14"
  }'
```

### 14.6 Unenroll Student from Course

**Request:**
```bash
curl -X DELETE "http://localhost:8080/api/v1/enrollments/course/1/student/1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 15. RBAC (Role-Based Access Control)

### 15.1 Get RBAC Summary

**Request:**
```bash
curl -X GET "http://localhost:8080/api/v1/rbac/summary" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200 OK):**
```json
{
  "roles": [
    {"id": 1, "name": "admin", "description": "Full system access"},
    {"id": 2, "name": "teacher", "description": "Teaching and grading access"},
    {"id": 3, "name": "student", "description": "Limited access to own data"}
  ],
  "permissions": [
    {"id": 1, "name": "read_students", "description": "View student information"},
    {"id": 2, "name": "write_grades", "description": "Create and modify grades"}
  ],
  "role_permissions": [
    {"role_id": 1, "permission_id": 1},
    {"role_id": 1, "permission_id": 2}
  ]
}
```

### 15.2 Assign Role to User

**Request:**
```bash
curl -X POST "http://localhost:8080/api/v1/rbac/assign-role" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "role_name": "teacher"
  }'
```

### 15.3 Grant Permission to Role

**Request:**
```bash
curl -X POST "http://localhost:8080/api/v1/rbac/grant-permission" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role_name": "teacher",
    "permission_name": "write_grades"
  }'
```

### 15.4 Ensure Default RBAC Setup

**Request:**
```bash
curl -X POST "http://localhost:8080/api/v1/rbac/ensure-defaults" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 16. Sessions

### 16.1 Get Available Semesters

**Request:**
```bash
curl -X GET "http://localhost:8080/api/v1/sessions/semesters" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200 OK):**
```json
[
  {"id": "2025-1", "name": "Fall 2025", "start_date": "2025-09-01", "end_date": "2025-12-20"},
  {"id": "2025-2", "name": "Spring 2026", "start_date": "2026-01-15", "end_date": "2026-05-30"}
]
```

### 16.2 Export Session Data

**Request (GET):**
```bash
curl -X GET "http://localhost:8080/api/v1/sessions/export" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output session_backup.json
```

**Request (POST - Legacy):**
```bash
curl -X POST "http://localhost:8080/api/v1/sessions/export" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output session_backup.json
```

### 16.3 Import Session Data

**Request:**
```bash
curl -X POST "http://localhost:8080/api/v1/sessions/import" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "semesters": [...],
      "courses": [...],
      "enrollments": [...]
    }
  }'
```

### 16.4 Rollback Session Changes

**Request:**
```bash
curl -X POST "http://localhost:8080/api/v1/sessions/rollback" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "target_date": "2025-12-13T10:00:00Z",
    "confirm_rollback": true
  }'
```

### 16.5 List Available Backups

**Request:**
```bash
curl -X GET "http://localhost:8080/api/v1/sessions/backups" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 17. Error Handling

### 7.1 Error Response Structure

All errors follow RFC 7807 Problem Details format:

```json
{
  "type": "https://api.example.com/errors/validation-error",
  "title": "Validation Error",
  "status": 400,
  "detail": "Invalid email format",
  "instance": "/api/v1/students",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

---

### 7.2 Common Error Codes

| Status | Code | Message |
|--------|------|---------|
| 400 | `ValidationError` | Invalid request data |
| 401 | `AuthenticationError` | Missing or invalid token |
| 403 | `AuthorizationError` | Insufficient permissions |
| 404 | `NotFoundError` | Resource not found |
| 409 | `ConflictError` | Resource already exists (e.g., duplicate student ID) |
| 429 | `RateLimitError` | Too many requests (see section 8) |
| 500 | `InternalServerError` | Server error (check logs) |

---

### 7.3 Example Error Responses

**401 Unauthorized (Missing Token):**
```json
{
  "detail": "Not authenticated",
  "status": 401
}
```

**403 Forbidden (Insufficient Role):**
```json
{
  "detail": "Insufficient permissions",
  "status": 403
}
```

**404 Not Found:**
```json
{
  "detail": "Student with ID 999 not found",
  "status": 404
}
```

**409 Conflict (Duplicate):**
```json
{
  "detail": "Student with ID S001 already exists",
  "status": 409
}
```

---

## 8. Rate Limiting

### 8.1 Rate Limit Headers

All responses include rate limit information:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1702320000
```

**Explanation:**
- `X-RateLimit-Limit`: Maximum requests allowed in this window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Unix timestamp when counter resets

---

### 8.2 Rate Limits by Endpoint Type

| Endpoint Type | Limit | Window | Notes |
|---|---|---|---|
| **GET** (read) | 1000 req/min | 1 minute | per IP address |
| **POST/PUT/DELETE** (write) | 100 req/min | 1 minute | per IP address |
| **Auth** | 5 req/min | 1 minute | login/register only |
| **Analytics** (expensive) | 50 req/min | 1 minute | per authenticated user |

---

### 8.3 Handling 429 Too Many Requests

**Request:**
```bash
curl -X GET http://localhost:8080/api/v1/students \
  -H "Authorization: Bearer TOKEN"
```

**Response (429 Too Many Requests):**
```
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1702320060

{
  "detail": "Rate limit exceeded. Retry after 60 seconds.",
  "retry_after": 60
}
```

**Recommended Client Behavior:**
1. Read `Retry-After` header (in seconds)
2. Wait that many seconds
3. Retry the request
4. Implement exponential backoff for repeated failures

---

## 9. Best Practices

### 9.1 Authentication

```bash
# Store token in secure cookie or memory (never localStorage for sensitive systems)
TOKEN=$(curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "pass"}' \
  | jq -r '.access_token')

# Use Bearer scheme
curl -H "Authorization: Bearer $TOKEN" ...

# Refresh periodically (before expiration)
curl -X POST http://localhost:8080/api/v1/auth/refresh \
  -H "Authorization: Bearer $TOKEN"
```

### 9.2 Pagination

```bash
# Fetch all students in pages
LIMIT=50
OFFSET=0
while true; do
  curl "http://localhost:8080/api/v1/students?skip=$OFFSET&limit=$LIMIT"
  # Parse response and check if total <= OFFSET+LIMIT
  # Increment OFFSET and repeat
  OFFSET=$((OFFSET + LIMIT))
done
```

### 9.3 Error Handling

```bash
# Always check response status code
RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:8080/api/v1/students/999)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" != "200" ]; then
  echo "Error: HTTP $HTTP_CODE"
  echo "$BODY" | jq '.detail'
  exit 1
fi
```

---

## 10. OpenAPI/Swagger

Access interactive API documentation:

- **Swagger UI**: http://localhost:8080/docs
- **ReDoc**: http://localhost:8080/redoc
- **OpenAPI JSON**: http://localhost:8080/openapi.json

---

**Last Updated**: 2025-12-11  
**Maintained By**: Development Team  
**Next Review**: 2025-12-25
