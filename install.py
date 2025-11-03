#!/usr/bin/env python3
"""
Student Management System - Universal Installer
No execution policy issues, no PowerShell complexity.
Just run: python install.py
"""

import os
import sys
import subprocess
import platform
import shutil
import shlex
from pathlib import Path

# Colors for terminal output
if platform.system() == "Windows":
    os.system("")  # Enable ANSI colors on Windows 10+


class Colors:
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    BLUE = "\033[94m"
    CYAN = "\033[96m"
    END = "\033[0m"
    BOLD = "\033[1m"


def print_header(text):
    print(f"\n{Colors.CYAN}{Colors.BOLD}{'=' * 60}")
    print(f"  {text}")
    print(f"{'=' * 60}{Colors.END}\n")


def print_success(text):
    print(f"{Colors.GREEN}✓ {text}{Colors.END}")


def print_error(text):
    print(f"{Colors.RED}✗ {text}{Colors.END}")


def print_warning(text):
    print(f"{Colors.YELLOW}⚠ {text}{Colors.END}")


def print_info(text):
    print(f"{Colors.BLUE}ℹ {text}{Colors.END}")


def run_command(cmd, check=True, capture=False):
    """Run a command and return success status.

    This helper accepts either a list of argv or a string. Strings are
    split using shlex.split() in a platform-appropriate way and the
    resulting argv is executed with shell=False to avoid shell
    injection and platform-dependent quoting problems.
    """
    try:
        # Accept both list (argv) and string commands
        if isinstance(cmd, str):
            # On Windows use posix=False so shlex uses Windows-style splitting
            posix = platform.system() != "Windows"
            args = shlex.split(cmd, posix=posix)
        else:
            args = list(cmd)

        if capture:
            result = subprocess.run(args, shell=False, check=check, capture_output=True, text=True)
            return result.returncode == 0, result.stdout.strip()
        else:
            result = subprocess.run(args, shell=False, check=check)
            return result.returncode == 0, None
    except subprocess.CalledProcessError:
        return False, None
    except FileNotFoundError:
        return False, None


def check_command(cmd):
    """Check if a command is available"""
    success, _ = run_command(f"{cmd} --version", check=False, capture=True)
    return success


def check_docker():
    """Check if Docker is available and running"""
    if not check_command("docker"):
        return False, "Docker not installed"

    # Check if daemon is running
    success, _ = run_command("docker info", check=False, capture=True)
    if not success:
        return False, "Docker installed but not running"

    return True, "Docker available and running"


def check_python():
    """Check Python version"""
    version = sys.version_info
    if version.major == 3 and version.minor >= 11:
        return True, f"Python {version.major}.{version.minor}.{version.micro}"
    elif version.major == 3 and version.minor >= 8:
        return True, f"Python {version.major}.{version.minor}.{version.micro} (3.11+ recommended)"
    else:
        return False, f"Python {version.major}.{version.minor} too old (need 3.11+)"


def check_node():
    """Check if Node.js is available"""
    if not check_command("node"):
        return False, "Node.js not installed"

    success, version = run_command("node --version", capture=True)
    if success:
        return True, f"Node.js {version}"
    return False, "Node.js not found"


def setup_docker_mode():
    """Setup and start in Docker mode"""
    print_header("Setting Up Docker Mode")

    # Read version from VERSION file
    root = Path(__file__).parent
    version_file = root / "VERSION"
    app_version = "latest"
    if version_file.exists():
        try:
            app_version = version_file.read_text().strip()
            print_info(f"Building version: {app_version}")
        except Exception:
            pass

    # Check if .env exists, create from .env.example
    env_file = root / ".env"
    env_example = root / ".env.example"

    if not env_file.exists() and env_example.exists():
        print_info("Creating .env from template...")
        shutil.copy(env_example, env_file)
        print_success("Environment file created")

    # Update or create .env with VERSION
    env_lines = []
    version_set = False
    if env_file.exists():
        with open(env_file, "r") as f:
            for line in f:
                if line.startswith("VERSION="):
                    env_lines.append(f"VERSION={app_version}\n")
                    version_set = True
                else:
                    env_lines.append(line)
    if not version_set:
        env_lines.append(f"VERSION={app_version}\n")

    with open(env_file, "w") as f:
        f.writelines(env_lines)

    # Create backend/.env if needed
    backend_env = root / "backend" / ".env"
    backend_env_example = root / "backend" / ".env.example"
    if not backend_env.exists() and backend_env_example.exists():
        shutil.copy(backend_env_example, backend_env)
        print_success("Backend environment file created")

    # Create frontend/.env if needed
    frontend_env = root / "frontend" / ".env"
    frontend_env_example = root / "frontend" / ".env.example"
    if not frontend_env.exists() and frontend_env_example.exists():
        shutil.copy(frontend_env_example, frontend_env)
        print_success("Frontend environment file created")

    print_info("Building and starting Docker containers...")
    print_info("This may take a few minutes on first run...")

    # Set VERSION environment variable for docker-compose
    os.environ["VERSION"] = app_version

    success, _ = run_command("docker compose up -d --build", check=False)

    if success:
        print_success("Docker containers started successfully!")
        print_info("\n🌐 Application URLs:")
        print("   Frontend:      http://localhost:8080")
        print("   API Docs:      http://localhost:8080/docs")
        print("   Control Panel: http://localhost:8080/control")
        return True
    else:
        print_error("Failed to start Docker containers")
        return False


