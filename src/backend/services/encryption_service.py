"""
Encryption Service (v1.15.0)

Provides AES-256 encryption and decryption for backup files with key management.

Features:
- AES-256-GCM encryption for data security
- Automatic key generation and management
- Salt and IV storage with encrypted data
- Key rotation support
- Symmetric key encryption for master key protection

Usage:
    service = EncryptionService()
    encrypted_data = service.encrypt(b"sensitive data")
    decrypted_data = service.decrypt(encrypted_data)
"""

import json
import logging
import os
import secrets
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Optional

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

logger = logging.getLogger(__name__)

# Where the key lives inside a Docker container: the data volume, which every Docker edition
# mounts and keeps across an update of the image.
_DOCKER_KEY_DIR = "/data/.keys"


class BackupKeyMismatchError(InvalidTag):
    """The data could not be decrypted with this installation's key.

    Either the file was encrypted somewhere else (another installation, or this one before its
    key was lost) or it is damaged. A subclass of InvalidTag, which is what this used to raise,
    with a message: InvalidTag itself has none, so the user saw "Failed to decrypt backup: ".
    """


def legacy_key_dir() -> Path:
    """Next to the code: where the key was kept in every edition until November 2026."""
    return Path(__file__).parent.parent.parent / ".keys"


def default_key_dir() -> Path:
    """Where this installation keeps the key that encrypts its backups.

    The key has to outlive an update of the application. Next to the code it did not: in a
    Docker container that is the container's own layer, which an update throws away (every
    encrypted backup made before the update could then no longer be opened), and in the
    packaged Windows edition it is the program folder, which a normal user cannot write to.

    - ``BACKUP_KEYS_DIR`` when set (SMS Lite sets it to a folder in the user's profile);
    - in Docker, ``/data/.keys`` on the data volume;
    - otherwise next to the code, which in a source checkout stays where it is.
    """
    configured = ""
    try:
        from backend.config import get_settings

        configured = str(getattr(get_settings(), "BACKUP_KEYS_DIR", "") or "").strip()
    except Exception:
        configured = (os.environ.get("BACKUP_KEYS_DIR") or "").strip()
    if configured:
        return Path(configured)
    if os.environ.get("SMS_EXECUTION_MODE", "native").strip().lower() == "docker":
        return Path(_DOCKER_KEY_DIR)
    return legacy_key_dir()


def _adopt_legacy_key(key_dir: Path) -> None:
    """Bring the key from its old place when the new place has none.

    Without this, an installation that already has encrypted backups would start a new key at
    its first backup after the update and lose the way into the old ones.
    """
    try:
        legacy = legacy_key_dir() / "master.key"
        target = key_dir / "master.key"
        if target.exists() or not legacy.is_file():
            return
        if legacy.resolve() == target.resolve():
            return
        shutil.copy2(legacy, target)
        try:
            target.chmod(0o600)
        except (OSError, NotImplementedError):
            pass
        logger.info("Backup key moved to its lasting place: %s (the copy in %s is left as it is)", target, legacy)
    except OSError as exc:
        logger.warning("Could not bring the backup key from %s to %s: %s", legacy_key_dir(), key_dir, exc)


