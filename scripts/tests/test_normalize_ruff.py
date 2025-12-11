"""
Test suite for normalize_ruff.py - Ruff configuration validation utility.

Tests cover:
  - Configuration file validation
  - Python file discovery and filtering
  - Individual and batch file checking
  - Auto-fix functionality
  - Report generation
  - Standard rule validation
"""

import json
import tempfile
from pathlib import Path
from unittest import mock

import pytest

from scripts.normalize_ruff import (
    RuffConfigValidator,
    RuffReportGenerator,
    RuffRule,
    IGNORED_RULES,
    STANDARD_RULES,
)


class TestRuffRule:
    """Test RuffRule dataclass."""

    def test_rule_creation(self):
        """Test creating a Ruff rule."""
        rule = RuffRule(
            code="E302",
            description="Expected 2 blank lines",
            category="error",
            auto_fixable=True,
        )
        assert rule.code == "E302"
        assert rule.description == "Expected 2 blank lines"
        assert rule.category == "error"
        assert rule.auto_fixable is True

    def test_standard_rules_exist(self):
        """Test that standard rules are defined."""
        assert "E" in STANDARD_RULES
        assert "F" in STANDARD_RULES
        assert STANDARD_RULES["E"].auto_fixable is True
        assert STANDARD_RULES["F"].auto_fixable is True

    def test_ignored_rules_exist(self):
        """Test that ignored rules are defined."""
        assert "E402" in IGNORED_RULES
        assert "E722" in IGNORED_RULES
        assert "E501" in IGNORED_RULES


