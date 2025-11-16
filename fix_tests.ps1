# Fix test files by adding missing fields

$courseGradeFile = "frontend\src\features\students\components\CourseGradeBreakdown.test.tsx"
$studentCardFile = "frontend\src\features\students\components\StudentCard.test.tsx"
$attendanceFile = "frontend\src\features\students\components\AttendanceDetails.test.tsx"

# Fix CourseGradeBreakdown.test.tsx - add weight field before category
$content = Get-Content $courseGradeFile -Raw
$content = $content -replace '(\s+grade: \d+,\s+max_grade: \d+\.?\d*,)\s+(category:', '$1 weight: 0.25, $2')
$content | Set-Content $courseGradeFile -NoNewline

# Fix StudentCard.test.tsx - add enrollment_date and remove unused import
$content = Get-Content $studentCardFile -Raw
$content = $content -replace 'import \{ render, screen, fireEvent, within \}', 'import { render, screen, fireEvent }'
$content = $content -replace '(  email: ''john\.doe@example\.com'',\s+)', '$1  enrollment_date: ''2023-09-01'', '
$content | Set-Content $studentCardFile -NoNewline

# Fix AttendanceDetails.test.tsx - change numeric attendanceRate to string
$content = Get-Content $attendanceFile -Raw
$content = $content -replace 'attendanceRate: 0,', "attendanceRate: '0',"
$content | Set-Content $attendanceFile -NoNewline

Write-Host "Test files fixed!" -ForegroundColor Green