class EncryptionService:
    """AES-256 encryption service for backups with key management."""

    # Configuration
    KEY_LENGTH = 32  # 256 bits for AES-256
    SALT_LENGTH = 16  # 128 bits salt
    NONCE_LENGTH = 12  # 96 bits for GCM
    PBKDF2_ITERATIONS = 100_000
    TAG_LENGTH = 16  # 128 bits authentication tag

    def __init__(self, key_dir: Optional[Path] = None):
        """
        Initialize encryption service.

        Args:
            key_dir: Directory for storing encryption keys. Defaults to `default_key_dir()`.
        """
        self.key_dir = key_dir or default_key_dir()
        self.key_dir.mkdir(parents=True, exist_ok=True)
        self.master_key_path = self.key_dir / "master.key"
        self.key_metadata_path = self.key_dir / "keys.json"
        if key_dir is None:
            _adopt_legacy_key(self.key_dir)

        # Ensure restricted permissions on key directory
        try:
            self.key_dir.chmod(0o700)
        except (OSError, NotImplementedError):
            # Permissions not supported on this platform (e.g., Windows)
            pass

    def _get_or_create_master_key(self) -> bytes:
        """
        Get or create the master encryption key.

        Returns:
            Master key (256 bits)
        """
        if self.master_key_path.exists():
            with open(self.master_key_path, "rb") as f:
                return f.read()

        # Generate new master key
        master_key = secrets.token_bytes(self.KEY_LENGTH)

        # Write to file with restricted permissions
        with open(self.master_key_path, "wb") as f:
            f.write(master_key)

        try:
            self.master_key_path.chmod(0o600)
        except (OSError, NotImplementedError):
            pass

        return master_key

    def _derive_key_from_password(self, password: str, salt: bytes) -> bytes:
        """
        Derive encryption key from password using PBKDF2.

        Args:
            password: Password to derive from
            salt: Salt for key derivation

        Returns:
            Derived encryption key (256 bits)
        """
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=self.KEY_LENGTH,
            salt=salt,
            iterations=self.PBKDF2_ITERATIONS,
            backend=default_backend(),
        )
        return kdf.derive(password.encode())

    def encrypt(
        self,
        data: bytes,
        associated_data: Optional[bytes] = None,
    ) -> bytes:
        """
        Encrypt data using AES-256-GCM.

        Args:
            data: Data to encrypt
            associated_data: Optional authenticated data (included in tag but not encrypted)

        Returns:
            Encrypted package: salt (16) + nonce (12) + ciphertext + tag (16)
        """
        # Generate random salt and nonce
        salt = secrets.token_bytes(self.SALT_LENGTH)
        nonce = secrets.token_bytes(self.NONCE_LENGTH)

        # Get master key
        master_key = self._get_or_create_master_key()

        # Create cipher
        cipher = AESGCM(master_key)

        # Encrypt data
        ciphertext = cipher.encrypt(nonce, data, associated_data)

        # Return: salt + nonce + ciphertext (which includes authentication tag)
        return salt + nonce + ciphertext

    def decrypt(
        self,
        encrypted_data: bytes,
        associated_data: Optional[bytes] = None,
    ) -> bytes:
        """
        Decrypt data that was encrypted with encrypt().

        Args:
            encrypted_data: Encrypted package (salt + nonce + ciphertext + tag)
            associated_data: Associated data used during encryption

        Returns:
            Decrypted data

        Raises:
            cryptography.exceptions.InvalidTag: If authentication fails
            ValueError: If encrypted data is malformed
        """
        # Validate length
        expected_min_length = self.SALT_LENGTH + self.NONCE_LENGTH + self.TAG_LENGTH
        if len(encrypted_data) < expected_min_length:
            raise ValueError(
                f"Invalid encrypted data length. Expected at least {expected_min_length}, got {len(encrypted_data)}"
            )

        # Extract components (salt not used in decryption, only for key derivation in password-based encryption)
        nonce = encrypted_data[self.SALT_LENGTH : self.SALT_LENGTH + self.NONCE_LENGTH]
        ciphertext = encrypted_data[self.SALT_LENGTH + self.NONCE_LENGTH :]

        # Get master key
        master_key = self._get_or_create_master_key()

        # Create cipher and decrypt
        cipher = AESGCM(master_key)
        try:
            plaintext = cipher.decrypt(nonce, ciphertext, associated_data)
        except InvalidTag as exc:
            raise BackupKeyMismatchError(
                "This file cannot be opened with this installation's backup key "
                f"({self.master_key_path}). It was encrypted with a different key (on another "
                "installation, or here before the key was replaced), or the file is damaged. "
                "An encrypted backup can only be restored where its key is."
            ) from exc

        return plaintext

    def encrypt_file(
        self,
        input_path: Path,
        output_path: Path,
        metadata: Optional[Dict] = None,
    ) -> None:
        """
        Encrypt a file and write encrypted version with metadata.

        Args:
            input_path: Path to file to encrypt
            output_path: Path to write encrypted file
            metadata: Optional metadata to include (not encrypted)
        """
        # Read input file
        with open(input_path, "rb") as f:
            data = f.read()

        # Prepare metadata
        if metadata is None:
            metadata = {}

        metadata.update(
            {
                "original_name": input_path.name,
                "original_size": len(data),
                "encrypted_at": datetime.now(timezone.utc).isoformat(),
                "algorithm": "AES-256-GCM",
            }
        )

        # Encrypt associated data (metadata)
        metadata_bytes = json.dumps(metadata).encode()

        # Encrypt file
        encrypted_data = self.encrypt(data, associated_data=metadata_bytes)

        # Write encrypted file
        # codeql[py/path-injection] callers resolve output_path via _resolve_backup_path()
        output_path.parent.mkdir(parents=True, exist_ok=True)
        # codeql[py/path-injection] callers resolve output_path via _resolve_backup_path()
        with open(output_path, "wb") as f:
            # Write header: encrypted package size (4 bytes, big-endian)
            # This allows detection of encrypted vs unencrypted files
            f.write(len(encrypted_data).to_bytes(4, byteorder="big"))
            # Write metadata length (2 bytes) and metadata
            f.write(len(metadata_bytes).to_bytes(2, byteorder="big"))
            f.write(metadata_bytes)
            # Write encrypted data
            f.write(encrypted_data)

    def decrypt_file(
        self,
        input_path: Path,
        output_path: Path,
    ) -> Dict:
        """
        Decrypt a file that was encrypted with encrypt_file().

        Args:
            input_path: Path to encrypted file
            output_path: Path to write decrypted file

        Returns:
            Metadata from encrypted file
        """
        with open(input_path, "rb") as f:
            # Read encrypted package size
            size_bytes = f.read(4)
            if len(size_bytes) < 4:
                raise ValueError("Invalid encrypted file format")

            encrypted_size = int.from_bytes(size_bytes, byteorder="big")

            # Read metadata length and metadata
            metadata_len_bytes = f.read(2)
            if len(metadata_len_bytes) < 2:
                raise ValueError("Invalid encrypted file format")

            metadata_len = int.from_bytes(metadata_len_bytes, byteorder="big")
            metadata_bytes = f.read(metadata_len)

            # Read encrypted data
            encrypted_data = f.read(encrypted_size)

        # Verify integrity
        if len(encrypted_data) != encrypted_size:
            raise ValueError(f"Encrypted data size mismatch. Expected {encrypted_size}, got {len(encrypted_data)}")

        # Decrypt
        plaintext = self.decrypt(encrypted_data, associated_data=metadata_bytes)

        # CodeQL [python/path-injection]: Safe - callers provide a Path object that
        # is validated by BackupServiceEncrypted before this sink is reached.
        # Write decrypted file
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "wb") as f:
            f.write(plaintext)

        # Parse and return metadata
        metadata = json.loads(metadata_bytes)
        return metadata

    def get_key_info(self) -> Dict:
        """
        Get information about current encryption keys.

        Returns:
            Dictionary with key information
        """
        return {
            "has_master_key": self.master_key_path.exists(),
            "key_dir": str(self.key_dir),
            "key_length_bits": self.KEY_LENGTH * 8,
            "algorithm": "AES-256-GCM",
            "pbkdf2_iterations": self.PBKDF2_ITERATIONS,
            "salt_length_bytes": self.SALT_LENGTH,
            "nonce_length_bytes": self.NONCE_LENGTH,
        }

    def rotate_master_key(self, new_key: Optional[bytes] = None) -> bytes:
        """
        Rotate the master encryption key.

        Note: This does NOT re-encrypt existing data. It only changes the key
        used for future encryption. Existing encrypted data will become
        inaccessible unless the old key is preserved.

        Args:
            new_key: Optional new key (generates random if not provided)

        Returns:
            New master key
        """
        # Backup old key if it exists
        if self.master_key_path.exists():
            backup_path = self.key_dir / f"master.key.bak.{datetime.now(timezone.utc).timestamp()}"
            self.master_key_path.rename(backup_path)

        # Generate or use provided key
        master_key = new_key or secrets.token_bytes(self.KEY_LENGTH)

        # Write new key
        with open(self.master_key_path, "wb") as f:
            f.write(master_key)

        try:
            self.master_key_path.chmod(0o600)
        except (OSError, NotImplementedError):
            pass

        return master_key
