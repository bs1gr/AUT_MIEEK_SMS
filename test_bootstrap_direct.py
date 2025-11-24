#!/usr/bin/env python3
"""Direct test of bootstrap function"""
import sys
import logging

logging.basicConfig(level=logging.DEBUG, format='%(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

print("=" * 70)
print("Testing admin bootstrap directly...")
print("=" * 70)

try:
    from backend.config import settings
    print("✓ Settings loaded")
    
    from backend.db import SessionLocal
    print("✓ Database session factory loaded")
    
    from backend.admin_bootstrap import ensure_default_admin_account
    print("✓ Bootstrap function loaded")
    
    print("\nCalling ensure_default_admin_account...")
    ensure_default_admin_account(settings=settings, session_factory=SessionLocal, logger=logger)
    print("✓ Bootstrap completed")
    
except Exception as e:
    print(f"✗ Error: {e}")
    import traceback
    traceback.print_exc()

print("=" * 70)
print("Test finished")
print("=" * 70)
