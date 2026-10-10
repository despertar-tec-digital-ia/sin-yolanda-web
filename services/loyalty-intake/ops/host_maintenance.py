"""Root-only scheduler bridge. Fixed container, no credentials or personal-data output."""
import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import stat
import subprocess
import tempfile

CONTAINER = "sinyolanda-loyalty-intake-production-intake-1"
STATE_DIRECTORY = Path("/var/lib/sinyolanda-loyalty-intake")
COUNT_NAMES = {"registrations", "submissions", "pending", "processing", "synced", "review"}
ERROR_NAMES = {"storage_unavailable", "disk_low", "backup_missing", "backup_invalid",
               "backup_stale", "maintenance_failed"}


def sanitize(completed, operation):
    result = {"ok": False, "operation": operation, "error": "maintenance_failed"}
    if len(completed.stdout) > 8192 or completed.stderr:
        return result
    try:
        payload = json.loads(completed.stdout)
        if not isinstance(payload, dict) or type(payload.get("ok")) is not bool:
            return result
        if not payload["ok"]:
            if payload.get("error") in ERROR_NAMES:
                result["error"] = payload["error"]
            return result
        if completed.returncode or payload.get("operation") != operation:
            return result
        counts = payload.get("counts")
        if not isinstance(counts, dict) or not counts or set(counts) - COUNT_NAMES:
            return result
        if any(type(value) is not int or value < 0 for value in counts.values()):
            return result
        result = {"ok": True, "operation": operation, "counts": counts}
        age = payload.get("backup_age_seconds")
        if type(age) is int and age >= 0:
            result["backup_age_seconds"] = age
        return result
    except (ValueError, TypeError):
        return result


def save_state(directory, operation, result):
    # Provisioning owns the directory. Never create/fix permissions on unknown targets.
    for path in [directory, *directory.parents]:
        metadata = path.lstat()
        if not stat.S_ISDIR(metadata.st_mode) or metadata.st_uid not in {0, os.geteuid()}:
            raise ValueError("private_state_unavailable")
    if directory.stat().st_uid != os.geteuid() or stat.S_IMODE(directory.stat().st_mode) != 0o700:
        raise ValueError("private_state_unavailable")
    target = directory / f"{operation}.json"
    if target.exists() or target.is_symlink():
        metadata = target.lstat()
        if not stat.S_ISREG(metadata.st_mode) or metadata.st_nlink != 1 or metadata.st_uid != os.geteuid() or stat.S_IMODE(metadata.st_mode) != 0o600:
            raise ValueError("private_state_unavailable")
    descriptor, temporary = tempfile.mkstemp(prefix=".maintenance-", dir=directory)
    try:
        with os.fdopen(descriptor, "w") as handle:
            json.dump({**result, "checked_at": datetime.now(timezone.utc).isoformat()}, handle, sort_keys=True)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, target)
        descriptor = os.open(directory, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
        try:
            os.fsync(descriptor)
        finally:
            os.close(descriptor)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def main(argv=None):
    parser = argparse.ArgumentParser()
    parser.add_argument("operation", choices=("backup", "monitor"))
    operation = parser.parse_args(argv).operation
    if os.geteuid() != 0:
        print("maintenance_failed")
        return 1
    command = ["/usr/bin/docker", "exec", CONTAINER, "python", "-m", "sy_intake.maintenance",
               operation, "--root", "/backups/scheduled"]
    try:
        completed = subprocess.run(command, capture_output=True, timeout=120, check=False)
        result = sanitize(completed, operation)
    except (OSError, subprocess.TimeoutExpired):
        result = {"ok": False, "operation": operation, "error": "maintenance_failed"}
    try:
        save_state(STATE_DIRECTORY, operation, result)
    except (OSError, ValueError):
        print("maintenance_failed")
        return 1
    # systemd journals get a fixed code only; aggregates stay in root-only state files.
    print("maintenance_ok" if result["ok"] else "maintenance_failed")
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
