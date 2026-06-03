# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec for SMS_Lite.exe
Headless FastAPI server (no PyWebView). Bundles Python runtime, FastAPI backend, and React frontend.
Listens on http://0.0.0.0:8000
"""
from PyInstaller.utils.hooks import collect_submodules, collect_data_files, collect_all
import os

# Collect passlib submodules (handlers, etc.)
passlib_hiddenimports = collect_submodules('passlib')

block_cipher = None

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
        # Core dependencies
        'backend',
        'backend.app_factory',
        'backend.lifespan',
        'backend.middleware_config',
        'backend.error_handlers',
        'backend.router_registry',
        'backend.db',
        'backend.config',
        'backend.environment',
        'backend.health_checks',
        # Key packages
        'fastapi',
        'uvicorn',
        'uvicorn.config',
        'sqlalchemy',
        'sqlalchemy.orm',
        'pydantic',
        'pydantic_settings',
        'passlib',
        'passlib.context',
        'passlib.handlers.pbkdf2',
        'jwt',
        'bottle',
        'proxy_tools',
        'requests',
        # Service layer
        'backend.services',
        'backend.services.student_service',
        'backend.services.grade_service',
        'backend.services.course_service',
        'backend.services.enrollment_service',
        'backend.services.attendance_service',
        'backend.services.analytics_service',
        # Routers (will be discovered but explicit for safety)
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
        # Rate limiting
        'slowapi',
        # Scheduler
        'apscheduler',
    ] + collect_submodules('backend') + passlib_hiddenimports,
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
    name='SMS_Lite',
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
