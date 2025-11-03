"""
Server lifecycle management for backend and process control.

This module provides:
- Backend server start/stop/restart operations
- Process management and PID tracking
- Port conflict detection and resolution
- Log file management
"""

from .base import Operation, OperationResult, get_project_root, get_python_executable, OperationTimeouts
from .diagnostics import SystemStatusChecker
from pathlib import Path
from typing import Optional, List, Any
import signal
import time
import sys
import subprocess


# Windows-specific imports (psutil optional)
psutil: Any = None
try:
    import psutil as _psutil
    psutil = _psutil
except ImportError:
    # Keep psutil as None when not available
    pass


# ============================================================================
#  BACKEND SERVER OPERATIONS
# ============================================================================


class BackendServer(Operation):
    """Backend server lifecycle management"""

    def __init__(self, root_dir: Optional[Path] = None):
        super().__init__(root_dir or get_project_root())
        self.backend_dir = self.root_dir / "backend"
        self.pid_file = self.backend_dir / ".server.pid"

    def get_python_path(self) -> str:
        """Get path to Python executable (venv if exists)."""
        return get_python_executable(self.root_dir)

    def is_running(self) -> bool:
        """
        Check if backend server is running.

        Returns:
            True if server is running on port 8000
        """
        checker = SystemStatusChecker(self.root_dir)
        return checker.check_port_in_use(8000)

    def get_pid(self) -> Optional[int]:
        """
        Get PID of running backend server.

        Returns:
            PID if server is running, None otherwise
        """
        # First try PID file
        if self.pid_file.exists():
            try:
                pid = int(self.pid_file.read_text().strip())
                # Verify process is still running
                if psutil and psutil.pid_exists(pid):
                    return pid
                else:
                    # Stale PID file, remove it
                    self.pid_file.unlink()
            except (ValueError, OSError):
                pass

        # Fall back to port checking
        checker = SystemStatusChecker(self.root_dir)
        proc_info = checker.get_process_on_port(8000)
        if proc_info:
            return proc_info.pid

        return None

    def save_pid(self, pid: int) -> None:
        """
        Save PID to file atomically to prevent corruption.

        Uses atomic write-then-rename to ensure PID file is never partially written.

        Args:
            pid: Process ID to save
        """
        try:
            # Write to temporary file first
            temp_file = self.pid_file.with_suffix(".tmp")
            temp_file.write_text(str(pid), encoding="utf-8")

            # Atomic rename (POSIX guarantee, Windows best-effort)
            # On Windows, if target exists, replace() will overwrite it atomically
            temp_file.replace(self.pid_file)

            self.log_debug(f"Saved PID {pid} to {self.pid_file}")
        except Exception as e:
            self.log_warning(f"Failed to save PID: {e}")

    def start(
        self, host: str = "127.0.0.1", port: int = 8000, reload: bool = False, background: bool = True
    ) -> OperationResult:
        """
        Start backend server.

        Args:
            host: Host to bind to
            port: Port to bind to
            reload: Enable auto-reload for development
            background: Run in background (Windows: CREATE_NEW_PROCESS_GROUP)

        Returns:
            OperationResult with process information
        """
        # Check if already running
        if self.is_running():
            pid = self.get_pid()
            return OperationResult.warning_result(
                f"Backend already running (PID: {pid})", data={"pid": pid, "port": port}
            )

        try:
            python_path = self.get_python_path()

            # Build uvicorn command
            cmd = [python_path, "-m", "uvicorn", "backend.main:app", "--host", host, "--port", str(port)]

            if reload:
                cmd.append("--reload")

            self.log_info(f"Starting backend server on {host}:{port}")
            self.log_debug(f"Command: {' '.join(cmd)}")

            # Start process
            if background:
                # Windows: CREATE_NEW_PROCESS_GROUP to detach
                # Unix: use Popen with different session
                if sys.platform == "win32":
                    # Windows: CREATE_NEW_PROCESS_GROUP = 0x00000200
                    process = subprocess.Popen(
                        cmd,
                        cwd=str(self.root_dir),
                        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP,
                        stdout=subprocess.PIPE,
                        stderr=subprocess.PIPE,
                    )
                else:
                    process = subprocess.Popen(
                        cmd,
                        cwd=str(self.root_dir),
                        start_new_session=True,
                        stdout=subprocess.PIPE,
                        stderr=subprocess.PIPE,
                    )

                # Save PID
                self.save_pid(process.pid)

                # Wait a moment to check if it started successfully
                time.sleep(OperationTimeouts.PROCESS_STARTUP_WAIT)

                if self.is_running():
                    self.log_success(f"Backend started (PID: {process.pid})")
                    return OperationResult.success_result(
                        f"Backend started on {host}:{port}",
                        data={"pid": process.pid, "host": host, "port": port, "url": f"http://{host}:{port}"},
                    )
                else:
                    return OperationResult.failure_result(
                        "Backend failed to start (process died)", data={"pid": process.pid}
                    )
            else:
                # Foreground mode (blocking)
                subprocess.run(cmd, cwd=str(self.root_dir))
                return OperationResult.success_result("Backend stopped")

        except FileNotFoundError:
            return OperationResult.failure_result("Python or uvicorn not found - ensure dependencies are installed")
        except Exception as e:
            return OperationResult.failure_result("Failed to start backend", e)

    def stop(self, pid: Optional[int] = None, force: bool = False) -> OperationResult:
        """
        Stop backend server.

        Args:
            pid: Specific PID to stop (if None, auto-detect)
            force: Force kill if graceful shutdown fails

        Returns:
            OperationResult indicating success or failure
        """
        if not psutil:
            return OperationResult.failure_result("psutil not installed - cannot stop server")

        # Auto-detect PID if not provided
        if pid is None:
            pid = self.get_pid()

        if pid is None:
            return OperationResult.warning_result("Backend is not running")

        try:
            # Get process
            try:
                process = psutil.Process(pid)
            except psutil.NoSuchProcess:
                # Clean up stale PID file
                if self.pid_file.exists():
                    self.pid_file.unlink()
                return OperationResult.warning_result(f"Process {pid} not found (stale PID)")

            self.log_info(f"Stopping backend server (PID: {pid})")

            # Try graceful shutdown first
            if sys.platform == "win32":
                # Windows: try CTRL_C_EVENT first
                try:
                    process.send_signal(signal.CTRL_C_EVENT)
                    # Wait for graceful shutdown
                    process.wait(timeout=OperationTimeouts.PROCESS_SHUTDOWN_WAIT)
                    self.log_success("Backend stopped gracefully")
                except (psutil.TimeoutExpired, AttributeError):
                    if force:
                        self.log_warning("Graceful shutdown timed out, force killing")
                        process.kill()
                    else:
                        return OperationResult.failure_result("Graceful shutdown timed out (use force=True to kill)")
            else:
                # Unix: SIGTERM
                process.terminate()
                try:
                    process.wait(timeout=OperationTimeouts.PROCESS_SHUTDOWN_WAIT)
                    self.log_success("Backend stopped gracefully")
                except psutil.TimeoutExpired:
                    if force:
                        self.log_warning("Graceful shutdown timed out, force killing")
                        process.kill()
                    else:
                        return OperationResult.failure_result("Graceful shutdown timed out (use force=True to kill)")

            # Clean up PID file
            if self.pid_file.exists():
                self.pid_file.unlink()

            return OperationResult.success_result(f"Backend stopped (PID: {pid})")

        except psutil.AccessDenied:
            return OperationResult.failure_result(f"Access denied - cannot stop process {pid}")
        except Exception as e:
            return OperationResult.failure_result("Failed to stop backend", e)

    def restart(self, host: str = "127.0.0.1", port: int = 8000, reload: bool = False) -> OperationResult:
        """
        Restart backend server.

        Args:
            host: Host to bind to
            port: Port to bind to
            reload: Enable auto-reload

        Returns:
            OperationResult with restart status
        """
        self.log_info("Restarting backend server...")

        # Stop if running
        if self.is_running():
            stop_result = self.stop(force=True)
            if not stop_result.success:
                return OperationResult.failure_result(
                    "Failed to stop server for restart", data={"stop_result": stop_result.__dict__}
                )
            # Wait a moment
            time.sleep(1)

        # Start
        return self.start(host=host, port=port, reload=reload)

    def get_logs(self, lines: int = 100) -> List[str]:
        """
        Get recent backend logs.

        Args:
            lines: Number of recent lines to retrieve

        Returns:
            List of log lines
        """
        log_file = self.backend_dir / "logs" / "structured.json"

        if not log_file.exists():
            return []

        try:
            with open(log_file, "r", encoding="utf-8") as f:
                all_lines = f.readlines()
                return all_lines[-lines:]
        except Exception as e:
            self.log_error(f"Failed to read logs: {e}")
            return []

    def execute(self, action: str = "start", **kwargs) -> OperationResult:
        """
        Execute server operation.

        Args:
            action: Action to perform (start, stop, restart, status)
            **kwargs: Action-specific arguments

        Returns:
            OperationResult
        """
        if action == "start":
            return self.start(**kwargs)
        elif action == "stop":
            return self.stop(**kwargs)
        elif action == "restart":
            return self.restart(**kwargs)
        elif action == "status":
            is_running = self.is_running()
            pid = self.get_pid() if is_running else None
            return OperationResult.success_result(
                f"Backend {'running' if is_running else 'not running'}", data={"running": is_running, "pid": pid}
            )
        else:
            return OperationResult.failure_result(f"Unknown action: {action}")


