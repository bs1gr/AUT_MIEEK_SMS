#!/usr/bin/env python3
"""Test if run_migrations can be called from async context"""
import asyncio
import logging

logging.basicConfig(level=logging.INFO, format='%(name)s - %(message)s')
logger = logging.getLogger(__name__)

async def test_migrations_in_async():
    """Test calling run_migrations from an async function"""
    logger.info("Starting test in async function...")
    
    try:
        from backend.run_migrations import run_migrations
        import sys
        sys.stdout.flush()
        sys.stderr.flush()
        
        logger.info("About to call run_migrations()...")
        migration_success = run_migrations(verbose=False)
        logger.info(f"run_migrations() returned: {migration_success}")
        
        if migration_success:
            logger.info("✓ Database migrations up to date")
        else:
            logger.warning("✗ Database migrations failed")
            
    except Exception as e:
        logger.error(f"Migration runner error: {e}", exc_info=True)
    finally:
        import sys
        sys.stdout.flush()
        sys.stderr.flush()
    
    logger.info("Test completed")

print("=" * 70)
print("Testing run_migrations() from async context...")
print("=" * 70)

asyncio.run(test_migrations_in_async())

print("=" * 70)
print("Test finished")
print("=" * 70)
