import importlib.util
import os
import sys
from pathlib import Path


def test_checker_returns_zero(monkeypatch):
    """Test that check_imports_requirements main() returns 0 for valid imports."""
    repo_root = Path(__file__).resolve().parents[3]
    # Tool is now in scripts/utils/validators/import_checker.py
    checker_path = repo_root / "scripts" / "utils" / "validators" / "import_checker.py"

    # Change to repo root to ensure correct path resolution
    original_cwd = os.getcwd()
    os.chdir(repo_root)

    try:
        # Mock sys.argv to prevent argparse from seeing pytest args
        # Use 'backend' mode (checks backend/ only, exits 0 if clean)
        monkeypatch.setattr(sys, "argv", ["import_checker.py", "--mode", "backend"])

        spec = importlib.util.spec_from_file_location(
            "check_imports_requirements", str(checker_path)
        )
        module = importlib.util.module_from_spec(spec)
        loader = spec.loader
        assert loader is not None
        loader.exec_module(module)

        # Should exit 0 for backend mode (validates backend/ structure only)
        try:
            module.main()
        except SystemExit as exc:
            code = 0 if exc.code is None else int(exc.code)
            assert code == 0
    finally:
        os.chdir(original_cwd)
