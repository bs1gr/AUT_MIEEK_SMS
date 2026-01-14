# Bulk Import/Export Operational Guide

**Version**: 1.0
**Date**: January 14, 2026
**Feature**: #127

## Overview

The Bulk Import/Export system allows administrators to manage large datasets efficiently. It supports importing Students, Courses, and Grades via CSV/Excel files and exporting data for reporting or backup purposes.

## 🚀 Quick Start

1. Navigate to **Admin Panel** > **Import/Export**.
2. Select the **Import** tab.
3. Choose the entity type (Students, Courses, Grades).
4. Download the template if needed.
5. Upload your file and review the validation preview.
6. Click **Commit Import** to finalize.

---

## 📥 Import Operations

### Supported File Formats
- **CSV** (`.csv`): Comma-separated values.
- **Excel** (`.xlsx`): Microsoft Excel workbook.

### 1. Student Import
**Required Columns:**
- `first_name` (Text)
- `last_name` (Text)
- `email` (Unique Email)
- `date_of_birth` (YYYY-MM-DD)
- `enrollment_date` (YYYY-MM-DD)

**Validation Rules:**
- Email must be unique in the system.
- Dates must be in valid ISO format.
- Duplicate emails in the file will be flagged.

### 2. Course Import
**Required Columns:**
- `course_code` (Unique Text, e.g., CS101)
- `name` (Text)
- `credits` (Integer)
- `department` (Text)
- `instructor_id` (Optional Integer)

### 3. Grade Import
**Required Columns:**
- `student_email` (Must exist)
- `course_code` (Must exist)
- `grade` (0-100 or Letter)
- `term` (Text, e.g., Fall 2025)

---

## 📤 Export Operations

Exports are generated asynchronously. Large datasets may take a few moments to process.

1. Navigate to the **Export** tab.
2. Select the entity to export.
3. (Optional) Apply filters (e.g., specific department or date range).
4. Click **Generate Export**.
5. Once processing is complete, click **Download**.

---

## 🛡️ Validation & Safety

### Preview Mode
Before any data is written to the database, the system performs a "Dry Run" validation:
- **Valid Rows**: Ready for import.
- **Warnings**: Data will be imported, but issues exist (e.g., minor formatting).
- **Errors**: Row will be skipped.

### Transaction Safety
Imports are atomic per batch. If a critical system error occurs during the commit phase, the entire batch is rolled back to prevent data corruption.

### History & Audit
All import/export operations are logged.
- View **History** tab for a log of who imported what and when.
- Click details to see validation summaries and error logs.

---

## 🔧 Troubleshooting

### Common Errors

| Error | Cause | Resolution |
| :--- | :--- | :--- |
| `Invalid File Format` | Uploaded file is not CSV/XLSX | Convert file to standard CSV or Excel format. |
| `Missing Columns` | Header row is incorrect | Download the template and ensure headers match exactly. |
| `Duplicate Key` | Record already exists | Check if the student/course already exists. Use "Update" mode if available. |
| `Foreign Key Error` | Referenced data missing | Ensure Student/Course exists before importing Grades. |

### Performance Limits
- **Max File Size**: 10MB
- **Max Rows**: ~5,000 per batch (recommended)
- For larger datasets, split files into smaller chunks.

---

## 🔒 Permissions

Access to this feature is controlled by RBAC:

| Role | Import | Export | History |
| :--- | :---: | :---: | :---: |
| **Admin** | ✅ | ✅ | ✅ |
| **Manager** | ✅ | ✅ | ✅ |
| **Teacher** | ❌ | ✅ (Own courses) | ❌ |
| **Student** | ❌ | ❌ | ❌ |
