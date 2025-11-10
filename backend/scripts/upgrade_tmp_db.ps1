Remove-Item -Force -ErrorAction SilentlyContinue 'D:\SMS\student-management-system\backend\tmp_alembic_autogen.db'
$env:DATABASE_URL = 'sqlite:///D:/SMS/student-management-system/backend/tmp_alembic_autogen.db'
python -m alembic upgrade head
python -m alembic current
