import importlib.util
from pathlib import Path


def test_checker_returns_zero():
    repo_root = Path(__file__).resolve().parents[2]
    checker_path = repo_root / "tools" / "check_imports_requirements.py"
    spec = importlib.util.spec_from_file_location("check_imports_requirements", str(checker_path))
    module = importlib.util.module_from_spec(spec)
    loader = spec.loader
    assert loader is not None
    loader.exec_module(module)
    assert module.main() == 0
