import re
from typing import Any, Dict


def test_environment_basic_shape(client):
    resp = client.get("/control/api/environment")
    assert resp.status_code == 200
    data: Dict[str, Any] = resp.json()

    # Required base fields and types
    assert isinstance(data.get("python_path"), str)
    assert isinstance(data.get("python_version"), str)
    assert isinstance(data.get("platform"), str)
    assert isinstance(data.get("cwd"), str)
    assert isinstance(data.get("venv_active"), bool)

    # Application info fields may be None or str
    for key in (
        "app_version",
        "api_version",
        "frontend_version",
        "git_revision",
        "environment_mode",
    ):
        assert key in data

    # python_version follows major.minor.patch
    assert re.match(r"^\d+\.\d+\.\d+$", data["python_version"]) is not None


def test_environment_includes_python_packages(client):
    resp = client.get("/control/api/environment?include_packages=true")
    assert resp.status_code == 200
    data: Dict[str, Any] = resp.json()

    # python_packages should be a dict with at least fastapi
    pkgs = data.get("python_packages")
    assert isinstance(pkgs, dict)
    assert "fastapi" in pkgs
    assert isinstance(pkgs["fastapi"], str) and len(pkgs["fastapi"]) > 0
