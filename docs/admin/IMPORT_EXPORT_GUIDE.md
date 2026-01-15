# Bulk Import/Export Operations Guide

**Version**: 1.0
**Last Updated**: January 2026
**Feature**: #127

## Overview

The Bulk Import/Export module allows administrators to manage large datasets efficiently. It supports importing Students, Courses, and Grades via Excel/CSV files and exporting data for reporting purposes.

## Supported Formats

| Type | Extensions | MIME Types |
|------|------------|------------|
| Excel | `.xlsx`, `.xls` | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |
| CSV | `.csv` | `text/csv` |

## Import Workflow

The import process follows a 4-step wizard to ensure data integrity:

1. **Upload**: Select the entity type (Student, Course, Grade) and upload the file.
2. **Preview**: Review the first few rows of parsed data to confirm column mapping.
3. **Validation**: The system checks for errors (duplicates, missing required fields, invalid formats).
    - *Note*: If critical errors are found, the import is blocked.
4. **Commit**: Confirm the import to write data to the database.

### Required Columns

#### Students
- `first_name`
- `last_name`
- `email` (Unique)
- `registration_number` (Unique)

#### Courses
- `code` (Unique)
- `title`
- `credits`

#### Grades
- `student_registration_number`
- `course_code`
- `grade`
- `term`

## Export Workflow

1. Navigate to **Data Management > Export**.
2. Select the entity type to export.
3. (Optional) Apply filters (e.g., specific course or date range).
4. Select format (Excel or CSV).
5. Click **Export**. The file will download automatically once generated.

## Troubleshooting

### Common Errors

**"Invalid File Format"**
- Ensure the file is a valid `.csv` or `.xlsx` file.
- Check that the file is not password protected.

**"Missing Required Columns"**
- The header row must match the system requirements exactly.
- Download the *Template* from the import dialog to ensure correct formatting.

**"Duplicate Entry"**
- The system prevents duplicate emails or registration numbers.
- Check existing records before importing.

### Rollback

If an import completes but the data is incorrect:
1. Go to **Import History**.
2. Locate the job ID.
3. (If enabled) Click **Rollback**. *Note: Rollback is only available for 24 hours after import.*

## Security & Permissions

- **Import**: Requires `imports:create` permission (Admin only).
- **Export**: Requires `exports:create` permission (Admin, Manager).
- **View History**: Requires `imports:view` permission.

## Performance Limits

- **Max File Size**: 10MB
- **Max Rows**: 5000 per batch (split larger files if necessary)
