"""One-shot encrypted backups and private functional checks; no network or deletion."""

from __future__ import annotations

import argparse
from contextlib import contextmanager
from datetime import datetime, timezone
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import stat
import sys
import uuid

from .operations import Operations, OperationsError, _directory_chain, _path, _private_file
from .settings import Settings

_NAME = re.compile(r"backup-\d{8}T\d{12}Z-[a-f0-9]{8}\Z")
_COUNTS = {"registrations", "submissions", "pending", "processing", "synced", "review"}


class Maintenance:
    """A scheduler calls this explicitly; importing it never starts a job."""

    def __init__(self, settings: Settings, root: Path):
        self.operations = Operations(settings)
        self.database = settings.database_path
        self.root = _path(root)
        _directory_chain(self.root)
        if self.root in {Path("/"), Path.home(), Path.cwd(), Path("/tmp"), settings.database_path.parent}:
            raise OperationsError("A dedicated backup directory is required")
        if stat.S_IMODE(self.root.stat().st_mode) != 0o700:
            raise OperationsError("Backup storage requires a private directory")

    @contextmanager
    def _lock(self):
        # Reject links/permissions before flock; never truncate or follow an existing file.
        descriptor = os.open(self.root / ".maintenance.lock", os.O_RDWR | os.O_CREAT | os.O_NOFOLLOW, 0o600)
        try:
            info = os.fstat(descriptor)
            if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1 or stat.S_IMODE(info.st_mode) != 0o600:
                raise OperationsError("Backup lock is unavailable")
            try:
                fcntl.flock(descriptor, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError:
                raise OperationsError("Maintenance is already running") from None
            yield
        finally:
            os.close(descriptor)

    @staticmethod
    def _hash(path: Path) -> str:
        _private_file(path)
        digest = hashlib.sha256()
        with path.open("rb") as handle:
            for chunk in iter(lambda: handle.read(1024 * 1024), b""):
                digest.update(chunk)
        return digest.hexdigest()

    def backup(self, *, now: datetime | None = None) -> dict:
        instant = now or datetime.now(timezone.utc)
        if instant.tzinfo is None:
            raise OperationsError("An explicit timezone is required")
        instant = instant.astimezone(timezone.utc)
        with self._lock():
            destination = self.root / f"backup-{instant:%Y%m%dT%H%M%S%fZ}-{uuid.uuid4().hex[:8]}"
            counts = self.operations.backup(destination)
            snapshot = destination / "intake.sqlite3"
            manifest = {"version": 1, "created_at": instant.isoformat(),
                        "sha256": self._hash(snapshot), "counts": counts}
            descriptor = os.open(destination / "manifest.json", os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
            with os.fdopen(descriptor, "w") as handle:
                json.dump(manifest, handle, sort_keys=True)
                handle.flush()
                os.fsync(handle.fileno())
            with snapshot.open("rb") as handle:
                os.fsync(handle.fileno())
            for directory in (destination, self.root):
                descriptor = os.open(directory, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
                try:
                    os.fsync(descriptor)
                finally:
                    os.close(descriptor)
            # Verify the stored manifest and snapshot, not just the copy operation's result.
            self._verify(destination, now=instant)
            return {"ok": True, "operation": "backup", "created_at": manifest["created_at"], "counts": counts}

    def _verify(self, directory: Path, *, now: datetime) -> tuple[datetime, dict]:
        _directory_chain(directory)
        if stat.S_IMODE(directory.stat().st_mode) != 0o700:
            raise OperationsError("Backup directory is unavailable")
        manifest_path = directory / "manifest.json"
        _private_file(manifest_path)
        if manifest_path.stat().st_size > 8192:
            raise OperationsError("Backup manifest is invalid")
        manifest = json.loads(manifest_path.read_bytes())
        if not isinstance(manifest, dict) or set(manifest) != {"version", "created_at", "sha256", "counts"} or type(manifest["version"]) is not int or manifest["version"] != 1:
            raise OperationsError("Backup manifest is invalid")
        created = datetime.fromisoformat(manifest["created_at"])
        if created.tzinfo is None or (created - now).total_seconds() > 60:
            raise OperationsError("Backup timestamp is invalid")
        if directory.name.split("-")[1] != created.astimezone(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ"):
            raise OperationsError("Backup timestamp is invalid")
        if not isinstance(manifest["counts"], dict) or set(manifest["counts"]) != _COUNTS:
            raise OperationsError("Backup counts are invalid")
        if any(type(value) is not int or value < 0 for value in manifest["counts"].values()):
            raise OperationsError("Backup counts are invalid")
        snapshot = directory / "intake.sqlite3"
        if self._hash(snapshot) != manifest["sha256"] or self.operations.verify(snapshot) != manifest["counts"]:
            raise OperationsError("Backup verification failed")
        return created, manifest["counts"]

    def monitor(self, *, max_age_seconds: int = 28800, min_free_bytes: int = 268435456,
                now: datetime | None = None) -> dict:
        instant = now or datetime.now(timezone.utc)
        if instant.tzinfo is None or max_age_seconds < 1 or min_free_bytes < 1:
            raise OperationsError("Explicit monitoring limits are required")
        # Missing/corrupt/newer incomplete snapshots are never silently replaced by an older success.
        with self._lock():
            try:
                counts = self.operations.verify(self.database)
            except OperationsError:
                return {"ok": False, "error": "storage_unavailable"}
            if any(shutil.disk_usage(path).free < min_free_bytes for path in (self.database.parent, self.root)):
                return {"ok": False, "error": "disk_low"}
            directories = sorted(path for path in self.root.iterdir() if _NAME.fullmatch(path.name))
            if not directories:
                return {"ok": False, "error": "backup_missing"}
            try:
                created, _ = self._verify(directories[-1], now=instant)
            except (OperationsError, ValueError, TypeError, OSError):
                return {"ok": False, "error": "backup_invalid"}
            age = max(0, int((instant - created).total_seconds()))
            if age > max_age_seconds:
                return {"ok": False, "error": "backup_stale", "backup_age_seconds": age}
            return {"ok": True, "operation": "monitor", "backup_age_seconds": age, "counts": counts}


class _Parser(argparse.ArgumentParser):
    def error(self, message):
        self.print_usage(sys.stderr)
        self.exit(2, "Invalid maintenance arguments\n")


def main(argv: list[str] | None = None) -> int:
    parser = _Parser(description="Private backup and functional checks")
    parser.add_argument("operation", choices=("backup", "monitor"))
    parser.add_argument("--root", required=True, type=Path)
    parser.add_argument("--max-age-seconds", type=int, default=28800)
    parser.add_argument("--min-free-bytes", type=int, default=268435456)
    args = parser.parse_args(argv)
    try:
        maintenance = Maintenance(Settings.from_env(), args.root)
        result = maintenance.backup() if args.operation == "backup" else maintenance.monitor(
            max_age_seconds=args.max_age_seconds, min_free_bytes=args.min_free_bytes)
    except (OperationsError, OSError, ValueError, TypeError):
        result = {"ok": False, "error": "maintenance_failed"}
    print(json.dumps(result, sort_keys=True))
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
