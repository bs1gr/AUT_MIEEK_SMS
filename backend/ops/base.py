"""
Base classes and data structures for operational modules.

This module provides:
- Abstract base classes for all operations
- Standard data structures (OperationResult, ProcessInfo, etc.)
- Common utilities and logging helpers
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List
from enum import Enum
from datetime import datetime, timedelta
from pathlib import Path
import logging


# ============================================================================
#  ENUMERATIONS
# ============================================================================

class OperationStatus(Enum):
    """Status codes for operations"""
    SUCCESS = "success"
    FAILURE = "failure"
    WARNING = "warning"
    PARTIAL = "partial"


# ============================================================================
#  CORE DATA STRUCTURES
# ============================================================================

@dataclass
class OperationResult:
    """Standard result object returned by all operations"""
    success: bool
    message: str
    status: OperationStatus
    data: Optional[Dict[str, Any]] = None
    error: Optional[Exception] = None
    duration_ms: Optional[int] = None

    @classmethod
    def success_result(cls, message: str, data: Optional[Dict] = None) -> 'OperationResult':
        """Create a successful result"""
        return cls(True, message, OperationStatus.SUCCESS, data)

    @classmethod
    def failure_result(cls, message: str, error: Optional[Exception] = None) -> 'OperationResult':
        """Create a failed result"""
        return cls(False, message, OperationStatus.FAILURE, error=error)

    @classmethod
    def warning_result(cls, message: str, data: Optional[Dict] = None) -> 'OperationResult':
        """Create a warning result (operation succeeded but with warnings)"""
        return cls(True, message, OperationStatus.WARNING, data)

    @classmethod
    def partial_result(cls, message: str, data: Optional[Dict] = None) -> 'OperationResult':
        """Create a partial success result"""
        return cls(True, message, OperationStatus.PARTIAL, data)


@dataclass
class ProcessInfo:
    """Information about a running process"""
    pid: int
    name: str
    port: Optional[int] = None
    command: Optional[str] = None
    cpu_percent: Optional[float] = None
    memory_mb: Optional[float] = None


@dataclass
class ContainerInfo:
    """Information about a Docker container"""
    name: str
    id: str
    state: str  # running, stopped, exited, etc.
    status: str  # detailed status message
    ports: Dict[int, int] = field(default_factory=dict)  # container_port -> host_port
    image: Optional[str] = None
    created: Optional[datetime] = None


@dataclass
class VolumeInfo:
    """Information about a Docker volume"""
    name: str
    driver: str
    mountpoint: str
    created: str
    size_bytes: Optional[int] = None

    @property
    def size_mb(self) -> Optional[float]:
        """Get size in MB"""
        return self.size_bytes / (1024 * 1024) if self.size_bytes else None


@dataclass
class PortStatus:
    """Port availability and usage information"""
    port: int
    in_use: bool
    process: Optional[ProcessInfo] = None


@dataclass
class SystemStatus:
    """Comprehensive system status"""
    mode: str  # 'docker', 'native', 'not_running'
    docker_installed: bool
    docker_running: bool
    containers: List[ContainerInfo]
    backend_running: bool
    backend_pid: Optional[int]
    backend_port: Optional[int]
    frontend_running: bool
    frontend_pid: Optional[int]
    frontend_port: Optional[int]
    database_exists: bool
    database_size_kb: Optional[float]

    def is_running(self) -> bool:
        """Check if any services are running"""
        return self.mode in ('docker', 'native')


@dataclass
class BackupInfo:
    """Information about a database backup"""
    filename: str
    path: Path
    size_bytes: int
    created_at: datetime
    version: str

    @property
    def size_kb(self) -> float:
        """Get size in KB"""
        return self.size_bytes / 1024

    @property
    def size_mb(self) -> float:
        """Get size in MB"""
        return self.size_bytes / (1024 * 1024)

    @property
    def age(self) -> timedelta:
        """Get age of backup"""
        return datetime.now() - self.created_at

    @property
    def age_str(self) -> str:
        """Get human-readable age"""
        age = self.age
        if age.days > 0:
            return f"{age.days}d ago"
        elif age.seconds >= 3600:
            hours = age.seconds // 3600
            return f"{hours}h ago"
        else:
            minutes = age.seconds // 60
            return f"{minutes}m ago"

    @property
    def created(self) -> datetime:
        """Alias for created_at (backward compatibility)"""
        return self.created_at

    @property
    def size_human(self) -> str:
        """Get human-readable size"""
        if self.size_kb < 1024:
            return f"{self.size_kb:.1f} KB"
        else:
            return f"{self.size_mb:.1f} MB"


@dataclass
class DependencyStatus:
    """Status of system dependencies"""
    python_installed: bool
    python_version: Optional[str]
    python_sufficient: bool  # >= 3.11
    node_installed: bool
    node_version: Optional[str]
    node_sufficient: bool  # >= 18
    docker_installed: bool
    docker_version: Optional[str]
    docker_running: bool

    def is_satisfied(self) -> bool:
        """Check if all required dependencies are satisfied"""
        return (
            self.python_installed and self.python_sufficient and
            self.node_installed and self.node_sufficient
        )

    def get_issues(self) -> List[str]:
        """Get list of dependency issues"""
        issues = []
        if not self.python_installed:
            issues.append("Python not installed")
        elif not self.python_sufficient:
            issues.append(f"Python version too old ({self.python_version}), need 3.11+")

        if not self.node_installed:
            issues.append("Node.js not installed")
        elif not self.node_sufficient:
            issues.append(f"Node.js version too old ({self.node_version}), need 18+")

        return issues


# ============================================================================
#  BASE OPERATION CLASS
# ============================================================================

class Operation(ABC):
    """
    Abstract base class for all operations.

    All operational modules should inherit from this class and implement
    the `execute()` method. This provides:
    - Consistent interface
    - Built-in logging
    - Error handling helpers
    - Result standardization
    """

    def __init__(self, root_dir: Optional[Path] = None):
        """
        Initialize operation.

        Args:
            root_dir: Project root directory. Defaults to current working directory.
        """
        self.logger = logging.getLogger(self.__class__.__name__)
        self.root_dir = root_dir or Path.cwd()

    @abstractmethod
    def execute(self, **kwargs) -> OperationResult:
        """
        Execute the operation.

        Returns:
            OperationResult: Result of the operation
        """
        pass

    def log_info(self, message: str) -> None:
        """Log info message"""
        self.logger.info(message)

    def log_warning(self, message: str) -> None:
        """Log warning message"""
        self.logger.warning(message)

    def log_error(self, message: str, exc: Optional[Exception] = None) -> None:
        """Log error message"""
        if exc:
            self.logger.error(f"{message}: {exc}", exc_info=True)
        else:
            self.logger.error(message)

    def log_success(self, message: str) -> None:
        """Log success message (info level with checkmark)"""
        self.logger.info(f"✓ {message}")

    def log_debug(self, message: str) -> None:
        """Log debug message"""
        self.logger.debug(message)


# ============================================================================
#  LOGGING UTILITIES
# ============================================================================

class OperationLogger:
    """Structured logging for operations"""

    _configured = False

    @staticmethod
    def configure(
        log_file: Optional[Path] = None,
        level: str = "INFO",
        console: bool = True
    ) -> None:
        """
        Configure logging for operations.

        Args:
            log_file: Optional file path for logs
            level: Logging level (DEBUG, INFO, WARNING, ERROR)
            console: Whether to log to console
        """
        if OperationLogger._configured:
            return

        # Get numeric level
        numeric_level = getattr(logging, level.upper(), logging.INFO)

        # Create formatter
        formatter = logging.Formatter(
            '%(asctime)s [%(levelname)s] %(name)s: %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )

        # Configure root logger
        root_logger = logging.getLogger()
        root_logger.setLevel(numeric_level)

        # Clear existing handlers
        root_logger.handlers.clear()

        # Console handler
        if console:
            console_handler = logging.StreamHandler()
            console_handler.setLevel(numeric_level)
            console_handler.setFormatter(formatter)
            root_logger.addHandler(console_handler)

        # File handler
        if log_file:
            log_file.parent.mkdir(parents=True, exist_ok=True)
            file_handler = logging.FileHandler(log_file)
            file_handler.setLevel(numeric_level)
            file_handler.setFormatter(formatter)
            root_logger.addHandler(file_handler)

        OperationLogger._configured = True


# ============================================================================
#  UTILITY FUNCTIONS
# ============================================================================

def format_size(size_bytes: int) -> str:
    """
    Format byte size as human-readable string.

    Args:
        size_bytes: Size in bytes

    Returns:
        Human-readable size string (e.g., "1.5 MB")
    """
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if size_bytes < 1024.0:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.1f} PB"


def format_duration(duration_ms: int) -> str:
    """
    Format duration in milliseconds as human-readable string.

    Args:
        duration_ms: Duration in milliseconds

    Returns:
        Human-readable duration string (e.g., "1.5s", "250ms")
    """
    if duration_ms < 1000:
        return f"{duration_ms}ms"
    elif duration_ms < 60000:
        return f"{duration_ms / 1000:.1f}s"
    else:
        minutes = duration_ms // 60000
        seconds = (duration_ms % 60000) / 1000
        return f"{minutes}m {seconds:.0f}s"


def get_project_root() -> Path:
    """
    Get the project root directory.

    Returns:
        Path to project root
    """
    # Assuming this file is in backend/ops/base.py
    return Path(__file__).parent.parent.parent


def get_python_executable(root_dir: Path) -> str:
    """
    Get path to Python executable (venv if exists, otherwise system Python).

    This function checks for a virtual environment in backend/venv and returns
    the path to its Python executable if it exists. Otherwise, returns 'python'
    to use the system Python.

    Args:
        root_dir: Project root directory

    Returns:
        Path to Python executable as string

    Note:
        This is a shared utility to eliminate code duplication across operations.
        Used by BackendServer, DatabaseManager, and SetupOperations.
    """
    venv_dir = root_dir / 'backend' / 'venv'

    if venv_dir.exists():
        # Windows: venv/Scripts/python.exe
        python_path = venv_dir / 'Scripts' / 'python.exe'
        if python_path.exists():
            return str(python_path)

        # Unix: venv/bin/python
        python_path = venv_dir / 'bin' / 'python'
        if python_path.exists():
            return str(python_path)

    # Fallback to system Python
    return 'python'


class OperationTimeouts:
    """
    Standard timeout values for operations (in seconds).

    This class defines consistent timeout values across all operations
    to improve maintainability and prevent arbitrary magic numbers.
    """

    # Process startup/shutdown
    PROCESS_STARTUP_WAIT = 2       # Wait after starting process
    PROCESS_SHUTDOWN_WAIT = 5      # Wait for graceful shutdown

    # Command execution
    QUICK_COMMAND = 30             # < 30s commands (git, docker ps, etc.)
    MEDIUM_COMMAND = 120           # 1-2 minute commands (venv, alembic)
    LONG_COMMAND = 600             # 5-10 minute commands (pip, npm install)

    # Docker operations
    DOCKER_BUILD = 900             # 15 minutes for builds
    DOCKER_COMPOSE_UP = 600        # 10 minutes for compose up
    DOCKER_VOLUME_OP = 60          # 1 minute for volume operations

    # HTTP/Network
    HTTP_REQUEST = 3               # Individual HTTP request
    HTTP_ENDPOINT_WAIT = 120       # Waiting for endpoint to become available


def ensure_directory(path: Path) -> None:
    """
    Ensure a directory exists, creating it if necessary.

    Args:
        path: Directory path
    """
    path.mkdir(parents=True, exist_ok=True)
