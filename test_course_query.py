#!/usr/bin/env python3
"""Test the course count query logic from lifespan"""
import sys
import logging
import threading

logging.basicConfig(level=logging.INFO, format='%(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

print("=" * 70)
print("Testing course count query logic...")
print("=" * 70)

try:
    from backend.db import engine as db_engine
    from sqlalchemy import text
    
    print("\n1. Testing database connection...")
    with db_engine.connect() as conn:
        result = conn.execute(text("SELECT 1")).scalar()
        print(f"   ✓ DB connection works: {result}")
    
    print("\n2. Testing course count query...")
    course_count_result = [None]
    query_error = [None]
    query_complete = threading.Event()
    
    def _query_thread():
        try:
            logger.info("Checking course count...")
            with db_engine.connect() as conn:
                conn.execute(text("SELECT 1")).scalar()  # Test connection first
                result = conn.execute(text("SELECT COUNT(*) FROM courses")).scalar()
                course_count_result[0] = result
                print(f"   Result: {result}")
        except Exception as e:
            query_error[0] = e
            print(f"   Error: {e}")
        finally:
            query_complete.set()
    
    # Run database query in a separate thread with 5-second timeout
    db_thread = threading.Thread(target=_query_thread, daemon=True)
    db_thread.start()
    
    print("   Waiting for query (5s timeout)...")
    query_complete.wait(timeout=5.0)
    
    if not query_complete.is_set():
        print("   ✗ Course count query TIMED OUT")
        result = None
    elif query_error[0]:
        print(f"   ✗ Query failed: {query_error[0]}")
        result = None
    else:
        result = course_count_result[0]
        print(f"   ✓ Query succeeded: {result} courses")
    
    print(f"\n3. Result: {result}")
    if result == 0:
        print("   → Would trigger auto-import")
    else:
        print(f"   → Courses exist ({result}), skipping auto-import")

except Exception as e:
    print(f"✗ Error: {e}")
    import traceback
    traceback.print_exc()

print("=" * 70)
print("Test finished")
print("=" * 70)