class TestRuffConfigValidator:
    """Test RuffConfigValidator class."""

    @pytest.fixture
    def temp_project(self):
        """Create temporary project directory."""
        with tempfile.TemporaryDirectory() as tmpdir:
            project_root = Path(tmpdir)
            config_dir = project_root / "config"
            config_dir.mkdir()

            # Create minimal ruff.toml
            config_file = config_dir / "ruff.toml"
            config_file.write_text(
                """line-length = 120

[lint]
select = ["E", "F"]
ignore = ["E402", "E722", "E501"]

[format]
quote-style = "double"
indent-style = "space"
"""
            )

            yield project_root

    def test_init_default_root(self):
        """Test initialization with default root."""
        validator = RuffConfigValidator()
        assert validator.project_root == Path.cwd()

    def test_init_custom_root(self, temp_project):
        """Test initialization with custom root."""
        validator = RuffConfigValidator(project_root=temp_project)
        assert validator.project_root == temp_project

    def test_validate_config_exists_true(self, temp_project):
        """Test config file exists check (positive case)."""
        validator = RuffConfigValidator(project_root=temp_project)
        assert validator.validate_config_exists() is True

    def test_validate_config_exists_false(self):
        """Test config file exists check (negative case)."""
        with tempfile.TemporaryDirectory() as tmpdir:
            project_root = Path(tmpdir)
            validator = RuffConfigValidator(project_root=project_root)
            assert validator.validate_config_exists() is False

    def test_validate_config_syntax_valid(self, temp_project):
        """Test valid configuration syntax validation."""
        validator = RuffConfigValidator(project_root=temp_project)
        assert validator.validate_config_syntax() is True

    def test_validate_config_syntax_invalid(self, temp_project):
        """Test invalid configuration syntax validation."""
        config_file = temp_project / "config" / "ruff.toml"
        # Write invalid TOML
        config_file.write_text("invalid [[[toml syntax")

        validator = RuffConfigValidator(project_root=temp_project)
        assert validator.validate_config_syntax() is False

    def test_validate_config_missing_select(self, temp_project):
        """Test validation fails when 'select' is missing."""
        config_file = temp_project / "config" / "ruff.toml"
        config_file.write_text("[lint]\nignore = ['E402']")

        validator = RuffConfigValidator(project_root=temp_project)
        assert validator.validate_config_syntax() is False

    def test_get_python_files_empty(self, temp_project):
        """Test getting Python files when none exist."""
        validator = RuffConfigValidator(project_root=temp_project)
        python_files = validator.get_python_files()
        assert len(python_files) == 0

    def test_get_python_files_finds_files(self, temp_project):
        """Test finding Python files."""
        # Create some Python files
        (temp_project / "test1.py").write_text("x = 1")
        (temp_project / "test2.py").write_text("y = 2")

        subdir = temp_project / "subdir"
        subdir.mkdir()
        (subdir / "test3.py").write_text("z = 3")

        validator = RuffConfigValidator(project_root=temp_project)
        python_files = validator.get_python_files()

        assert len(python_files) == 3
        assert all(f.suffix == ".py" for f in python_files)

    def test_get_python_files_excludes_venv(self, temp_project):
        """Test that venv directory is excluded."""
        venv_dir = temp_project / ".venv"
        venv_dir.mkdir()
        (venv_dir / "module.py").write_text("x = 1")

        (temp_project / "valid.py").write_text("y = 2")

        validator = RuffConfigValidator(project_root=temp_project)
        python_files = validator.get_python_files()

        assert len(python_files) == 1
        assert python_files[0].name == "valid.py"

    def test_get_python_files_excludes_cache(self, temp_project):
        """Test that cache directories are excluded."""
        cache_dir = temp_project / "__pycache__"
        cache_dir.mkdir()
        (cache_dir / "module.py").write_text("x = 1")

        (temp_project / "valid.py").write_text("y = 2")

        validator = RuffConfigValidator(project_root=temp_project)
        python_files = validator.get_python_files()

        assert len(python_files) == 1
        assert python_files[0].name == "valid.py"

    @mock.patch("subprocess.run")
    def test_check_single_file_pass(self, mock_run, temp_project):
        """Test checking single file that passes."""
        mock_run.return_value = mock.Mock(returncode=0, stdout="", stderr="")

        test_file = temp_project / "test.py"
        test_file.write_text("x = 1")

        validator = RuffConfigValidator(project_root=temp_project)
        result = validator.check_single_file(test_file)

        assert result is True
        assert len(validator.violations) == 0

    @mock.patch("subprocess.run")
    def test_check_single_file_fail(self, mock_run, temp_project):
        """Test checking single file that fails."""
        mock_run.return_value = mock.Mock(
            returncode=1,
            stdout="test.py:1:1: E302 expected 2 blank lines\n",
            stderr="",
        )

        test_file = temp_project / "test.py"
        test_file.write_text("x = 1")

        validator = RuffConfigValidator(project_root=temp_project)
        result = validator.check_single_file(test_file)

        assert result is False
        assert test_file in validator.violations
        assert len(validator.violations[test_file]) > 0

    @mock.patch("subprocess.run")
    def test_check_all_files(self, mock_run, temp_project):
        """Test checking all files."""
        # Create test files
        (temp_project / "pass.py").write_text("x = 1")
        (temp_project / "fail.py").write_text("y = 2")

        # Mock ruff to fail on fail.py
        def run_side_effect(args, **kwargs):
            args_str = " ".join(str(a) for a in args)
            if "fail.py" in args_str:
                return mock.Mock(
                    returncode=1,
                    stdout="fail.py:1:1: E302 expected 2 blank lines\n",
                    stderr="",
                )
            return mock.Mock(returncode=0, stdout="", stderr="")

        mock_run.side_effect = run_side_effect

        validator = RuffConfigValidator(project_root=temp_project)
        passed, failed = validator.check_all_files()

        assert passed == 1
        assert failed == 1

    @mock.patch("subprocess.run")
    def test_fix_files(self, mock_run, temp_project):
        """Test fixing files."""
        (temp_project / "test.py").write_text("x = 1")

        # Mock ruff format to succeed
        mock_run.return_value = mock.Mock(returncode=0, stdout="", stderr="")

        validator = RuffConfigValidator(project_root=temp_project)
        fixed_count = validator.fix_files()

        assert fixed_count == 1
        assert validator.fixed_count == 1

    def test_generate_report_no_violations(self, temp_project):
        """Test report generation with no violations."""
        validator = RuffConfigValidator(project_root=temp_project)
        report = validator.generate_report()

        assert "No violations found" in report

    def test_generate_report_with_violations(self, temp_project):
        """Test report generation with violations."""
        test_file = temp_project / "test.py"
        test_file.write_text("x = 1")

        validator = RuffConfigValidator(project_root=temp_project)
        validator.violations[test_file] = [
            "test.py:1:1: E302 expected 2 blank lines",
            "test.py:2:1: E302 expected 2 blank lines",
        ]

        report = validator.generate_report()

        assert "Violation Report" in report
        assert "test.py" in report
        assert "2" in report  # Violation count

    def test_validate_standard_rules_valid(self, temp_project):
        """Test standard rules validation (valid case)."""
        validator = RuffConfigValidator(project_root=temp_project)
        assert validator.validate_standard_rules() is True

    def test_validate_standard_rules_missing(self, temp_project):
        """Test standard rules validation (missing E and F)."""
        config_file = temp_project / "config" / "ruff.toml"
        config_file.write_text("[lint]\nselect = ['W']")

        validator = RuffConfigValidator(project_root=temp_project)
        assert validator.validate_standard_rules() is False


