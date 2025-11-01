"""
Docker operations including compose, containers, volumes, and images.

This module provides:
- docker-compose operations (up, down, build, restart)
- Container management
- Volume creation, migration, and management
- Image management and cleanup
"""

from .base import Operation, OperationResult, ContainerInfo, VolumeInfo, get_project_root
from pathlib import Path
from typing import Optional, List, Dict
import subprocess
import os


# Optional docker package import
try:
    import docker
except ImportError:
    docker = None


# ============================================================================
#  DOCKER COMPOSE OPERATIONS
# ============================================================================

class DockerComposeOperations(Operation):
    """Docker Compose lifecycle management"""

    def __init__(self, root_dir: Optional[Path] = None):
        super().__init__(root_dir or get_project_root())
        self.compose_file = self.root_dir / 'docker-compose.yml'
        self.override_file = self.root_dir / 'docker-compose.override.yml'

    def _run_compose_command(
        self,
        args: List[str],
        timeout: Optional[int] = 300,
        env: Optional[Dict[str, str]] = None
    ) -> subprocess.CompletedProcess:
        """
        Run docker-compose command.

        Args:
            args: Command arguments
            timeout: Timeout in seconds
            env: Additional environment variables

        Returns:
            CompletedProcess result
        """
        cmd = ['docker', 'compose'] + args

        # Merge environment variables
        full_env = os.environ.copy()
        if env:
            full_env.update(env)

        self.log_debug(f"Running: {' '.join(cmd)}")

        return subprocess.run(
            cmd,
            cwd=str(self.root_dir),
            capture_output=True,
            text=True,
            timeout=timeout,
            env=full_env
        )

    def up(
        self,
        detach: bool = True,
        build: bool = False,
        no_cache: bool = False,
        version: Optional[str] = None
    ) -> OperationResult:
        """
        Start Docker containers with docker-compose up.

        Args:
            detach: Run in detached mode
            build: Build images before starting
            no_cache: Build without cache
            version: Version tag for images

        Returns:
            OperationResult with container information
        """
        try:
            args = ['up']

            if detach:
                args.append('-d')

            if build:
                args.append('--build')
                if no_cache:
                    args.append('--no-cache')

            # Set VERSION environment variable
            env = {}
            if version:
                env['VERSION'] = version
            elif (self.root_dir / 'VERSION').exists():
                version = (self.root_dir / 'VERSION').read_text(encoding='utf-8').strip()
                env['VERSION'] = version

            self.log_info("Starting Docker containers...")
            result = self._run_compose_command(args, timeout=600, env=env)

            if result.returncode == 0:
                self.log_success("Docker containers started")
                return OperationResult.success_result(
                    "Containers started successfully",
                    data={'output': result.stdout, 'version': version}
                )
            else:
                return OperationResult.failure_result(
                    f"docker-compose up failed (exit code {result.returncode})",
                    data={'stdout': result.stdout, 'stderr': result.stderr}
                )

        except subprocess.TimeoutExpired:
            return OperationResult.failure_result("docker-compose up timed out")
        except FileNotFoundError:
            return OperationResult.failure_result(
                "docker or docker-compose not found - ensure Docker is installed"
            )
        except Exception as e:
            return OperationResult.failure_result("Failed to start containers", e)

    def down(
        self,
        remove_volumes: bool = False,
        remove_images: bool = False
    ) -> OperationResult:
        """
        Stop and remove Docker containers.

        Args:
            remove_volumes: Remove named volumes
            remove_images: Remove images (local or all)

        Returns:
            OperationResult indicating success or failure
        """
        try:
            args = ['down']

            if remove_volumes:
                args.append('--volumes')

            if remove_images:
                args.extend(['--rmi', 'local'])

            self.log_info("Stopping Docker containers...")
            result = self._run_compose_command(args)

            if result.returncode == 0:
                self.log_success("Docker containers stopped")
                return OperationResult.success_result(
                    "Containers stopped successfully",
                    data={'output': result.stdout}
                )
            else:
                return OperationResult.failure_result(
                    f"docker-compose down failed (exit code {result.returncode})",
                    data={'stdout': result.stdout, 'stderr': result.stderr}
                )

        except subprocess.TimeoutExpired:
            return OperationResult.failure_result("docker-compose down timed out")
        except Exception as e:
            return OperationResult.failure_result("Failed to stop containers", e)

    def build(
        self,
        no_cache: bool = False,
        version: Optional[str] = None
    ) -> OperationResult:
        """
        Build Docker images.

        Args:
            no_cache: Build without using cache
            version: Version tag for images

        Returns:
            OperationResult indicating success or failure
        """
        try:
            args = ['build']

            if no_cache:
                args.append('--no-cache')

            # Set VERSION environment variable
            env = {}
            if version:
                env['VERSION'] = version
            elif (self.root_dir / 'VERSION').exists():
                version = (self.root_dir / 'VERSION').read_text(encoding='utf-8').strip()
                env['VERSION'] = version

            self.log_info("Building Docker images...")
            result = self._run_compose_command(args, timeout=900, env=env)

            if result.returncode == 0:
                self.log_success("Docker images built")
                return OperationResult.success_result(
                    "Images built successfully",
                    data={'output': result.stdout, 'version': version}
                )
            else:
                return OperationResult.failure_result(
                    f"docker-compose build failed (exit code {result.returncode})",
                    data={'stdout': result.stdout, 'stderr': result.stderr}
                )

        except subprocess.TimeoutExpired:
            return OperationResult.failure_result("docker-compose build timed out")
        except Exception as e:
            return OperationResult.failure_result("Failed to build images", e)

    def restart(self) -> OperationResult:
        """
        Restart Docker containers.

        Returns:
            OperationResult indicating success or failure
        """
        try:
            self.log_info("Restarting Docker containers...")
            result = self._run_compose_command(['restart'])

            if result.returncode == 0:
                self.log_success("Docker containers restarted")
                return OperationResult.success_result(
                    "Containers restarted successfully",
                    data={'output': result.stdout}
                )
            else:
                return OperationResult.failure_result(
                    f"docker-compose restart failed (exit code {result.returncode})",
                    data={'stdout': result.stdout, 'stderr': result.stderr}
                )

        except Exception as e:
            return OperationResult.failure_result("Failed to restart containers", e)

    def logs(
        self,
        follow: bool = False,
        tail: int = 100,
        service: Optional[str] = None
    ) -> OperationResult:
        """
        View container logs.

        Args:
            follow: Follow log output
            tail: Number of lines to show from end
            service: Specific service name (or all if None)

        Returns:
            OperationResult with log output
        """
        try:
            args = ['logs', '--tail', str(tail)]

            if follow:
                args.append('-f')

            if service:
                args.append(service)

            result = self._run_compose_command(args, timeout=30 if not follow else None)

            if result.returncode == 0:
                return OperationResult.success_result(
                    "Logs retrieved",
                    data={'logs': result.stdout}
                )
            else:
                return OperationResult.failure_result(
                    "Failed to get logs",
                    data={'stderr': result.stderr}
                )

        except subprocess.TimeoutExpired:
            return OperationResult.failure_result("docker-compose logs timed out")
        except Exception as e:
            return OperationResult.failure_result("Failed to get logs", e)

    def execute(self, action: str = "up", **kwargs) -> OperationResult:
        """
        Execute docker-compose operation.

        Args:
            action: Action to perform (up, down, build, restart, logs)
            **kwargs: Action-specific arguments

        Returns:
            OperationResult
        """
        if action == "up":
            return self.up(**kwargs)
        elif action == "down":
            return self.down(**kwargs)
        elif action == "build":
            return self.build(**kwargs)
        elif action == "restart":
            return self.restart()
        elif action == "logs":
            return self.logs(**kwargs)
        else:
            return OperationResult.failure_result(f"Unknown action: {action}")


