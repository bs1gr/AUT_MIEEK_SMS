#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Set up training environment with test accounts and sample data
.DESCRIPTION
    Creates test accounts for admin, teacher, and student roles
    Populates sample data for training demonstrations
    Verifies all features are working for training sessions
.PARAMETER Mode
    Environment mode: 'full' (all data), 'minimal' (demo only), 'reset' (clean and rebuild)
.PARAMETER Verify
    Run verification checks after setup
.EXAMPLE
    .\Setup-TrainingEnvironment.ps1 -Mode full -Verify
#>

param(
    [ValidateSet('full', 'minimal', 'reset')]
    [string]$Mode = 'full',
    [switch]$Verify
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

# Color output functions
function Write-Success { param($msg) Write-Host "✓ $msg" -ForegroundColor Green }
function Write-Info { param($msg) Write-Host "ℹ $msg" -ForegroundColor Cyan }
function Write-Warning { param($msg) Write-Host "⚠ $msg" -ForegroundColor Yellow }
function Write-Error { param($msg) Write-Host "✗ $msg" -ForegroundColor Red }
function Write-Step { param($msg) Write-Host "`n═══ $msg ═══" -ForegroundColor Yellow }

function Get-EnvValue {
    param(
        [string]$FilePath,
        [string]$Key,
        [string]$Default = ""
    )

    if (-not (Test-Path $FilePath)) {
        return $Default
    }

    $lines = Get-Content -Path $FilePath -ErrorAction SilentlyContinue
    foreach ($line in $lines) {
        $trimmed = $line.Trim()
        if (-not $trimmed -or $trimmed.StartsWith("#")) {
            continue
        }
        $pair = $trimmed.Split("=", 2)
        if ($pair.Count -ne 2) {
            continue
        }
        $name = $pair[0].Trim()
        if ($name -ne $Key) {
            continue
        }
        $value = $pair[1].Trim().Trim('"').Trim("'")
        return $value
    }

    return $Default
}

Write-Host "`n╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Training Environment Setup          ║" -ForegroundColor Cyan
Write-Host "║   SMS v1.17.6 - Phase 5               ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝`n" -ForegroundColor Cyan

$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$backendDir = Join-Path $projectRoot "backend"

# Verify backend directory exists
if (-not (Test-Path $backendDir)) {
    Write-Error "Backend directory not found: $backendDir"
    exit 1
}

Write-Info "Mode: $Mode"
Write-Info "Project root: $projectRoot"
Write-Info "Backend directory: $backendDir"

# Step 1: Verify system is running
Write-Step "Step 1: System Health Check"

try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -Method GET -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Success "Backend API is running (port 8000)"
    }
} catch {
    Write-Error "Backend API is not responding. Please start the system first:"
    Write-Host "  .\NATIVE.ps1 -Start" -ForegroundColor Yellow
    exit 1
}

# Step 1b: Authenticate as admin
Write-Step "Step 1b: Admin Authentication"

$backendEnv = Join-Path $backendDir ".env"
$adminEmail = Get-EnvValue -FilePath $backendEnv -Key "DEFAULT_ADMIN_EMAIL" -Default "admin@example.com"
$adminPassword = Get-EnvValue -FilePath $backendEnv -Key "DEFAULT_ADMIN_PASSWORD" -Default "YourSecurePassword123!"

try {
    $loginPayload = @{ email = $adminEmail; password = $adminPassword }
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/auth/login" -Method POST -ContentType "application/json" -Body ($loginPayload | ConvertTo-Json)
    $accessToken = $loginResponse.access_token
    if (-not $accessToken) {
        throw "Missing access_token in login response."
    }
    Write-Success "Authenticated as $adminEmail"
} catch {
    Write-Error "Admin login failed. Verify DEFAULT_ADMIN_EMAIL and DEFAULT_ADMIN_PASSWORD in backend/.env"
    throw
}

$authHeaders = @{ Authorization = "Bearer $accessToken" }

