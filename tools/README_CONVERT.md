# PDF to SMS Import Converters

## Overview

This folder contains two converters that turn PDF-extracted data into the JSON format required by the Student Management System's import functionality.

- Generic converter: `tools/convert_pdf_to_import.py`
- MIEEK-specific converter: `tools/convert_mieek_to_import.py`

## Purpose

When you extract data from PDFs, the resulting JSON may not match the exact format expected by SMS. These converters:

1. **Normalizes field formats** - Handles strings, lists, and various data types
2. **Validates required fields** - Ensures critical data is present
3. **Parses complex structures** - Converts evaluation rules and schedules
4. **Handles Greek text** - Properly processes Greek metadata and filters noise
5. **Generates compatible JSON** - Creates files ready for SMS import

## Choosing the right converter

Use the specialized MIEEK converter when you have the raw MIEEK extraction format where:

- `course_name` contains the code (e.g., "aut0101")
- `ECTS` is a list containing credits and hours (lectures/labs)
- `Αξιολόγηση` contains Greek evaluation entries

Command:

```powershell
python tools/convert_mieek_to_import.py `
  --input D:\SMS\AUT\data\courses.json `
  --output templates\courses\
```

Use the generic converter for already-structured JSON (or other programs' output) where fields like `course_code`, `course_name`, `semester`, etc., already exist in a straightforward schema. It will normalize types and parse rules/schedules but won’t do MIEEK-specific inference.

Command:

```powershell
python tools/convert_pdf_to_import.py `
  --input <input_file> `
  --output <output_dir> `
  --type <courses|students>
```

## Usage (Generic converter)

### Basic Command

```powershell
python tools/convert_pdf_to_import.py --input <input_file> --output <output_dir> --type <courses|students>
```

### Convert Courses (generic)

```powershell
# Convert an arbitrary courses JSON (non-MIEEK raw format)
python tools/convert_pdf_to_import.py `
  --input tools\example_input_courses.json `
  --type courses `
  --output templates\courses\
```

### Convert Students

```powershell
# Convert student list
python tools/convert_pdf_to_import.py `
  --input student_data.json `
  --type students `
  --output templates\students\
```

## Input Format

### Courses Input

The script accepts flexible course formats:

```json
{
  "course_code": "CS101",
  "course_name": "Introduction to Computer Science",
  "semester": "Fall 2025",
  "credits": 3,
  "description": "Course description text...",
  "hours_per_week": 3.0,
  "absence_penalty": 0.5,
  "evaluation_rules": [
    {"category": "Midterm Exam", "weight": 30},
    {"category": "Final Exam", "weight": 40},
    {"category": "Homework", "weight": 30}
  ],
  "teaching_schedule": {
    "Monday": {"periods": 2, "start_time": "08:00", "duration": 50},
    "Wednesday": {"periods": 1, "start_time": "10:00", "duration": 45}
  }
}
```

**Flexible Evaluation Rules Formats:**

The converter handles multiple formats for evaluation rules:

```json
// Format 1: List of dicts (ideal)
"evaluation_rules": [
  {"category": "Midterm", "weight": 30},
  {"category": "Final", "weight": 40}
]

// Format 2: List of strings
"evaluation_rules": [
  "Midterm: 30%",
  "Final: 40%",
  "Homework: 30%"
]

// Format 3: Alternating values
"evaluation_rules": [
  "Midterm", 30,
  "Final", 40,
  "Homework", 30
]

// Format 4: Single string
"evaluation_rules": "Midterm: 30%, Final: 40%, Homework: 30%"
```

### Students Input

```json
{
  "student_id": "S12345",
  "email": "student@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "enrollment_date": "2025-09-01",
  "is_active": true,
  "father_name": "Optional",
  "mobile_phone": "Optional",
  "phone": "Optional",
  "health_issue": "Optional",
  "note": "Optional",
  "study_year": 1
}
```

**Date Formats Supported:**

- ISO format: `2025-09-01`
- European format: `01/09/2025`

## Output Format

The converter generates SMS-compatible JSON files:

### Output Filename

```text
courses_20251026_143052.json
students_20251026_143052.json
```

Files are timestamped to avoid overwriting.

### Output Location

- **Courses**: `templates/courses/` - Ready for directory import
- **Students**: `templates/students/` - Ready for directory import

## Features

### 1. Field Normalization

- **Lists to Strings**: `["Introduction", "to", "CS"]` → `"Introduction to CS"`
- **Empty Semesters**: Auto-fills with `"Α' Εξάμηνο"` (1st Semester)
- **Description Lists**: Joins multi-line descriptions with newlines

### 2. Metadata Filtering

Automatically filters out common Greek metadata terms:

- Γλώσσα, Ελληνική, Αγγλική
- Κωδικός Μαθήματος, Τίτλος Μαθήματος
- Τύπος Μαθήματος, Υποχρεωτικό, Επίπεδο
- And more...

### 3. Evaluation Rules Parsing

Intelligently parses complex evaluation rule formats from PDFs:

```python
# Input (messy PDF extraction)
"evaluation_rules": [
  "Γλώσσα",
  "Ελληνική",
  "Midterm Exam:",
  "30%",
  "Final Exam: 40%",
  "Homework",
  "30"
]

# Output (clean SMS format)
"evaluation_rules": [
  {"category": "Midterm Exam", "weight": 30.0},
  {"category": "Final Exam", "weight": 40.0},
  {"category": "Homework", "weight": 30.0}
]
```

### 4. Error Handling

- **Validation**: Checks required fields (course_code, student_id, email)
- **Type Conversion**: Safely converts credits, hours_per_week, etc.
- **Warnings**: Reports non-fatal issues (invalid dates, missing optional fields)
- **Errors**: Logs failed conversions with details

## Workflow

### Complete Import Process

```powershell
# Step 1: Convert PDF-extracted data
python tools/convert_pdf_to_import.py `
  --input D:\SMS\AUT\extract_mieek_pdfs.json `
  --type courses `
  --output templates\courses\

# Step 2: Review generated file
# Check: templates/courses/courses_20251026_143052.json

# Step 3: Import via SMS
# Option A: Use Operations panel in web UI
#   - Navigate to Operations view
#   - Click "Import Courses from Templates"
#   - Review results

# Option B: Use API directly
Invoke-RestMethod -Uri "http://localhost:8000/api/v1/imports/courses" `
  -Method Post
```

## Output Example

### Console Output

```text
============================================================
PDF to SMS Import Converter
============================================================
Input file: D:\SMS\AUT\extract_mieek_pdfs.json
Output dir: templates\courses
Data type:  courses
============================================================

✓ Loaded data from D:\SMS\AUT\extract_mieek_pdfs.json
Found 25 records to convert

✓ Successfully converted 23 records
✓ Saved to: templates\courses\courses_20251026_143052.json

⚠ Warnings (2):
  • Invalid credits for MATH201, using default
  • Invalid date format for CS301, skipping enrollment_date

✗ Errors (2):
  • Missing course_code in record: {'course_name': 'Unknown'}
  • Failed to convert course unknown: KeyError: 'required_field'

============================================================
Conversion Summary:
  Total input records:     25
  Successfully converted:  23
  Warnings:                2
  Errors:                  2
============================================================

Next steps:
1. Review the generated file: templates\courses\courses_20251026_143052.json
2. Use the SMS Operations panel to import the data
3. Or use the API: POST /api/v1/imports/courses
```

## Troubleshooting

### Common Issues

**Issue**: Missing course_code or student_id
```text
✗ Missing course_code in record
```
**Solution**: Ensure your PDF extraction includes these required fields

**Issue**: Invalid date format
```text
⚠ Invalid date format for S12345, skipping enrollment_date
```
**Solution**: Use ISO (YYYY-MM-DD) or European (DD/MM/YYYY) format

**Issue**: Evaluation rules not parsing
```text
⚠ evaluation_rules JSON parse failed, dropping field
```
**Solution**: Check your evaluation rules format matches one of the supported patterns

### Validation

After conversion, validate the output:

```powershell
# Check JSON is valid
python -m json.tool templates\courses\courses_20251026_143052.json

# Count converted records
$data = Get-Content templates\courses\courses_20251026_143052.json | ConvertFrom-Json
Write-Host "Converted $($data.Count) courses"
```

## Schema Reference

### Course Schema (SMS Import Format)

```typescript
{
  // Required
  course_code: string,        // Unique identifier
  course_name: string,        // Full course name
  semester: string,           // e.g., "Fall 2025", "Α' Εξάμηνο"
  
  // Optional
  credits?: number,           // Integer, default: 3
  description?: string,       // Long text description
  hours_per_week?: number,    // Float, default: 3.0
  absence_penalty?: number,   // Float, default: 0.0
  
  // Complex structures
  evaluation_rules?: [        // Must sum to 100%
    {
      category: string,       // e.g., "Midterm Exam"
      weight: number          // e.g., 30 (percentage)
    }
  ],
  
  teaching_schedule?: {       // Weekly schedule
    "Monday"?: {
      periods: number,        // Number of class periods
      start_time: string,     // e.g., "08:00"
      duration: number        // Minutes per period
    },
    // ... other days
  }
}
```

### Student Schema (SMS Import Format)

```typescript
{
  // Required
  student_id: string,         // Unique student identifier
  email: string,              // Unique email address
  first_name: string,         // Given name
  last_name: string,          // Family name
  
  // Optional
  enrollment_date?: string,   // ISO date: "2025-09-01"
  is_active?: boolean,        // Default: true
  father_name?: string,
  mobile_phone?: string,
  phone?: string,
  health_issue?: string,      // Long text
  note?: string,              // Long text
  study_year?: number         // Integer (1, 2, 3, 4, etc.)
}
```

## API Integration

After conversion, the generated JSON can be imported via:

### Backend Import Endpoints

```python
# Directory import (from templates/)
POST /api/v1/imports/courses
POST /api/v1/imports/students

# File upload import
POST /api/v1/imports/upload
  - Form data: import_type=courses|students
  - Files: JSON file(s)
```

See `backend/routers/routers_imports.py` for implementation details.

## Related Files

- **Converter Script**: `tools/convert_pdf_to_import.py`
- **Import Router**: `backend/routers/routers_imports.py`
- **Data Models**: `backend/models.py`
- **Schemas**: `backend/schemas/courses.py`, `backend/schemas/students.py`

## Support

For issues or questions:
 
1. Check the console output for specific error messages
2. Review the generated JSON for data quality
3. Consult `backend/routers/routers_imports.py` for format details
4. Test with small datasets first

---

**Version**: 1.0  
**Last Updated**: October 26, 2025  
**Author**: SMS Development Team
