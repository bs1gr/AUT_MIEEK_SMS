# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec for SMS_Native_Lite_Simple.exe
Headless FastAPI server (no PyWebView). Bundles Python runtime, FastAPI backend, and React frontend.
Listens on http://0.0.0.0:8000

CRITICAL: This spec must explicitly list all required packages because the GitHub Actions
build environment doesn't have all dependencies installed at spec analysis time.
"""
from PyInstaller.utils.hooks import collect_submodules, collect_data_files
import os

block_cipher = None

# Collect backend submodules - only list, don't rely on collect_all
backend_hiddenimports = collect_submodules('backend')

a = Analysis(
    ['lite_simple_entrypoint.py'],
    pathex=[],
    binaries=[],
    datas=[
        # Frontend React build (dist or dist_lite/)
        ('../frontend/dist', 'frontend/dist'),
        # Database migrations (Alembic) - CRITICAL: alembic.ini must be in backend/ directory
        ('alembic.ini', 'backend'),
        ('migrations', 'backend/migrations'),
    ] + collect_data_files('bottle', includes=['**/*']),
    hiddenimports=[
        # Core backend modules
        'backend',
        'backend.app_factory',
        'backend.lifespan',
        'backend.middleware_config',
        'backend.error_handlers',
        'backend.router_registry',
        'backend.db',
        'backend.db.connection',
        'backend.config',
        'backend.environment',
        'backend.health_checks',
        'backend.scripts',
        'backend.scripts.admin',
        'backend.scripts.admin.bootstrap',
        # Service layer
        'backend.services',
        'backend.services.student_service',
        'backend.services.grade_service',
        'backend.services.course_service',
        'backend.services.enrollment_service',
        'backend.services.attendance_service',
        'backend.services.analytics_service',
        # Routers
        'backend.routers',
        'backend.routers.routers_auth',
        'backend.routers.routers_admin',
        'backend.routers.routers_students',
        'backend.routers.routers_courses',
        'backend.routers.routers_grades',
        'backend.routers.routers_attendance',
        'backend.routers.routers_enrollments',
        'backend.routers.routers_imports',
        'backend.routers.routers_exports',
        # CRITICAL PACKAGES - explicitly list all to force bundling
        # Database & ORM
        'sqlalchemy',
        'sqlalchemy.orm',
        'sqlalchemy.pool',
        'sqlalchemy.engine',
        'sqlalchemy.sql',
        'sqlalchemy.dialects.sqlite',
        'alembic',
        'alembic.migration',
        'alembic.operations',
        # Authentication
        'passlib',
        'passlib.context',
        'passlib.handlers',
        'passlib.handlers.bcrypt',
        'passlib.handlers.pbkdf2',
        'passlib.handlers.argon2',
        'jwt',
        'jwt.exceptions',
        # Web Framework
        'fastapi',
        'fastapi.dependencies',
        'fastapi.security',
        'fastapi.openapi',
        'starlette',
        'starlette.middleware',
        'starlette.middleware.cors',
        'starlette.responses',
        'starlette.requests',
        'starlette.exceptions',
        # HTTP Server
        'uvicorn',
        'uvicorn.config',
        'uvicorn.server',
        'uvicorn.logging',
        # Data Validation
        'pydantic',
        'pydantic.main',
        'pydantic.fields',
        'pydantic_settings',
        # Rate Limiting
        'slowapi',
        'slowapi.middleware',
        'slowapi.util',
        # Scheduling
        'apscheduler',
        'apscheduler.schedulers',
        'apscheduler.schedulers.asyncio',
        # CSV/Excel
        'openpyxl',
        'openpyxl.worksheet',
        'csv',
        # Other utilities
        'bottle',
        'proxy_tools',
        'requests',
        'click',
    ] + backend_hiddenimports,
    hookspath=['backend/pyinstaller_hooks'],  # Use custom hooks to override problematic ones
    hooksconfig={},
    runtime_hooks=[],
    excludedimports=[
        'pytest',
        'django',
        'flask',
        'flask_cors',
        'celery',
        'redis',
        'plotly',
        'matplotlib',
        'numpy',
        'pandas',
        'pythoncom',
        'win32com',
        'pywintypes',
        'torch',
        'tensorflow',
        'webview',  # No PyWebView in headless version
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='SMS_Native_Lite_Simple',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,  # Show terminal window for logging
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='../installer/assets/sms_icon.ico' if os.path.exists('../installer/assets/sms_icon.ico') else None,
)