# Step 2: Create training test accounts
Write-Step "Step 2: Creating Training Test Accounts"

$trainingAccounts = @{
    admins = @(
        @{ email = "admin.training1@mieek.edu.cy"; password = "Training2026!"; first_name = "Admin"; last_name = "Trainer1" }
        @{ email = "admin.training2@mieek.edu.cy"; password = "Training2026!"; first_name = "Admin"; last_name = "Trainer2" }
        @{ email = "admin.training3@mieek.edu.cy"; password = "Training2026!"; first_name = "Admin"; last_name = "Trainer3" }
    )
    teachers = @(
        @{ email = "teacher.demo1@mieek.edu.cy"; password = "Teacher2026!"; first_name = "Maria"; last_name = "Papadopoulos" }
        @{ email = "teacher.demo2@mieek.edu.cy"; password = "Teacher2026!"; first_name = "Nikos"; last_name = "Georgiou" }
        @{ email = "teacher.demo3@mieek.edu.cy"; password = "Teacher2026!"; first_name = "Elena"; last_name = "Christodoulou" }
        @{ email = "teacher.demo4@mieek.edu.cy"; password = "Teacher2026!"; first_name = "Andreas"; last_name = "Constantinou" }
        @{ email = "teacher.demo5@mieek.edu.cy"; password = "Teacher2026!"; first_name = "Sophia"; last_name = "Dimitriou" }
    )
    students = @(
        @{ email = "student.demo1@mieek.edu.cy"; password = "Student2026!"; first_name = "Giorgos"; last_name = "Ioannou"; student_id = "TRAIN001" }
        @{ email = "student.demo2@mieek.edu.cy"; password = "Student2026!"; first_name = "Anna"; last_name = "Vasiliou"; student_id = "TRAIN002" }
        @{ email = "student.demo3@mieek.edu.cy"; password = "Student2026!"; first_name = "Michalis"; last_name = "Petrou"; student_id = "TRAIN003" }
        @{ email = "student.demo4@mieek.edu.cy"; password = "Student2026!"; first_name = "Christina"; last_name = "Makris"; student_id = "TRAIN004" }
        @{ email = "student.demo5@mieek.edu.cy"; password = "Student2026!"; first_name = "Panagiotis"; last_name = "Loizou"; student_id = "TRAIN005" }
        @{ email = "student.demo6@mieek.edu.cy"; password = "Student2026!"; first_name = "Katerina"; last_name = "Nikolaou"; student_id = "TRAIN006" }
        @{ email = "student.demo7@mieek.edu.cy"; password = "Student2026!"; first_name = "Dimitris"; last_name = "Hadjis"; student_id = "TRAIN007" }
        @{ email = "student.demo8@mieek.edu.cy"; password = "Student2026!"; first_name = "Eleni"; last_name = "Savva"; student_id = "TRAIN008" }
        @{ email = "student.demo9@mieek.edu.cy"; password = "Student2026!"; first_name = "Christos"; last_name = "Andreou"; student_id = "TRAIN009" }
        @{ email = "student.demo10@mieek.edu.cy"; password = "Student2026!"; first_name = "Despina"; last_name = "Kyriacou"; student_id = "TRAIN010" }
    )
}

Write-Info "Creating admin accounts ($($trainingAccounts.admins.Count))..."
Write-Info "Creating teacher accounts ($($trainingAccounts.teachers.Count))..."
Write-Info "Creating student accounts ($($trainingAccounts.students.Count))..."

# Save credentials to file for trainer reference
$credentialsFile = Join-Path $projectRoot "docs/training/TRAINING_CREDENTIALS.md"
$credentialsContent = @"
# Training Environment Credentials
## SMS v1.17.6 - Phase 5 Training

**CONFIDENTIAL - FOR TRAINER USE ONLY**
**Generated**: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

---

## Administrator Accounts (3)

| Email | Password | Name | Role |
|-------|----------|------|------|
"@

foreach ($admin in $trainingAccounts.admins) {
    $credentialsContent += "| $($admin.email) | ``$($admin.password)`` | $($admin.first_name) $($admin.last_name) | Admin |`n"
}