# ============================================================================
#  DOCKER VOLUME OPERATIONS
# ============================================================================

class DockerVolumeOperations(Operation):
    """Docker volume management"""

    def __init__(self, root_dir: Optional[Path] = None):
        super().__init__(root_dir or get_project_root())

    def list_volumes(self, pattern: Optional[str] = None) -> List[VolumeInfo]:
        """
        List Docker volumes.

        Args:
            pattern: Filter pattern for volume names

        Returns:
            List of VolumeInfo objects
        """
        if not docker:
            self.log_warning("docker package not installed")
            return []

        try:
            client = docker.from_env()
            volumes = []

            for volume in client.volumes.list():
                if pattern and pattern not in volume.name:
                    continue

                volumes.append(VolumeInfo(
                    name=volume.name,
                    driver=volume.attrs.get('Driver', 'unknown'),
                    mountpoint=volume.attrs.get('Mountpoint', ''),
                    created=volume.attrs.get('CreatedAt', ''),
                    size_bytes=None  # Size requires inspection
                ))

            return volumes

        except Exception as e:
            self.log_error("Failed to list volumes", e)
            return []

    def create_volume(self, name: str) -> OperationResult:
        """
        Create a Docker volume.

        Args:
            name: Volume name

        Returns:
            OperationResult indicating success or failure
        """
        try:
            result = subprocess.run(
                ['docker', 'volume', 'create', name],
                capture_output=True,
                text=True,
                timeout=30
            )

            if result.returncode == 0:
                self.log_success(f"Volume created: {name}")
                return OperationResult.success_result(
                    f"Volume created: {name}",
                    data={'name': name}
                )
            else:
                return OperationResult.failure_result(
                    f"Failed to create volume (exit code {result.returncode})",
                    data={'stderr': result.stderr}
                )

        except subprocess.TimeoutExpired:
            return OperationResult.failure_result("Volume creation timed out")
        except Exception as e:
            return OperationResult.failure_result("Failed to create volume", e)

    def migrate_volume(self, source: str, target: str) -> OperationResult:
        """
        Migrate data from one volume to another.

        Args:
            source: Source volume name
            target: Target volume name (will be created if doesn't exist)

        Returns:
            OperationResult indicating success or failure
        """
        try:
            # Create target volume if it doesn't exist
            self.log_info(f"Creating target volume: {target}")
            create_result = self.create_volume(target)

            # Copy data using alpine container
            self.log_info(f"Migrating data: {source} → {target}")

            result = subprocess.run(
                [
                    'docker', 'run', '--rm',
                    '-v', f'{source}:/source:ro',
                    '-v', f'{target}:/target',
                    'alpine',
                    'sh', '-c', 'cp -av /source/. /target/'
                ],
                capture_output=True,
                text=True,
                timeout=300
            )

            if result.returncode == 0:
                self.log_success(f"Volume migrated: {source} → {target}")
                return OperationResult.success_result(
                    f"Volume migrated successfully",
                    data={'source': source, 'target': target, 'output': result.stdout}
                )
            else:
                return OperationResult.failure_result(
                    f"Volume migration failed (exit code {result.returncode})",
                    data={'stderr': result.stderr}
                )

        except subprocess.TimeoutExpired:
            return OperationResult.failure_result("Volume migration timed out")
        except Exception as e:
            return OperationResult.failure_result("Failed to migrate volume", e)

    def remove_volume(self, name: str, force: bool = False) -> OperationResult:
        """
        Remove a Docker volume.

        Args:
            name: Volume name
            force: Force removal

        Returns:
            OperationResult indicating success or failure
        """
        try:
            args = ['docker', 'volume', 'rm']
            if force:
                args.append('-f')
            args.append(name)

            result = subprocess.run(
                args,
                capture_output=True,
                text=True,
                timeout=30
            )

            if result.returncode == 0:
                self.log_success(f"Volume removed: {name}")
                return OperationResult.success_result(f"Volume removed: {name}")
            else:
                return OperationResult.failure_result(
                    f"Failed to remove volume (exit code {result.returncode})",
                    data={'stderr': result.stderr}
                )

        except subprocess.TimeoutExpired:
            return OperationResult.failure_result("Volume removal timed out")
        except Exception as e:
            return OperationResult.failure_result("Failed to remove volume", e)

    def execute(self, action: str = "list", **kwargs) -> OperationResult:
        """Execute volume operation."""
        if action == "list":
            volumes = self.list_volumes(kwargs.get('pattern'))
            return OperationResult.success_result(
                f"Found {len(volumes)} volume(s)",
                data={'volumes': [v.__dict__ for v in volumes]}
            )
        elif action == "create":
            return self.create_volume(kwargs.get('name'))
        elif action == "migrate":
            return self.migrate_volume(kwargs.get('source'), kwargs.get('target'))
        elif action == "remove":
            return self.remove_volume(kwargs.get('name'), kwargs.get('force', False))
        else:
            return OperationResult.failure_result(f"Unknown action: {action}")


