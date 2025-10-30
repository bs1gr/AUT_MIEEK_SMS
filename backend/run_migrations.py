"""
Database Migration Runner
Applies Alembic migrations programmatically for automated startup workflows.
"""

import sys
import subprocess
from pathlib import Path

def run_migrations(verbose: bool = False) -> bool:
    """
    Run Alembic migrations to upgrade database to latest version.
    
    Args:
        verbose: If True, print detailed migration output
        
    Returns:
        bool: True if migrations succeeded, False otherwise
    """
    try:
        backend_dir = Path(__file__).parent
        
        if verbose:
            print("=" * 60)
            print("DATABASE MIGRATION CHECK")
            print("=" * 60)
            print(f"Backend directory: {backend_dir}")
            print()
        
        # Run alembic upgrade head
        result = subprocess.run(
            [sys.executable, "-m", "alembic", "upgrade", "head"],
            cwd=backend_dir,
            capture_output=True,
            text=True,
            check=False
        )
        
        if verbose or result.returncode != 0:
            print("Migration output:")
            if result.stdout:
                print(result.stdout)
            if result.stderr:
                print(result.stderr, file=sys.stderr)
        
        if result.returncode == 0:
            if verbose:
                print("\nOK: Database migrations applied successfully")
                print("=" * 60)
            return True
        else:
            print(f"\nERROR: Migration failed with exit code {result.returncode}", file=sys.stderr)
            print("=" * 60, file=sys.stderr)
            return False
            
    except Exception as e:
        print(f"ERROR: Migration error: {str(e)}", file=sys.stderr)
        return False


def check_migration_status(verbose: bool = False) -> str:
    """
    Check current migration version.
    
    Args:
        verbose: If True, print status information
        
    Returns:
        str: Current migration version or empty string on error
    """
    try:
        backend_dir = Path(__file__).parent
        
        result = subprocess.run(
            [sys.executable, "-m", "alembic", "current"],
            cwd=backend_dir,
            capture_output=True,
            text=True,
            check=False
        )
        
        if result.returncode == 0:
            # Extract version from output (format: "revision_id (head)")
            for line in result.stdout.splitlines():
                line = line.strip()
                if line and not line.startswith("INFO"):
                    if verbose:
                        print(f"Current migration: {line}")
                    return line
        
        return ""
        
    except Exception as e:
        if verbose:
            print(f"Could not check migration status: {str(e)}", file=sys.stderr)
        return ""


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Run database migrations")
    parser.add_argument("-v", "--verbose", action="store_true", help="Verbose output")
    parser.add_argument("--check", action="store_true", help="Check migration status only")
    args = parser.parse_args()
    
    if args.check:
        version = check_migration_status(verbose=True)
        sys.exit(0 if version else 1)
    else:
        success = run_migrations(verbose=args.verbose)
        sys.exit(0 if success else 1)