# ============================================================================
#  PROCESS UTILITIES
# ============================================================================


class ProcessManager(Operation):
    """General process management utilities"""

    @staticmethod
    def kill_process_on_port(port: int, force: bool = False) -> OperationResult:
        """
        Kill process using a specific port.

        Args:
            port: Port number (must be 0-65535)
            force: Force kill without graceful shutdown

        Returns:
            OperationResult indicating success or failure
        """
        # Validate port range
        if not (0 <= port <= 65535):
            return OperationResult.failure_result(f"Invalid port number: {port} (must be between 0 and 65535)")

        if not psutil:
            return OperationResult.failure_result("psutil not installed - cannot manage processes")

        checker = SystemStatusChecker(Path.cwd())
        proc_info = checker.get_process_on_port(port)

        if not proc_info:
            return OperationResult.warning_result(f"No process found on port {port}")

        try:
            process = psutil.Process(proc_info.pid)

            if force:
                process.kill()
                return OperationResult.success_result(
                    f"Killed process {proc_info.pid} on port {port}", data={"pid": proc_info.pid, "port": port}
                )
            else:
                # Graceful termination
                if sys.platform == "win32":
                    process.send_signal(signal.CTRL_C_EVENT)
                else:
                    process.terminate()

                # Wait for termination
                process.wait(timeout=OperationTimeouts.PROCESS_SHUTDOWN_WAIT)
                return OperationResult.success_result(
                    f"Terminated process {proc_info.pid} on port {port}", data={"pid": proc_info.pid, "port": port}
                )

        except psutil.TimeoutExpired:
            return OperationResult.failure_result(f"Process {proc_info.pid} did not terminate (use force=True)")
        except psutil.AccessDenied:
            return OperationResult.failure_result(f"Access denied - cannot kill process {proc_info.pid}")
        except Exception as e:
            return OperationResult.failure_result(f"Failed to kill process on port {port}", e)

    @staticmethod
    def kill_all_on_ports(ports: List[int], force: bool = False) -> OperationResult:
        """
        Kill all processes on specified ports.

        Args:
            ports: List of port numbers
            force: Force kill without graceful shutdown

        Returns:
            OperationResult with results for each port
        """
        results = {}
        for port in ports:
            result = ProcessManager.kill_process_on_port(port, force)
            results[port] = result

        killed = [p for p, r in results.items() if r.success]
        failed = [p for p, r in results.items() if not r.success and r.status.value != "warning"]

        if failed:
            return OperationResult.failure_result(
                f"Killed {len(killed)}, failed {len(failed)}",
                data={"results": {k: v.__dict__ for k, v in results.items()}},
            )
        else:
            return OperationResult.success_result(
                f"Killed processes on {len(killed)} port(s)",
                data={"results": {k: v.__dict__ for k, v in results.items()}},
            )

    def execute(self, **kwargs) -> OperationResult:
        """Execute process management operation."""
        action = kwargs.get("action", "kill_port")
        if action == "kill_port":
            port = kwargs.get("port")
            force = bool(kwargs.get("force", False))
            if not isinstance(port, int):
                return OperationResult.failure_result("Missing or invalid 'port' parameter")
            return self.kill_process_on_port(port, force)

        elif action == "kill_all":
            ports = kwargs.get("ports", [])
            force = bool(kwargs.get("force", False))
            if not isinstance(ports, list) or not all(isinstance(p, int) for p in ports):
                return OperationResult.failure_result("Missing or invalid 'ports' parameter")
            return self.kill_all_on_ports(ports, force)

        else:
            return OperationResult.failure_result(f"Unknown action: {action}")
