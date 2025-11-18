#!/usr/bin/env python3
"""
OnOff.py - Universal cross-platform container toggle script
Checks if Docker containers are running and starts/stops accordingly
Works on Windows, macOS, Linux, and any environment with Python 3.6+
"""

import subprocess
import sys
import os


class Colors:
    """ANSI color codes for terminal output"""
    CYAN = '\033[0;36m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[0;33m'
    RED = '\033[0;31m'
    NC = '\033[0m'  # No Color

    @staticmethod
    def disable():
        """Disable colors on Windows if not supported"""
        if os.name == 'nt':
            # Enable ANSI colors on Windows 10+
            try:
                import ctypes
                kernel32 = ctypes.windll.kernel32
                kernel32.SetConsoleMode(kernel32.GetStdHandle(-11), 7)
            except:
                # Disable colors if not supported
                Colors.CYAN = Colors.GREEN = Colors.YELLOW = Colors.RED = Colors.NC = ''


def info(msg):
    """Print info message"""
    print(f"{Colors.CYAN}{msg}{Colors.NC}")


def success(msg):
    """Print success message"""
    print(f"{Colors.GREEN}{msg}{Colors.NC}")


def error(msg):
    """Print error message"""
    print(f"{Colors.RED}{msg}{Colors.NC}")


def warning(msg):
    """Print warning message"""
    print(f"{Colors.YELLOW}{msg}{Colors.NC}")


def run_command(cmd, check=False):
    """Run a shell command and return success status and output"""
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='replace'
        )
        if check and result.returncode != 0:
            return False, result.stdout, result.stderr
        return result.returncode == 0, result.stdout.strip(), result.stderr.strip()
    except Exception as e:
        return False, "", str(e)


def check_docker():
    """Check if Docker is installed and running"""
    success_status, _, _ = run_command("docker info")
    return success_status


def check_containers_running():
    """Check if containers are currently running"""
    success_status, stdout, _ = run_command('docker-compose ps --services --filter "status=running"')
    return success_status and bool(stdout.strip())


def start_containers():
    """Start Docker containers"""
    info("Starting containers...")
    success_status, stdout, stderr = run_command("docker-compose up -d")

    if success_status:
        print()
        success("[OK] Containers started successfully!")
        print()
        info("Access the application at:")
        print(f"{Colors.YELLOW}  Frontend: http://localhost:5173{Colors.NC}")
        print(f"{Colors.YELLOW}  Backend:  http://localhost:8000{Colors.NC}")
        return True
    else:
        error("[X] Failed to start containers")
        if stderr:
            print(f"Error: {stderr}")
        return False


def stop_containers():
    """Stop Docker containers"""
    info("Stopping containers...")
    success_status, stdout, stderr = run_command("docker-compose down")

    if success_status:
        print()
        success("[OK] Containers stopped successfully!")
        return True
    else:
        error("[X] Failed to stop containers")
        if stderr:
            print(f"Error: {stderr}")
        return False


def get_user_input(prompt, default_yes=False):
    """Get yes/no input from user"""
    try:
        response = input(prompt).strip().lower()
        if not response:
            return default_yes
        return response in ['y', 'yes']
    except (KeyboardInterrupt, EOFError):
        print()
        info("\nOperation cancelled by user.")
        return False


def main():
    """Main function"""
    # Enable colors on Windows
    Colors.disable()

    print()
    print(f"{Colors.CYAN}={'=' * 59}{Colors.NC}")
    print(f"{Colors.CYAN}  Student Management System - Container Toggle (OnOff)    {Colors.NC}")
    print(f"{Colors.CYAN}={'=' * 59}{Colors.NC}")
    print()

    # Check Docker availability
    info("Checking Docker availability...")
    if not check_docker():
        error("[X] Docker is not running or not installed!")
        warning("Please start Docker Desktop and try again.")
        sys.exit(1)

    success("[OK] Docker is running")
    print()

    # Check container status
    info("Checking container status...")

    if check_containers_running():
        warning("[!] Containers are currently RUNNING")
        print()

        if get_user_input("Do you want to STOP the containers? (y/N): ", default_yes=False):
            if not stop_containers():
                sys.exit(1)
        else:
            info("Operation cancelled. Containers remain running.")
    else:
        success("[OK] Containers are currently STOPPED")
        print()

        if get_user_input("Do you want to START the containers? (Y/n): ", default_yes=True):
            if not start_containers():
                sys.exit(1)
        else:
            info("Operation cancelled. Containers remain stopped.")

    print()
    print(f"{Colors.CYAN}={'=' * 59}{Colors.NC}")
    print()


if __name__ == "__main__":
    main()
