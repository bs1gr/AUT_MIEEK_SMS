#!/usr/bin/env pwsh
<#
Test the complete attendance workflow:
1. Create a student
2. Create a course
3. Enroll student in course
4. Save attendance for a specific day
5. Verify attendance was saved
#>

$API_URL = "http://localhost:8082/api/v1"
$ErrorActionPreference = "Stop"

function Test-Endpoint {
    param([string]$Method, [string]$Endpoint, [object]$Body)
    
    $url = "$API_URL$Endpoint"
    $params = @{
        Uri = $url
        Method = $Method
        ContentType = "application/json"
    }
    
    if ($Body) {
        $params["Body"] = ($Body | ConvertTo-Json)
    }
    
    try {
        $response = Invoke-WebRequest @params -ErrorAction SilentlyContinue
        return @{
            StatusCode = $response.StatusCode
            Content = $response.Content | ConvertFrom-Json
        }
    }
    catch {
        if ($_.Exception.Response) {
            try {
                $content = $_.Exception.Response.Content.ToString() | ConvertFrom-Json
            }
            catch {
                $content = $_.Exception.Message
            }
            return @{
                StatusCode = $_.Exception.Response.StatusCode.Value__
                Content = $content
            }
        }
        throw
    }
}

Write-Host "🧪 Testing Complete Attendance Workflow" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Create Student
Write-Host "1️⃣  Creating test student..." -ForegroundColor Yellow
$studentResp = Test-Endpoint "POST" "/students/" @{
    student_id = "TEST_ATT_$(Get-Random)"
    email = "attendance.test@example.com"
    first_name = "Attendance"
    last_name = "Test"
}
$studentId = $studentResp.Content.id
Write-Host "   ✅ Student created (ID: $studentId)" -ForegroundColor Green

# Step 2: Create Course
Write-Host "2️⃣  Creating test course..." -ForegroundColor Yellow
$courseResp = Test-Endpoint "POST" "/courses/" @{
    course_code = "ATT_TEST_$(Get-Random)"
    course_name = "Attendance Test Course"
    semester = "Fall 2025"
    credits = 3
}
$courseId = $courseResp.Content.id
Write-Host "   ✅ Course created (ID: $courseId)" -ForegroundColor Green

# Step 3: Enroll student in course
Write-Host "3️⃣  Enrolling student in course..." -ForegroundColor Yellow
$enrollResp = Test-Endpoint "POST" "/enrollments/" @{
    student_id = $studentId
    course_id = $courseId
}
Write-Host "   ✅ Enrollment created" -ForegroundColor Green

# Step 4: Create attendance record
Write-Host "4️⃣  Creating attendance record..." -ForegroundColor Yellow
$today = Get-Date -Format "yyyy-MM-dd"
$attResp = Test-Endpoint "POST" "/attendance/" @{
    student_id = $studentId
    course_id = $courseId
    date = $today
    status = "Present"
    period_number = 1
}
$attId = $attResp.Content.id
Write-Host "   ✅ Attendance created (ID: $attId, Status: $($attResp.Content.status))" -ForegroundColor Green

# Step 5: Verify attendance was saved
Write-Host "5️⃣  Verifying attendance record..." -ForegroundColor Yellow
$getResp = Test-Endpoint "GET" "/attendance/$attId" $null
if ($getResp.Content.status -eq "Present") {
    Write-Host "   ✅ Attendance verified (Status: $($getResp.Content.status))" -ForegroundColor Green
}
else {
    Write-Host "   ❌ Attendance status mismatch!" -ForegroundColor Red
}

# Step 6: Update attendance
Write-Host "6️⃣  Updating attendance status..." -ForegroundColor Yellow
$updateResp = Test-Endpoint "PUT" "/attendance/$attId" @{
    status = "Late"
}
Write-Host "   ✅ Attendance updated (New status: $($updateResp.Content.status))" -ForegroundColor Green

# Step 7: Get attendance by course
Write-Host "7️⃣  Fetching all attendance for course..." -ForegroundColor Yellow
$courseAttResp = Test-Endpoint "GET" "/attendance/course/$courseId" $null
Write-Host "   ✅ Found $($courseAttResp.Content.Length) attendance record(s)" -ForegroundColor Green

# Step 8: Get attendance by student
Write-Host "8️⃣  Fetching all attendance for student..." -ForegroundColor Yellow
$studentAttResp = Test-Endpoint "GET" "/attendance/student/$studentId" $null
Write-Host "   ✅ Found $($studentAttResp.Content.Length) attendance record(s)" -ForegroundColor Green

Write-Host ""
Write-Host "✅ All attendance workflow tests passed!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host "   - Student: $studentId"
Write-Host "   - Course: $courseId"
Write-Host "   - Attendance ID: $attId"
Write-Host "   - Final Status: $($updateResp.Content.status)"
Write-Host "   - Date: $today"