# ============================================================================
#  DOCKER IMAGE OPERATIONS
# ============================================================================

class DockerImageOperations(Operation):
    """Docker image management and cleanup"""

    def remove_images(self, pattern: str, force: bool = False) -> OperationResult:
        """
        Remove Docker images matching pattern.

        Args:
            pattern: Image name pattern
            force: Force removal

        Returns:
            OperationResult indicating success or failure
        """
        try:
            # Get images matching pattern
            result = subprocess.run(
                ['docker', 'images', '--filter', f'reference={pattern}', '-q'],
                capture_output=True,
                text=True,
                timeout=30
            )

            if result.returncode != 0:
                return OperationResult.failure_result("Failed to list images")

            image_ids = result.stdout.strip().split('\n')
            image_ids = [img for img in image_ids if img]

            if not image_ids:
                return OperationResult.warning_result(
                    f"No images found matching: {pattern}"
                )

            # Remove images
            args = ['docker', 'rmi']
            if force:
                args.append('-f')
            args.extend(image_ids)

            self.log_info(f"Removing {len(image_ids)} image(s)...")
            result = subprocess.run(
                args,
                capture_output=True,
                text=True,
                timeout=120
            )

            if result.returncode == 0:
                self.log_success(f"Removed {len(image_ids)} image(s)")
                return OperationResult.success_result(
                    f"Removed {len(image_ids)} image(s)",
                    data={'count': len(image_ids), 'ids': image_ids}
                )
            else:
                return OperationResult.failure_result(
                    f"Failed to remove images (exit code {result.returncode})",
                    data={'stderr': result.stderr}
                )

        except subprocess.TimeoutExpired:
            return OperationResult.failure_result("Image removal timed out")
        except Exception as e:
            return OperationResult.failure_result("Failed to remove images", e)

    def prune_build_cache(self, all_cache: bool = False) -> OperationResult:
        """
        Prune Docker build cache.

        Args:
            all_cache: Remove all cache (not just dangling)

        Returns:
            OperationResult indicating success or failure
        """
        try:
            args = ['docker', 'builder', 'prune', '-f']
            if all_cache:
                args.append('-a')

            self.log_info("Pruning Docker build cache...")
            result = subprocess.run(
                args,
                capture_output=True,
                text=True,
                timeout=120
            )

            if result.returncode == 0:
                self.log_success("Build cache pruned")
                return OperationResult.success_result(
                    "Build cache pruned",
                    data={'output': result.stdout}
                )
            else:
                return OperationResult.failure_result(
                    f"Failed to prune cache (exit code {result.returncode})",
                    data={'stderr': result.stderr}
                )

        except subprocess.TimeoutExpired:
            return OperationResult.failure_result("Cache prune timed out")
        except Exception as e:
            return OperationResult.failure_result("Failed to prune cache", e)

    def execute(self, action: str = "prune", **kwargs) -> OperationResult:
        """Execute image operation."""
        if action == "remove":
            return self.remove_images(kwargs.get('pattern'), kwargs.get('force', False))
        elif action == "prune":
            return self.prune_build_cache(kwargs.get('all_cache', False))
        else:
            return OperationResult.failure_result(f"Unknown action: {action}")
