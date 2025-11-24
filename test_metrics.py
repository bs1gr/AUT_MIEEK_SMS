#!/usr/bin/env python3
"""Test metrics collector creation"""
import sys
import logging
import asyncio

logging.basicConfig(level=logging.INFO, format='%(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

print("=" * 70)
print("Testing metrics collector creation...")
print("=" * 70)

async def test_metrics():
    try:
        print("\n1. Checking ENABLE_METRICS setting...")
        import os
        enable_metrics = os.environ.get("ENABLE_METRICS", "1").strip().lower() in {"1", "true", "yes"}
        print(f"   ENABLE_METRICS={enable_metrics}")
        
        if enable_metrics:
            print("\n2. Attempting to import prometheus_client...")
            try:
                from prometheus_client import Counter
                print("   ✓ prometheus_client imported successfully")
            except ImportError as e:
                print(f"   ✗ prometheus_client not available: {e}")
                print("   This is expected in development")
                return
            
            print("\n3. Attempting to import metrics collector...")
            from backend.middleware.prometheus_metrics import create_metrics_collector_task
            print("   ✓ create_metrics_collector_task imported successfully")
            
            print("\n4. Creating metrics collector...")
            metrics_collector = create_metrics_collector_task(interval=60)
            print("   ✓ create_metrics_collector_task() returned")
            
            print("\n5. Creating async task...")
            metrics_task = asyncio.create_task(metrics_collector())
            print(f"   ✓ Task created: {metrics_task}")
            
            # Give it a moment to start
            await asyncio.sleep(0.5)
            
            print(f"   Task state: {'DONE' if metrics_task.done() else 'RUNNING'}")
            
            # Clean up
            metrics_task.cancel()
            try:
                await metrics_task
            except asyncio.CancelledError:
                print("   ✓ Task cancelled cleanly")
        else:
            print("   Metrics disabled")
    
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()

print()
asyncio.run(test_metrics())

print("=" * 70)
print("Test finished")
print("=" * 70)
