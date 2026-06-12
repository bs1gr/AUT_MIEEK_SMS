# Prepare a temporary SQLite DB and autogenerate a migration for refresh_tokens
$env:DATABASE_URL = 'sqlite:///D:/SMS/student-management-system/backend/tmp_alembic_autogen.db'
Remove-Item -Force -ErrorAction SilentlyContinue 'D:\SMS\student-management-system\backend\tmp_alembic_autogen.db'
python -m alembic stamp 039d0af51aab
python -m alembic revision --autogenerate -m 'add refresh_tokens (autogen)'
