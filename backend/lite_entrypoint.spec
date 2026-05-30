# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec for SMS_Native_Lite.exe
Bundles Python runtime, FastAPI backend, and React frontend into single executable.
"""
from PyInstaller.utils.hooks import collect_submodules, collect_data_files
import os

block_cipher = None

a = Analysis(
    ['lite_entrypoint.py'],
    pathex=[],
    binaries=[],
    datas=[
        # Frontend React build (dist_lite/)
        ('../frontend/dist_lite', 'frontend/dist'),
        # Database migrations (Alembic)
        ('alembic', 'alembic'),
    ],
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
        'jwt',
        'pywebview',
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
        # Rate limiting
        'slowapi',
        # Scheduler
        'apscheduler',
    ] + collect_submodules('backend'),
    hookspath=[],
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
        'torch',
        'tensorflow',
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
    name='SMS_Native_Lite',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,  # No terminal window
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='../installer/assets/sms_icon.ico' if os.path.exists('../installer/assets/sms_icon.ico') else None,
)
