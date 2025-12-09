import importlib.util
from pathlib import Path


def test_checker_returns_zero():
    repo_root = Path(__file__).resolve().parents[2]
    new_test = repo_root / "scripts" / "utils" / "tests" / "test_check_imports_requirements.py"
    spec = importlib.util.spec_from_file_location("test_check_imports_requirements_proxy", str(new_test))
    module = importlib.util.module_from_spec(spec)
    loader = spec.loader
    assert loader is not None
    loader.exec_module(module)  # type: ignore
    module.test_checker_returns_zero()
