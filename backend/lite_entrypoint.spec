# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec for SMS_Native_Lite_Simple.exe
Headless FastAPI server (no PyWebView). Bundles Python runtime, FastAPI backend, and React frontend.
Listens on http://0.0.0.0:8000
"""
from PyInstaller.utils.hooks import collect_submodules, collect_data_files, collect_all
import os

block_cipher = None

# Collect all submodules for critical packages to ensure they're bundled
backend_hiddenimports = collect_submodules('backend')
passlib_all = collect_all('passlib')
fastapi_all = collect_all('fastapi')
uvicorn_all = collect_all('uvicorn')
sqlalchemy_all = collect_all('sqlalchemy')
pydantic_all = collect_all('pydantic')
starlette_all = collect_all('starlette')

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
    ] + collect_data_files('bottle', includes=['**/*'])
      + collect_data_files('fastapi')
      + collect_data_files('uvicorn')
      + collect_data_files('sqlalchemy')
      + collect_data_files('passlib')
      + collect_data_files('pydantic')
      + collect_data_files('starlette'),
    hiddenimports=[
        # Core backend modules
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
        'backend.scripts.admin.bootstrap',
        # Key packages - use collect_all results
    ] + backend_hiddenimports
      + passlib_all[1]  # passlib hiddenimports
      + fastapi_all[1]  # fastapi hiddenimports
      + uvicorn_all[1]  # uvicorn hiddenimports
      + sqlalchemy_all[1]  # sqlalchemy hiddenimports
      + pydantic_all[1]  # pydantic hiddenimports
      + starlette_all[1],  # starlette hiddenimports
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
