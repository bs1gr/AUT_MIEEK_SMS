"""
Setup and installation operations.

This module provides:
- Dependency installation (Python, Node.js packages)
- Environment file creation from templates
- Virtual environment management
- Database migration execution
"""

from .base import Operation, OperationResult, get_project_root, get_python_executable, OperationTimeouts
from .diagnostics import DependencyChecker
from pathlib import Path
from typing import Optional
import subprocess
import shutil
import time


# ============================================================================
#  SETUP OPERATIONS
# ============================================================================

class SetupOperations(Operation):
    """Setup and installation operations"""

    def __init__(self, root_dir: Optional[Path] = None):
        super().__init__(root_dir or get_project_root())
        self.backend_dir = self.root_dir / 'backend'
        self.frontend_dir = self.root_dir / 'frontend'

    def create_env_from_template(self, directory: Path) -> OperationResult:
        """
        Create .env from .env.example template.

        Args:
            directory: Directory containing .env.example

        Returns:
            OperationResult indicating success or failure
        """
        env_file = directory / '.env'
        template = directory / '.env.example'

        if env_file.exists():
            return OperationResult.warning_result(
                f".env already exists in {directory.name}"
            )

        if not template.exists():
            return OperationResult.failure_result(
                f"No .env.example found in {directory.name}"
            )

        try:
            shutil.copy2(template, env_file)
            self.log_success(f"Created .env in {directory.name}")
            return OperationResult.success_result("Created .env from template")
        except Exception as e:
            return OperationResult.failure_result("Failed to create .env", e)

    def set_version_in_env(self, version: str) -> OperationResult:
        """
        Set VERSION in root .env file.

        Args:
            version: Version string to set

        Returns:
            OperationResult indicating success or failure
        """
        env_file = self.root_dir / '.env'

        try:
            if env_file.exists():
                lines = env_file.read_text(encoding='utf-8').splitlines()
                found = False
                new_lines = []
                for line in lines:
                    if line.startswith('VERSION='):
                        new_lines.append(f'VERSION={version}')
                        found = True
                    else:
                        new_lines.append(line)
                if not found:
                    new_lines.append(f'VERSION={version}')
                env_file.write_text('\n'.join(new_lines) + '\n', encoding='utf-8')
            else:
                env_file.write_text(f'VERSION={version}\n', encoding='utf-8')

            self.log_success(f"Set VERSION={version} in .env")
            return OperationResult.success_result(f"Set VERSION={version}")
        except Exception as e:
            return OperationResult.failure_result("Failed to set VERSION", e)

    def create_venv(self, force: bool = False) -> OperationResult:
        """
        Create Python virtual environment.

        Args:
            force: If True, remove existing venv first

        Returns:
            OperationResult indicating success or failure
        """
        venv_dir = self.backend_dir / 'venv'

        if venv_dir.exists():
            if not force:
                return OperationResult.warning_result("Virtual environment already exists")
            self.log_info("Removing existing venv (force=True)")
            try:
                shutil.rmtree(venv_dir)
            except Exception as e:
                return OperationResult.failure_result("Failed to remove existing venv", e)

        try:
            self.log_info("Creating virtual environment...")
            # Windows: python -m venv
            subprocess.run(
                ['python', '-m', 'venv', str(venv_dir)],
                check=True,
                cwd=str(self.backend_dir),
                timeout=OperationTimeouts.MEDIUM_COMMAND
            )
            self.log_success("Virtual environment created")
            return OperationResult.success_result("Virtual environment created")
        except subprocess.CalledProcessError as e:
            return OperationResult.failure_result(
                f"Failed to create venv (exit code {e.returncode})", e
            )
        except subprocess.TimeoutExpired:
            return OperationResult.failure_result("venv creation timed out")
        except Exception as e:
            return OperationResult.failure_result("Failed to create venv", e)

    def get_pip_path(self) -> Path:
        """
        Get path to pip executable (in venv if exists, otherwise system pip).

        Returns:
            Path to pip executable
        """
        venv_dir = self.backend_dir / 'venv'
        if venv_dir.exists():
            # Windows: venv/Scripts/pip.exe
            pip_path = venv_dir / 'Scripts' / 'pip.exe'
            if pip_path.exists():
                return pip_path
            # Unix fallback (though this is Windows-focused)
            pip_path = venv_dir / 'bin' / 'pip'
            if pip_path.exists():
                return pip_path
        # Fallback to system pip (via python -m pip)
        return Path('python')  # Will use 'python -m pip'

    def install_backend_dependencies(self, force: bool = False) -> OperationResult:
        """
        Install backend dependencies with pip.

        Args:
            force: If True, force reinstall all packages

        Returns:
            OperationResult indicating success or failure
        """
        requirements = self.backend_dir / 'requirements.txt'

        if not requirements.exists():
            return OperationResult.failure_result("requirements.txt not found")

        try:
            pip_path = self.get_pip_path()

            # Determine pip command
            if pip_path.name == 'python':
                pip_cmd = ['python', '-m', 'pip']
            else:
                pip_cmd = [str(pip_path)]

            self.log_info("Installing backend dependencies...")

            # Upgrade pip first
            self.log_debug("Upgrading pip...")
            subprocess.run(
                pip_cmd + ['install', '--disable-pip-version-check', '-q', '-U', 'pip'],
                check=True,
                cwd=str(self.backend_dir),
                timeout=OperationTimeouts.MEDIUM_COMMAND
            )

            # Install requirements
            install_cmd = pip_cmd + [
                'install',
                '--disable-pip-version-check',
                '-q',
                '-r',
                'requirements.txt'
            ]
            if force:
                install_cmd.append('--force-reinstall')

            self.log_debug(f"Running: {' '.join(install_cmd)}")
            subprocess.run(
                install_cmd,
                check=True,
                cwd=str(self.backend_dir),
                timeout=OperationTimeouts.LONG_COMMAND  # 10 minutes for large installs
            )

            self.log_success("Backend dependencies installed")
            return OperationResult.success_result("Backend dependencies installed")
        except subprocess.CalledProcessError as e:
            return OperationResult.failure_result(
                f"pip install failed (exit code {e.returncode})", e
            )
        except subprocess.TimeoutExpired:
            return OperationResult.failure_result("pip install timed out")
        except Exception as e:
            return OperationResult.failure_result("Failed to install backend dependencies", e)

    def install_frontend_dependencies(self, force: bool = False) -> OperationResult:
        """
        Install frontend dependencies with npm.

        Args:
            force: If True, use npm install instead of npm ci

        Returns:
            OperationResult indicating success or failure
        """
        package_json = self.frontend_dir / 'package.json'

        if not package_json.exists():
            return OperationResult.failure_result("package.json not found")

        try:
            self.log_info("Installing frontend dependencies...")

            # Use npm ci if package-lock.json exists and not forcing
            package_lock = self.frontend_dir / 'package-lock.json'

            if package_lock.exists() and not force:
                cmd = ['npm', 'ci', '--no-audit', '--silent']
            else:
                cmd = ['npm', 'install', '--no-audit', '--silent']

            self.log_debug(f"Running: {' '.join(cmd)}")
            subprocess.run(
                cmd,
                check=True,
                cwd=str(self.frontend_dir),
                timeout=OperationTimeouts.LONG_COMMAND  # 10 minutes for large installs
            )

            self.log_success("Frontend dependencies installed")
            return OperationResult.success_result("Frontend dependencies installed")
        except subprocess.CalledProcessError as e:
            return OperationResult.failure_result(
                f"npm install failed (exit code {e.returncode})", e
            )
        except subprocess.TimeoutExpired:
            return OperationResult.failure_result("npm install timed out")
        except Exception as e:
            return OperationResult.failure_result("Failed to install frontend dependencies", e)

    def wait_for_http(self, url: str, timeout: int = 120) -> OperationResult:
        """
        Wait for HTTP endpoint to become available.

        Args:
            url: URL to check (must be valid HTTP/HTTPS URL)
            timeout: Timeout in seconds (must be positive)

        Returns:
            OperationResult indicating whether endpoint became available
        """
        # Validate timeout
        if timeout <= 0:
            return OperationResult.failure_result(
                f"Timeout must be positive (got: {timeout})"
            )

        # Validate URL format
        from urllib.parse import urlparse
        try:
            parsed = urlparse(url)
            if not parsed.scheme or not parsed.netloc:
                return OperationResult.failure_result(
                    f"Invalid URL format: '{url}' (must include scheme and host, e.g., http://localhost:8000)"
                )
            if parsed.scheme not in ('http', 'https'):
                return OperationResult.failure_result(
                    f"URL scheme must be http or https (got: {parsed.scheme})"
                )
        except Exception as e:
            return OperationResult.failure_result(f"Invalid URL: {e}")

        try:
            import requests
        except ImportError:
            return OperationResult.failure_result(
                "requests package not installed (required for HTTP checks)"
            )

        start_time = time.time()
        last_error = None

        while (time.time() - start_time) < timeout:
            try:
                response = requests.get(url, timeout=OperationTimeouts.HTTP_REQUEST)
                if 200 <= response.status_code < 500:
                    elapsed = time.time() - start_time
                    return OperationResult.success_result(
                        f"Endpoint available after {elapsed:.1f}s",
                        data={'url': url, 'status_code': response.status_code}
                    )
            except requests.exceptions.Timeout as e:
                last_error = f"Connection timeout: {e}"
                self.log_debug(f"HTTP check timed out, retrying... ({last_error})")
            except requests.exceptions.ConnectionError as e:
                last_error = f"Connection refused: {e}"
                self.log_debug(f"Connection failed, retrying... ({last_error})")
            except requests.exceptions.RequestException as e:
                last_error = f"Request error: {e}"
                self.log_debug(f"Request failed, retrying... ({last_error})")

            time.sleep(OperationTimeouts.PROCESS_STARTUP_WAIT)

        return OperationResult.failure_result(
            f"Endpoint not available after {timeout}s" + (f": {last_error}" if last_error else ""),
            data={'url': url, 'last_error': last_error}
        )

    def setup_all(self, force: bool = False, skip_venv: bool = False) -> OperationResult:
        """
        Complete setup: check dependencies, create envs, install packages.

        Args:
            force: Force reinstall of dependencies
            skip_venv: Skip virtual environment creation

        Returns:
            OperationResult with setup results
        """
        results = []

        # 1. Check dependencies
        self.log_info("Checking dependencies...")
        checker = DependencyChecker()
        dep_result = checker.execute()
        results.append(('Dependencies', dep_result))

        if not dep_result.success:
            return OperationResult.failure_result(
                "Dependency check failed - cannot continue setup",
                data={'results': results}
            )

        # 2. Create .env files
        self.log_info("Creating environment files...")
        for dir_name, dir_path in [
            ('root', self.root_dir),
            ('backend', self.backend_dir),
            ('frontend', self.frontend_dir)
        ]:
            env_result = self.create_env_from_template(dir_path)
            results.append((f'{dir_name} .env', env_result))

        # 3. Set version
        version_file = self.root_dir / 'VERSION'
        if version_file.exists():
            version = version_file.read_text(encoding='utf-8').strip()
        else:
            version = 'latest'
        version_result = self.set_version_in_env(version)
        results.append(('VERSION', version_result))

        # 4. Create venv (unless skipped)
        if not skip_venv:
            self.log_info("Creating Python virtual environment...")
            venv_result = self.create_venv(force)
            results.append(('venv', venv_result))
        else:
            self.log_info("Skipping venv creation (skip_venv=True)")

        # 5. Install backend deps
        self.log_info("Installing backend dependencies...")
        backend_result = self.install_backend_dependencies(force)
        results.append(('backend deps', backend_result))

        # 6. Install frontend deps
        self.log_info("Installing frontend dependencies...")
        frontend_result = self.install_frontend_dependencies(force)
        results.append(('frontend deps', frontend_result))

        # Check for failures
        failures = [(name, r) for name, r in results if not r.success and r.status.value != 'warning']

        if failures:
            return OperationResult.failure_result(
                f"Setup completed with {len(failures)} failure(s)",
                data={'results': [(n, r.__dict__) for n, r in results], 'failures': failures}
            )
        else:
            warnings = [(name, r) for name, r in results if r.status.value == 'warning']
            if warnings:
                return OperationResult.warning_result(
                    f"Setup completed with {len(warnings)} warning(s)",
                    data={'results': [(n, r.__dict__) for n, r in results]}
                )
            else:
                return OperationResult.success_result(
                    "Setup completed successfully",
                    data={'results': [(n, r.__dict__) for n, r in results]}
                )

    def execute(self, force: bool = False, skip_venv: bool = False) -> OperationResult:
        """
        Execute complete setup.

        Args:
            force: Force reinstall of dependencies
            skip_venv: Skip virtual environment creation

        Returns:
            OperationResult with setup results
        """
        return self.setup_all(force, skip_venv)


