# Bulk Import/Export User Guide

**Version**: 1.0 (1.17.1)
**Last Updated**: January 14, 2026
**Status**: Production Ready

---

## Overview

The Bulk Import/Export tool allows you to manage large sets of data efficiently. You can import students, courses, and grades from Excel or CSV files, and export data for reporting or backup.

**What you can do:**
- 📥 **Import**: Add many students, courses, or grades at once
- 📤 **Export**: Download data lists to Excel, CSV, or PDF
- 📜 **History**: View past import/export operations

---

## 📍 Accessing the Tool

1. Log in to the **Admin Panel**.
2. Click **Data Management** in the sidebar.
3. Select **Import/Export**.

---

## 📥 Importing Data

### Step 1: Choose Data Type

Click the **Import Data** button and select what you want to import:
- **Import Students**: For student registration
- **Import Courses**: For course catalog
- **Import Grades**: For bulk grade entry

### Step 2: Prepare Your File

Your file must be in **CSV** (`.csv`) or **Excel** (`.xlsx`) format.

**Required Columns:**

| Type | Required Columns |
|------|------------------|
| **Students** | `first_name`, `last_name`, `email` |
| **Courses** | `course_code`, `course_name` |
| **Grades** | `student_id` (or `email`), `course_code`, `grade` |

> **Tip**: You can download a template file from the import wizard.

### Step 3: Upload and Validate

1. Drag and drop your file or click to browse.
2. The system will **validate** your data automatically.
3. You will see a summary:
   - ✅ **Valid Rows**: Ready to import
   - ❌ **Errors**: Rows with issues (missing data, duplicates)

### Step 4: Commit

If the validation looks good, click **Import** to save the data to the system.

---

## 📤 Exporting Data

1. Click the **Export Data** button.
2. Select the **Resource** (Students, Courses, Grades).
3. Choose a **Format**:
   - **Excel**: Best for editing
   - **CSV**: Best for other software
   - **PDF**: Best for printing/reporting

4. Click **Export** to download the file.

---

## 📜 Viewing History

The **History** table at the bottom of the page shows all past operations.

- **Status Icons**:
  - ✅ Completed successfully
  - ❌ Failed
  - ⏳ In progress
- **Details**: Click a row to see more details (e.g., error messages).

---

## 🆘 Troubleshooting

### Common Import Errors

**"Missing required columns"**
- **Fix**: Check your file headers. They must match exactly (e.g., `email`, not `E-mail`).

**"Duplicate entry"**
- **Fix**: A student with that ID or email already exists. The system prevents duplicates.

**"Invalid file format"**
- **Fix**: Ensure you are using `.csv` or `.xlsx`.

### Need Help?

Contact your system administrator if you encounter persistent issues. Provide the **Job ID** from the History table.
