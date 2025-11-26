from fastapi.testclient import TestClient

import backend.main as main


def test_list_routes():
    client = TestClient(main.app)
    resp = client.get("/openapi.json")
    assert resp.status_code == 200
    paths = resp.json()["paths"].keys()
    print("REGISTERED PATHS:", list(paths))
    assert any("database-upload" in p for p in paths), f"database-upload endpoint not found in: {list(paths)}"