def setup_native_mode():
    """Setup and start in Native mode (Python + Node.js)"""
    print_header("Setting Up Native Mode")

    root = Path(__file__).parent
    backend_dir = root / "backend"
    frontend_dir = root / "frontend"

    # Setup backend
    print_info("Setting up Python backend...")
    venv_dir = backend_dir / "venv"

    if not venv_dir.exists():
        print_info("Creating Python virtual environment...")
        success, _ = run_command(f"python -m venv {venv_dir}", check=False)
        if not success:
            print_error("Failed to create virtual environment")
            return False
        print_success("Virtual environment created")

    # Install Python dependencies
    print_info("Installing Python dependencies...")
    if platform.system() == "Windows":
        pip_cmd = str(venv_dir / "Scripts" / "pip")
        python_cmd = str(venv_dir / "Scripts" / "python")
    else:
        pip_cmd = str(venv_dir / "bin" / "pip")
        python_cmd = str(venv_dir / "bin" / "python")

    success, _ = run_command(f"{pip_cmd} install -r {backend_dir / 'requirements.txt'}", check=False)
    if not success:
        print_error("Failed to install Python dependencies")
        return False
    print_success("Python dependencies installed")

    # Create backend .env
    backend_env = backend_dir / ".env"
    backend_env_example = backend_dir / ".env.example"
    if not backend_env.exists() and backend_env_example.exists():
        shutil.copy(backend_env_example, backend_env)
        print_success("Backend environment file created")

    # Run database migrations
    print_info("Running database migrations...")
    os.chdir(backend_dir)
    success, _ = run_command(f"{python_cmd} -m alembic upgrade head", check=False)
    os.chdir(root)
    if success:
        print_success("Database migrations completed")
    else:
        print_warning("Database migrations had issues (may be okay if already migrated)")

    # Setup frontend
    print_info("Setting up Node.js frontend...")
    node_modules = frontend_dir / "node_modules"

    if not node_modules.exists():
        print_info("Installing Node.js dependencies...")
        os.chdir(frontend_dir)
        success, _ = run_command("npm install", check=False)
        os.chdir(root)
        if not success:
            print_error("Failed to install Node.js dependencies")
            return False
        print_success("Node.js dependencies installed")
    else:
        print_success("Node.js dependencies already installed")

    # Create frontend .env
    frontend_env = frontend_dir / ".env"
    frontend_env_example = frontend_dir / ".env.example"
    if not frontend_env.exists() and frontend_env_example.exists():
        shutil.copy(frontend_env_example, frontend_env)
        print_success("Frontend environment file created")

    print_success("\n✓ Setup complete!")
    print_info("\nTo start the application:")
    print(f"   Backend:  cd backend && {python_cmd} -m uvicorn backend.main:app --reload")
    print("   Frontend: cd frontend && npm run dev")
    print_info("\n🌐 Application URLs:")
    print("   Frontend:      http://localhost:5173")
    print("   API Docs:      http://localhost:8000/docs")
    print("   Control Panel: http://localhost:8000/control")

    return True


def main():
    """Main installer logic"""
    print_header("Student Management System - Installer")
    print("This installer will set up everything automatically.\n")

    # Check prerequisites
    print_header("Checking Prerequisites")

    docker_ok, docker_msg = check_docker()
    python_ok, python_msg = check_python()
    node_ok, node_msg = check_node()

    print("Docker: ", end="")
    if docker_ok:
        print_success(docker_msg)
    else:
        print_warning(docker_msg)

    print("Python: ", end="")
    if python_ok:
        print_success(python_msg)
    else:
        print_error(python_msg)

    print("Node.js: ", end="")
    if node_ok:
        print_success(node_msg)
    else:
        print_warning(node_msg)

    # Decide which mode to use
    print()
    if docker_ok:
        print_info("Docker is available - this is the recommended mode")
        response = input(f"{Colors.CYAN}Use Docker mode? [Y/n]: {Colors.END}").strip().lower()

        if response in ["", "y", "yes"]:
            success = setup_docker_mode()
            if success:
                print(f"\n{Colors.GREEN}{Colors.BOLD}🎉 Installation successful!{Colors.END}")
                print(f"{Colors.CYAN}Open your browser to: http://localhost:8080{Colors.END}\n")
                return 0
            else:
                print_error("Docker setup failed. Try native mode instead.")
                if not python_ok or not node_ok:
                    print_error("Cannot use native mode - Python 3.11+ and Node.js required")
                    print_info("\nInstall Docker Desktop: https://www.docker.com/products/docker-desktop/")
                    return 1

    if python_ok and node_ok:
        print_info("Setting up in Native mode (Python + Node.js)")
        success = setup_native_mode()
        if success:
            print(f"\n{Colors.GREEN}{Colors.BOLD}🎉 Setup successful!{Colors.END}")
            print(f"{Colors.YELLOW}Remember to start both backend and frontend{Colors.END}\n")
            return 0
        else:
            print_error("Native mode setup failed")
            return 1
    else:
        print_error("\nCannot proceed - no valid setup mode available")
        print_info("\nYou need either:")
        print("  • Docker Desktop (easiest): https://www.docker.com/products/docker-desktop/")
        print("  • OR both Python 3.11+ and Node.js 18+")
        return 1


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print(f"\n\n{Colors.YELLOW}Installation cancelled by user{Colors.END}")
        sys.exit(1)
    except Exception as e:
        print(f"\n{Colors.RED}Unexpected error: {e}{Colors.END}")
        sys.exit(1)