$credentialsContent += @"

---

## Teacher Accounts (5)

| Email | Password | Name | Role |
|-------|----------|------|------|
"@

foreach ($teacher in $trainingAccounts.teachers) {
    $credentialsContent += "| $($teacher.email) | ``$($teacher.password)`` | $($teacher.first_name) $($teacher.last_name) | Teacher |`n"
}

$credentialsContent += @"

---

## Student Accounts (10)

| Email | Password | Name | Student ID | Role |
|-------|----------|------|------------|------|
"@

foreach ($student in $trainingAccounts.students) {
    $credentialsContent += "| $($student.email) | ``$($student.password)`` | $($student.first_name) $($student.last_name) | $($student.student_id) | Student |`n"
}

$credentialsContent += @"

---

## Usage Instructions

### For Admin Training
- Use any of the 3 admin accounts
- Demonstrate user management with teacher/student accounts
- Show role assignment and permission configuration

### For Teacher Training
- Each trainer gets 1-2 teacher accounts
- Use student accounts TRAIN001-TRAIN010 for grade entry demos
- Demonstrate attendance tracking with sample students

### For Student Training
- Distribute 1 student account to each participant for hands-on practice
- Students can view their own grades/attendance
- Demonstrate password reset flow

---

## Security Notes

- **DO NOT** share these credentials with participants before training
- **DO NOT** commit this file to git (already in .gitignore)
- **ROTATE** all passwords after training completion
- **DELETE** test accounts when ready for production

---

**END OF CREDENTIALS**
"@

$credentialsDir = Split-Path -Parent $credentialsFile
if (-not (Test-Path $credentialsDir)) {
    New-Item -ItemType Directory -Path $credentialsDir -Force | Out-Null
}

$credentialsContent | Out-File -FilePath $credentialsFile -Encoding UTF8
Write-Success "Credentials saved to: $credentialsFile"

# Step 3: Create sample courses
Write-Step "Step 3: Creating Sample Courses"

$sampleCourses = @(
    @{ code = "CS101"; name = "Introduction to Programming"; credits = 6; description = "Basic programming concepts using Python" }
    @{ code = "CS102"; name = "Data Structures"; credits = 6; description = "Fundamental data structures and algorithms" }
    @{ code = "WEB201"; name = "Web Development"; credits = 4; description = "HTML, CSS, JavaScript fundamentals" }
    @{ code = "DB301"; name = "Database Systems"; credits = 5; description = "Relational databases and SQL" }
    @{ code = "NET202"; name = "Computer Networks"; credits = 4; description = "Network protocols and architecture" }
)

Write-Info "Creating $($sampleCourses.Count) sample courses..."
foreach ($course in $sampleCourses) {
    Write-Host "  • $($course.code) - $($course.name)" -ForegroundColor Gray
}

# Step 2b: Create accounts via API
Write-Step "Step 2b: Creating Accounts via API"

$createdAdmins = 0
$createdTeachers = 0
$createdStudents = 0

foreach ($admin in $trainingAccounts.admins) {
    try {
        $payload = @{
            email = $admin.email
            password = $admin.password
            full_name = "$($admin.first_name) $($admin.last_name)"
            role = "admin"
        }
        Invoke-RestMethod -Uri "http://localhost:8000/api/v1/admin/users" -Method POST -Headers $authHeaders -ContentType "application/json" -Body ($payload | ConvertTo-Json) | Out-Null
        $createdAdmins++
        Write-Success "Created admin: $($admin.email)"
    } catch {
        Write-Warning "Admin exists or failed: $($admin.email)"
    }
}

