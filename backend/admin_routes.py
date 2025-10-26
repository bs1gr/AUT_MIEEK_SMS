"""
Admin routes for database management v4.00
- Health check
- Reset database
- Backup database
- Add sample data
- Shutdown server
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, JSONResponse
import os
import shutil
import pathlib
import signal
import psutil
import threading
import time
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base

# Import from models
from models import (
    Student, Course, Grade, Attendance, DailyPerformance,
    init_db, get_session
)

# Create router
router = APIRouter()
PROJECT_ROOT = pathlib.Path(__file__).parent.parent.parent

# Initialize engine
engine = init_db()

# Create Base for metadata operations
Base = declarative_base()

_server_start_time = time.time()

@router.get("/health")
async def health_check():
    """Check system health and database status"""
    db = None
    try:
        db = get_session(engine)
        students_count = db.query(Student).count()
        courses_count = db.query(Course).count()

        uptime = int(time.time() - _server_start_time)

        return {
            "status": "healthy",
            "database": "connected",
            "students_count": students_count,
            "courses_count": courses_count,
            "uptime": uptime
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")
    finally:
        if db:
            db.close()

@router.post("/reset-database")
async def reset_database():
    """Drop all tables and recreate them (WARNING: Deletes all data!)"""
    try:
        # Import Base from models to access metadata
        from models import Base
        
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
    """Create a backup of the database"""
    try:
        db_path = "student_management.db"
        
        if not os.path.exists(db_path):
            raise HTTPException(status_code=404, detail="Database file not found")
        
        # Create backups directory if it doesn't exist
        os.makedirs("backups", exist_ok=True)
        
        # Create backup filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = f"backups/backup_{timestamp}.db"
        
        # Copy database file
        shutil.copy2(db_path, backup_path)
        
        # Return the backup file
        return FileResponse(
            backup_path,
            media_type="application/x-sqlite3",
            filename=f"backup_{timestamp}.db"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to backup database: {str(e)}")

@router.post("/sample-data")
async def add_sample_data():
    """Add sample data for testing"""
    db = None
    try:
        db = get_session(engine)
        
        # Check if data already exists
        if db.query(Student).count() > 0:
            return {"message": "Sample data already exists"}
        
        # Add sample students
        students = [
            Student(first_name="John", last_name="Doe", email="john.doe@example.com", 
                   student_id="S001", enrollment_date=datetime.now().date()),
            Student(first_name="Jane", last_name="Smith", email="jane.smith@example.com", 
                   student_id="S002", enrollment_date=datetime.now().date()),
            Student(first_name="Mike", last_name="Johnson", email="mike.j@example.com", 
                   student_id="S003", enrollment_date=datetime.now().date()),
            Student(first_name="Emily", last_name="Brown", email="emily.b@example.com", 
                   student_id="S004", enrollment_date=datetime.now().date()),
            Student(first_name="Chris", last_name="Lee", email="chris.lee@example.com", 
                   student_id="S005", enrollment_date=datetime.now().date()),
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
                    max_grade=100.0
                )
                db.add(grade)
        
        db.commit()
        
        return {
            "message": "Sample data added successfully",
            "students": len(students),
            "courses": len(courses)
        }
    except Exception as e:
        if db:
            db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to add sample data: {str(e)}")
    finally:
        if db:
            db.close()

@router.get("/debug-processes")
async def debug_processes():
    """Debug endpoint to see what processes will be killed"""
    processes_info = {
        "frontend_on_port_5173": [],
        "vite_node_processes": [],
        "npm_shell_processes": [],
        "backend_process": {},
        "all_node_processes": []
    }

    try:
        # Check port 5173
        for proc in psutil.process_iter(['pid', 'name', 'cmdline', 'connections']):
            try:
                connections = proc.connections()
                for conn in connections:
                    if hasattr(conn, 'laddr') and conn.laddr.port == 5173:
                        processes_info["frontend_on_port_5173"].append({
                            "pid": proc.pid,
                            "name": proc.name(),
                            "cmdline": proc.cmdline()
                        })
            except:
                pass

        # Check vite node processes
        for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
            try:
                if proc.name() in ['node.exe', 'node']:
                    cmdline_str = ' '.join(proc.cmdline())
                    processes_info["all_node_processes"].append({
                        "pid": proc.pid,
                        "name": proc.name(),
                        "cmdline": cmdline_str[:200]
                    })
                    if 'vite' in cmdline_str.lower():
                        processes_info["vite_node_processes"].append({
                            "pid": proc.pid,
                            "name": proc.name(),
                            "cmdline": cmdline_str[:200]
                        })
            except:
                pass

        # Check shell processes
        for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
            try:
                if proc.name() in ['cmd.exe', 'powershell.exe', 'pwsh.exe']:
                    cmdline_str = ' '.join(proc.cmdline()).lower()
                    if 'npm' in cmdline_str and 'dev' in cmdline_str:
                        processes_info["npm_shell_processes"].append({
                            "pid": proc.pid,
                            "name": proc.name(),
                            "cmdline": cmdline_str[:200]
                        })
            except:
                pass

        # Backend process info
        current = psutil.Process(os.getpid())
        parent = current.parent()
        processes_info["backend_process"] = {
            "pid": current.pid,
            "name": current.name(),
            "parent_pid": parent.pid if parent else None,
            "parent_name": parent.name() if parent else None
        }

    except Exception as e:
        processes_info["error"] = str(e)

    return processes_info

@router.post("/shutdown")
async def shutdown_server():
    """Fast shutdown of processes based on saved PID files."""
    
    # 1. Start the shutdown process in a background thread
    threading.Thread(target=_safe_shutdown_routine, daemon=True).start()

    # 2. Immediately return the successful response
    return JSONResponse(
        content={"message": "Server shutdown initiated", "status": "stopping"},
        status_code=200
    )


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
                except Exception:
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
        except:
            pass


def _safe_shutdown_routine():
    """
    The actual shutdown logic, run in a non-blocking thread.
    """
    # Small delay to ensure the HTTP response is sent
    time.sleep(0.2) 

    print("\n--- Starting Safe Shutdown Routine ---")

    # 1. Kill Frontend Process (using PID file)
    _kill_process_by_pid_file(PROJECT_ROOT / '.frontend.pid', "Frontend")
    
    # 2. Kill Backend Process (the current Uvicorn process)
    try:
        current_pid = os.getpid()
        print(f"\n[Backend] Initiating self-kill: PID {current_pid}")
        
        # Kill backend from PID file (cleanup, don't use to kill)
        backend_pid_file = PROJECT_ROOT / '.backend.pid'
        if backend_pid_file.exists():
            backend_pid_file.unlink()
        
        # Use SIGTERM to cleanly shut down Uvicorn
        os.kill(current_pid, signal.SIGTERM)
        
    except Exception as e:
        print(f"[Backend] Error initiating self-kill: {e}")