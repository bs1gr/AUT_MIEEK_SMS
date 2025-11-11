import os
import pytest


RUN_INTEGRATION = os.environ.get("RUN_INTEGRATION", "0") in ("1", "true", "yes")


@pytest.mark.skipif(not RUN_INTEGRATION, reason="Integration tests disabled (set RUN_INTEGRATION=1)")
def test_health_endpoint_integration():
    """Simple integration smoke test against a running backend.

    This test is intentionally skipped by default. It will run when the
    CI 'integration' job sets RUN_INTEGRATION=1 and starts the service.
    """
    import requests

    base = os.environ.get("INTEGRATION_BASE_URL", "http://127.0.0.1:8000")
    r = requests.get(f"{base}/health", timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert "status" in data or "database" in data