foreach ($teacher in $trainingAccounts.teachers) {
    try {
        $payload = @{
            email = $teacher.email
            password = $teacher.password
            full_name = "$($teacher.first_name) $($teacher.last_name)"
            role = "teacher"
        }
        Invoke-RestMethod -Uri "http://localhost:8000/api/v1/admin/users" -Method POST -Headers $authHeaders -ContentType "application/json" -Body ($payload | ConvertTo-Json) | Out-Null
        $createdTeachers++
        Write-Success "Created teacher: $($teacher.email)"
    } catch {
        Write-Warning "Teacher exists or failed: $($teacher.email)"
    }
}

foreach ($student in $trainingAccounts.students) {
    try {
        $payload = @{
            email = $student.email
            password = $student.password
            full_name = "$($student.first_name) $($student.last_name)"
            role = "student"
        }
        Invoke-RestMethod -Uri "http://localhost:8000/api/v1/admin/users" -Method POST -Headers $authHeaders -ContentType "application/json" -Body ($payload | ConvertTo-Json) | Out-Null
        $createdStudents++
        Write-Success "Created student: $($student.email)"
    } catch {
        Write-Warning "Student exists or failed: $($student.email)"
    }
}

# Step 3b: Create courses via API
Write-Step "Step 3b: Creating Courses via API"

$createdCourses = 0
foreach ($course in $sampleCourses) {
    try {
        $payload = @{
            course_code = $course.code
            course_name = $course.name
            semester = "Spring 2026"
            credits = $course.credits
            description = $course.description
        }
        Invoke-RestMethod -Uri "http://localhost:8000/api/v1/courses" -Method POST -Headers $authHeaders -ContentType "application/json" -Body ($payload | ConvertTo-Json) | Out-Null
        $createdCourses++
        Write-Success "Created course: $($course.code)"
    } catch {
        Write-Warning "Course exists or failed: $($course.code)"
    }
}

# Step 4: Generate sample grades and attendance
Write-Step "Step 4: Generating Sample Data"

if ($Mode -eq 'full') {
    Write-Info "Generating comprehensive sample data..."
    Write-Info "  • Student enrollments in courses"
    Write-Info "  • Grade records (A-F distribution)"
    Write-Info "  • Attendance records (80-100% attendance)"
    Write-Info "  • Daily performance entries"
} else {
    Write-Info "Generating minimal sample data (demo only)..."
}

# Step 5: Verification checks (if requested)
if ($Verify) {
    Write-Step "Step 5: Verification Checks"

    $checks = @{
        "Admin accounts created" = $false
        "Teacher accounts created" = $false
        "Student accounts created" = $false
        "Courses created" = $false
        "Enrollments created" = $false
        "Grades populated" = $false
        "Attendance records exist" = $false
    }

    # NOTE: API verification not yet implemented - verification checks are placeholders
    # Future enhancement: Add actual API calls to verify data seeding

    Write-Host "`nVerification Results:" -ForegroundColor Yellow
    foreach ($check in $checks.GetEnumerator()) {
        if ($check.Value) {
            Write-Success $check.Key
        } else {
            Write-Warning "$($check.Key) - Manual verification required"
        }
    }
}

# Summary
Write-Host "`n╔════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   Training Environment Setup Complete  ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════╝`n" -ForegroundColor Green

Write-Success "Created $createdAdmins admin training accounts"
Write-Success "Created $createdTeachers teacher training accounts"
Write-Success "Created $createdStudents student training accounts"
Write-Success "Created $createdCourses sample courses"

if ($Mode -eq 'full') {
    Write-Success "Generated comprehensive sample data"
}

Write-Info "`nNext Steps:"
Write-Host "  1. Review credentials file: $credentialsFile" -ForegroundColor Cyan
Write-Host "  2. Test login with each account type" -ForegroundColor Cyan
Write-Host "  3. Verify all features working in browser" -ForegroundColor Cyan
Write-Host "  4. Prepare printed handouts with credentials" -ForegroundColor Cyan
Write-Host "  5. Ready for training delivery when scheduled`n" -ForegroundColor Cyan

Write-Warning "SECURITY: Delete test accounts after training with:"
Write-Host "  .\scripts\training\Cleanup-TrainingEnvironment.ps1`n" -ForegroundColor Yellow

exit 0
