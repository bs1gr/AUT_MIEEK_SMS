"""
Admin routes for database management v4.1
- Health check
- Reset database
- Backup database
- Add sample data
- Shutdown server

Notes:
- Uses centralized database engine and session dependency from backend.db
- Avoids creating a separate engine to respect Settings.DATABASE_URL
- Fixes imports so module works when imported as backend.admin_routes
"""

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse, JSONResponse
import os
import shutil
import pathlib
import signal
import psutil
import threading
import time
from datetime import datetime

from sqlalchemy.orm import Session

# Robust imports when running as a package or directly
try:  # When imported as backend.admin_routes
    from backend.config import settings
    from backend.db import get_session as get_db, engine
    from backend.models import Student, Course, Grade, Base
except ModuleNotFoundError:  # Fallback for direct execution
    from config import settings  # type: ignore
    from db import get_session as get_db, engine  # type: ignore
    from models import (  # type: ignore
        Student,
        Course,
        Grade,
        Base,
    )

# Create router
router = APIRouter()
PROJECT_ROOT = pathlib.Path(__file__).resolve().parent.parent.parent

_server_start_time = time.time()


@router.get("/health")
async def health_check(db: Session = Depends(get_db)):
    """Check system health and database status"""
    try:
        students_count = db.query(Student).count()
        courses_count = db.query(Course).count()

        uptime = int(time.time() - _server_start_time)

        return {
            "status": "healthy",
            "database": "connected",
            "students_count": students_count,
            "courses_count": courses_count,
            "uptime": uptime,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")


@router.post("/reset-database")
async def reset_database():
    """Drop all tables and recreate them (WARNING: Deletes all data!)"""
    try:
        # Close all connections
        engine.dispose()

        # Drop all tables
        Base.metadata.drop_all(bind=engine)

        # Recreate all tables
        Base.metadata.create_all(bind=engine)

        return {"message": "Database reset successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reset database: {str(e)}")


@router.post("/backup-database")
async def backup_database():
    """Create a backup of the database (supports SQLite only)."""
    try:
        db_url = settings.DATABASE_URL
        # Only support sqlite URLs for file backup
        if not db_url.startswith("sqlite"):
            raise HTTPException(status_code=400, detail="Backup supported only for SQLite DB")

        # Extract filesystem path (sqlite:///path or sqlite:////abs/path)
        # Remove url scheme
        path_part = db_url.split("sqlite:///", 1)[-1] if "sqlite:///" in db_url else db_url.split("sqlite:", 1)[-1]
        db_path = path_part.lstrip("/") if os.name == "nt" else path_part

        if not os.path.exists(db_path):
            raise HTTPException(status_code=404, detail="Database file not found")

        # Create backups directory if it doesn't exist
        os.makedirs("backups", exist_ok=True)

        # Create backup filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_dir = pathlib.Path("backups") / f"backup_{timestamp}"
        backup_dir.mkdir(parents=True, exist_ok=True)
        backup_path = backup_dir / "student_management.db"

        # Copy database file
        shutil.copy2(db_path, backup_path)

        # Return the backup file
        return FileResponse(
            str(backup_path),
            media_type="application/x-sqlite3",
            filename=backup_path.name,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to backup database: {str(e)}")


@router.post("/sample-data")
async def add_sample_data(db: Session = Depends(get_db)):
    """Add sample data for testing"""
    try:
        # Check if data already exists
        if db.query(Student).count() > 0:
            return {"message": "Sample data already exists"}

        # Add sample students
        students = [
            Student(
                first_name="John",
                last_name="Doe",
                email="john.doe@example.com",
                student_id="S001",
                enrollment_date=datetime.now().date(),
            ),
            Student(
                first_name="Jane",
                last_name="Smith",
                email="jane.smith@example.com",
                student_id="S002",
                enrollment_date=datetime.now().date(),
            ),
            Student(
                first_name="Mike",
                last_name="Johnson",
                email="mike.j@example.com",
                student_id="S003",
                enrollment_date=datetime.now().date(),
            ),
            Student(
                first_name="Emily",
                last_name="Brown",
                email="emily.b@example.com",
                student_id="S004",
                enrollment_date=datetime.now().date(),
            ),
            Student(
                first_name="Chris",
                last_name="Lee",
                email="chris.lee@example.com",
                student_id="S005",
                enrollment_date=datetime.now().date(),
            ),
        ]
        db.add_all(students)
        db.commit()

        # Add sample courses
        courses = [
            Course(course_code="MATH101", course_name="Mathematics", semester="Fall 2024", credits=3),
            Course(course_code="PHYS101", course_name="Physics", semester="Fall 2024", credits=4),
            Course(course_code="CHEM101", course_name="Chemistry", semester="Fall 2024", credits=3),
            Course(course_code="ENG101", course_name="English Literature", semester="Fall 2024", credits=3),
            Course(course_code="HIST101", course_name="History", semester="Fall 2024", credits=3),
        ]
        db.add_all(courses)
        db.commit()

        # Add sample grades
        for student in students[:3]:
            for course in courses[:3]:
                grade = Grade(
                    student_id=student.id,
                    course_id=course.id,
                    assignment_name="Sample Assignment",
                    category="Homework",
                    grade=round(70 + (hash(f"{student.id}{course.id}") % 30), 2),
                    max_grade=100.0,
                )
                db.add(grade)

        db.commit()

        return {"message": "Sample data added successfully", "students": len(students), "courses": len(courses)}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to add sample data: {str(e)}")


@router.get("/debug-processes")
async def debug_processes():
    """Debug endpoint to see what processes will be killed"""
    processes_info = {
        "frontend_on_port_5173": [],
        "vite_node_processes": [],
        "npm_shell_processes": [],
        "backend_process": {},
        "all_node_processes": [],
    }

    try:
        # Check port 5173
        for proc in psutil.process_iter(["pid", "name", "cmdline", "connections"]):
            try:
                connections = proc.connections()
                for conn in connections:
                    if hasattr(conn, "laddr") and conn.laddr.port == 5173:
                        processes_info["frontend_on_port_5173"].append(
                            {"pid": proc.pid, "name": proc.name(), "cmdline": proc.cmdline()}
                        )
            except Exception as e:
                # Log and continue
                import logging

                logging.getLogger(__name__).debug(f"Error checking frontend port 5173: {e}")

        # Check vite node processes
        for proc in psutil.process_iter(["pid", "name", "cmdline"]):
            try:
                if proc.name() in ["node.exe", "node"]:
                    cmdline_str = " ".join(proc.cmdline())
                    processes_info["all_node_processes"].append(
                        {"pid": proc.pid, "name": proc.name(), "cmdline": cmdline_str[:200]}
                    )
                    if "vite" in cmdline_str.lower():
                        processes_info["vite_node_processes"].append(
                            {"pid": proc.pid, "name": proc.name(), "cmdline": cmdline_str[:200]}
                        )
            except Exception as e:
                import logging

                logging.getLogger(__name__).debug(f"Error checking vite node processes: {e}")

        # Check shell processes
        for proc in psutil.process_iter(["pid", "name", "cmdline"]):
            try:
                if proc.name() in ["cmd.exe", "powershell.exe", "pwsh.exe"]:
                    cmdline_str = " ".join(proc.cmdline()).lower()
                    if "npm" in cmdline_str and "dev" in cmdline_str:
                        processes_info["npm_shell_processes"].append(
                            {"pid": proc.pid, "name": proc.name(), "cmdline": cmdline_str[:200]}
                        )
            except Exception as e:
                import logging

                logging.getLogger(__name__).debug(f"Error checking shell processes: {e}")

        # Backend process info
        current = psutil.Process(os.getpid())
        parent = current.parent()
        processes_info["backend_process"] = {
            "pid": current.pid,
            "name": current.name(),
            "parent_pid": parent.pid if parent else None,
            "parent_name": parent.name() if parent else None,
        }

    except Exception as e:
        processes_info["error"] = str(e)

    return processes_info


@router.post("/shutdown")
async def shutdown_server():
    """
    Intelligent shutdown that detects environment (Docker vs Native) and shuts down appropriately.

    - Docker mode: Stops Docker containers via docker-compose down
    - Native mode: Kills processes based on saved PID files
    """

    # Detect if running in Docker
    environment = _detect_environment()

    # 1. Start the appropriate shutdown process in a background thread
    if environment == "docker":
        threading.Thread(target=_docker_shutdown_routine, daemon=True).start()
    else:
        threading.Thread(target=_safe_shutdown_routine, daemon=True).start()

    # 2. Immediately return the successful response
    return JSONResponse(
        content={"message": "Server shutdown initiated", "status": "stopping", "environment": environment},
        status_code=200,
    )


def _detect_environment():
    """Detect if running in Docker container"""
    # Check for /.dockerenv file
    if os.path.exists("/.dockerenv"):
        return "docker"
    # Check cgroup for docker/containerd
    try:
        with open("/proc/1/cgroup", "r") as f:
            content = f.read()
            if "docker" in content or "containerd" in content:
                return "docker"
    except Exception as e:
        import logging

        logging.getLogger(__name__).debug(f"Could not read /proc/1/cgroup: {e}")
        pass
    # Check for DOCKER_CONTAINER env var (can be set in Dockerfile)
    if os.getenv("DOCKER_CONTAINER") == "true":
        return "docker"
    return "native"


def _docker_shutdown_routine():
    """
    Shutdown routine for Docker environment.
    Executes docker-compose down to stop all containers.
    """
    time.sleep(0.2)  # Allow response to be sent

    print("\n--- Starting Docker Shutdown Routine ---")
    print("[Docker] Environment detected - stopping containers...")

    try:
        # Try to find docker-compose command
        compose_cmd = None
        for cmd in ["docker-compose", "docker compose"]:
            try:
                result = os.system(f"{cmd} version > /dev/null 2>&1")
                if result == 0:
                    compose_cmd = cmd
                    break
            except Exception as e:
                import logging

                logging.getLogger(__name__).debug(f"Error finding docker-compose command: {e}")
                pass
        if not compose_cmd:
            print("[Docker] Warning: docker-compose not found, cannot stop containers gracefully")
            print("[Docker] Container will stop when process exits")
            time.sleep(1)
            os.kill(os.getpid(), signal.SIGTERM)
            return
        # Execute docker-compose down
        print(f"[Docker] Executing: {compose_cmd} down")
        result = os.system(f"cd {PROJECT_ROOT} && {compose_cmd} down")
        if result == 0:
            print("[Docker] Successfully stopped containers")
        else:
            print(f"[Docker] docker-compose down returned exit code: {result}")
    except Exception as e:
        print(f"[Docker] Error during shutdown: {e}")
    finally:
        # Ensure process exits
        time.sleep(0.5)
        os.kill(os.getpid(), signal.SIGTERM)


def _kill_process_by_pid_file(pid_file_path: pathlib.Path, process_name: str):
    """Kills the process (and its children) found in the given PID file."""
    if not pid_file_path.exists():
        print(f"[{process_name}] PID file not found: {pid_file_path}")
        return

    try:
        pid = int(pid_file_path.read_text().strip())
        print(f"[{process_name}] Found PID from file: {pid}")
        try:
            proc = psutil.Process(pid)
            print(f"[{process_name}] Killing process tree: {proc.name()} ({pid})")
            # Use psutil to kill the children first, then the parent
            for child in proc.children(recursive=True):
                try:
                    child.kill()
                    print(f"[{process_name}]   Killed child: {child.pid} - {child.name()}")
                except Exception as e:
                    import logging

                    logging.getLogger(__name__).debug(f"Error killing child process {child.pid}: {e}")
                    pass
            proc.kill()
            print(f"[{process_name}] Successfully killed main process.")
        except psutil.NoSuchProcess:
            print(f"[{process_name}] Process {pid} no longer exists.")
        except Exception as e:
            print(f"[{process_name}] Could not kill process {pid}: {e}")
    except Exception as e:
        print(f"[{process_name}] Error reading or processing PID file: {e}")
    finally:
        # Always try to delete the file
        try:
            pid_file_path.unlink()
        except Exception as e:
            import logging

            logging.getLogger(__name__).debug(f"Error deleting PID file: {e}")
            pass


def _safe_shutdown_routine():
    """
    The actual shutdown logic for native mode, run in a non-blocking thread.
    """
    # Small delay to ensure the HTTP response is sent
    time.sleep(0.2)

    print("\n--- Starting Safe Shutdown Routine (Native Mode) ---")

    # 1. Kill Frontend Process (using PID file)
    _kill_process_by_pid_file(PROJECT_ROOT / ".frontend.pid", "Frontend")

    # 2. Kill Backend Process (the current Uvicorn process)
    try:
        current_pid = os.getpid()
        print(f"\n[Backend] Initiating self-kill: PID {current_pid}")

        # Kill backend from PID file (cleanup, don't use to kill)
        backend_pid_file = PROJECT_ROOT / ".backend.pid"
        if backend_pid_file.exists():
            backend_pid_file.unlink()

        # Use SIGTERM to cleanly shut down Uvicorn
        os.kill(current_pid, signal.SIGTERM)

    except Exception as e:
        print(f"[Backend] Error initiating self-kill: {e}")