class TestRuffReportGenerator:
    """Test RuffReportGenerator class."""

    @pytest.fixture
    def temp_project(self):
        """Create temporary project directory."""
        with tempfile.TemporaryDirectory() as tmpdir:
            project_root = Path(tmpdir)
            config_dir = project_root / "config"
            config_dir.mkdir()

            config_file = config_dir / "ruff.toml"
            config_file.write_text("[lint]\nselect = ['E', 'F']")

            yield project_root

    def test_generate_json_report(self, temp_project):
        """Test JSON report generation."""
        validator = RuffConfigValidator(project_root=temp_project)

        test_file = temp_project / "test.py"
        test_file.write_text("x = 1")

        validator.violations[test_file] = [
            "test.py:1:1: E302 expected 2 blank lines",
        ]

        generator = RuffReportGenerator(validator)
        report = generator.generate_json_report()

        data = json.loads(report)
        assert "summary" in data
        assert "violations" in data
        assert data["summary"]["total_violations"] == 1

    def test_get_violation_summary(self, temp_project):
        """Test violation summary extraction."""
        validator = RuffConfigValidator(project_root=temp_project)

        test_file = temp_project / "test.py"
        test_file.write_text("x = 1")

        validator.violations[test_file] = [
            "test.py:1:1: E302 expected 2 blank lines",
            "test.py:2:1: E302 expected 2 blank lines",
            "test.py:3:1: F401 unused import",
        ]

        generator = RuffReportGenerator(validator)
        summary = generator.get_violation_summary()

        assert "E302" in summary
        assert "F401" in summary
        assert summary["E302"] == 2
        assert summary["F401"] == 1


class TestIntegration:
    """Integration tests combining multiple components."""

    @pytest.fixture
    def project_with_files(self):
        """Create project with mix of valid/invalid files."""
        with tempfile.TemporaryDirectory() as tmpdir:
            project_root = Path(tmpdir)

            # Create config
            config_dir = project_root / "config"
            config_dir.mkdir()
            config_file = config_dir / "ruff.toml"
            config_file.write_text("[lint]\nselect = ['E', 'F']\nignore = ['E402']")

            # Create valid file
            (project_root / "valid.py").write_text('x = "hello"\n')

            # Create test directory with a file
            test_dir = project_root / "tests"
            test_dir.mkdir()
            (test_dir / "test_sample.py").write_text("def test_pass():\n    pass\n")

            yield project_root

    def test_full_validation_flow(self, project_with_files):
        """Test complete validation workflow."""
        validator = RuffConfigValidator(project_root=project_with_files)

        assert validator.validate_config_exists() is True
        assert validator.validate_config_syntax() is True
        assert validator.validate_standard_rules() is True

        files = validator.get_python_files()
        assert len(files) == 2  # valid.py and test_sample.py

    def test_report_generation_flow(self, project_with_files):
        """Test complete report generation workflow."""
        validator = RuffConfigValidator(project_root=project_with_files)

        # Manually add violations for testing
        test_file = project_with_files / "valid.py"
        validator.violations[test_file] = ["valid.py:1:1: E302 expected 2 blank lines"]

        generator = RuffReportGenerator(validator)

        # Generate both report formats
        text_report = validator.generate_report()
        json_report = generator.generate_json_report()

        assert "Violation Report" in text_report
        data = json.loads(json_report)
        assert data["summary"]["total_violations"] == 1


class TestEdgeCases:
    """Test edge cases and error handling."""

    def test_empty_project(self):
        """Test with completely empty project."""
        with tempfile.TemporaryDirectory() as tmpdir:
            project_root = Path(tmpdir)

            validator = RuffConfigValidator(project_root=project_root)
            assert validator.validate_config_exists() is False

    def test_malformed_python_file(self):
        """Test with syntactically invalid Python file."""
        with tempfile.TemporaryDirectory() as tmpdir:
            project_root = Path(tmpdir)

            # Create config
            config_dir = project_root / "config"
            config_dir.mkdir()
            config_file = config_dir / "ruff.toml"
            config_file.write_text("[lint]\nselect = ['E', 'F']")

            # Create malformed Python
            bad_file = project_root / "bad.py"
            bad_file.write_text("if x == 1\n  print('hello')")

            validator = RuffConfigValidator(project_root=project_root)
            files = validator.get_python_files()
            assert len(files) == 1

    @mock.patch("subprocess.run")
    def test_subprocess_timeout(self, mock_run, tmpdir):
        """Test handling of subprocess timeout."""
        project_root = Path(tmpdir)
        config_dir = project_root / "config"
        config_dir.mkdir()
        config_file = config_dir / "ruff.toml"
        config_file.write_text("[lint]\nselect = ['E', 'F']")

        test_file = project_root / "test.py"
        test_file.write_text("x = 1")

        import subprocess

        mock_run.side_effect = subprocess.TimeoutExpired("ruff", 10)

        validator = RuffConfigValidator(project_root=project_root)
        result = validator.check_single_file(test_file)

        assert result is False


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
