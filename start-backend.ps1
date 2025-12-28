$env:DISABLE_STARTUP_TASKS = '1'
$env:CSRF_ENABLED = '0'
$env:AUTH_MODE = 'permissive'
$env:SERVE_FRONTEND = '1'

Set-Location "D:\SMS\student-management-system"
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --log-level warning