# ============================================================================
#  DATABASE MIGRATION RUNNER
# ============================================================================

class MigrationRunner(Operation):
    """Run database migrations with Alembic"""

    def __init__(self, root_dir: Optional[Path] = None):
        super().__init__(root_dir or get_project_root())
        self.backend_dir = self.root_dir / 'backend'

    def get_python_path(self) -> str:
        """Get path to Python executable (venv if exists)."""
        return get_python_executable(self.root_dir)

    def run_migrations(self) -> OperationResult:
        """
        Run Alembic migrations to latest version.

        Returns:
            OperationResult indicating success or failure
        """
        alembic_ini = self.backend_dir / 'alembic.ini'

        if not alembic_ini.exists():
            return OperationResult.failure_result(
                "alembic.ini not found in backend directory"
            )

        try:
            python_path = self.get_python_path()

            self.log_info("Running Alembic migrations...")

            # Use python -m alembic to ensure proper module loading
            result = subprocess.run(
                [python_path, '-m', 'alembic', 'upgrade', 'head'],
                cwd=str(self.backend_dir),
                capture_output=True,
                text=True,
                timeout=OperationTimeouts.MEDIUM_COMMAND
            )

            if result.returncode == 0:
                self.log_success("Migrations completed successfully")
                return OperationResult.success_result(
                    "Migrations completed",
                    data={'output': result.stdout}
                )
            else:
                return OperationResult.failure_result(
                    f"Migration failed (exit code {result.returncode})",
                    data={'stdout': result.stdout, 'stderr': result.stderr}
                )

        except subprocess.TimeoutExpired:
            return OperationResult.failure_result("Migration timed out")
        except FileNotFoundError:
            return OperationResult.failure_result(
                "Python or Alembic not found - ensure dependencies are installed"
            )
        except Exception as e:
            return OperationResult.failure_result("Failed to run migrations", e)

    def execute(self, **kwargs) -> OperationResult:
        """
        Execute database migrations.

        Returns:
            OperationResult with migration results
        """
        return self.run_migrations()
