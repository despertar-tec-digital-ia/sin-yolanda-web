"""Private, local-only storage maintenance with aggregate-only output."""

from __future__ import annotations

import argparse
from contextlib import closing, contextmanager
import hmac
import json
import os
from pathlib import Path
import sqlite3
import stat
import sys

from cryptography.fernet import InvalidToken

from .settings import Settings
from .storage import StorageError, Store, _KEY_CHECK


class OperationsError(Exception):
    """A fixed operational error without paths, keys or personal data."""


_COLUMNS = {
    "storage_meta": ("name", "encrypted_value"),
    "registrations": ("receipt_id", "email_branch_index", "encrypted_payload"),
    "submissions": ("idempotency_index", "payload_fingerprint", "receipt_id", "encrypted_payload"),
    "outbox": ("job_id", "receipt_id", "status", "attempts", "available_at", "lease_until",
               "lease_token", "error_code", "encrypted_contact_id"),
    "rate_events": ("bucket_index", "occurred_at", "expires_at"),
}


def _path(value: Path) -> Path:
    try:
        path = Path(value)
        if not path.is_absolute() or ".." in path.parts or "\x00" in str(path):
            raise OperationsError("An absolute, non-traversing path is required")
        return path
    except (TypeError, ValueError, OSError):
        raise OperationsError("Invalid operational path") from None


def _directory_chain(path: Path) -> None:
    """Reject symbolic links before opening or creating any database file."""
    try:
        for parent in (path, *path.parents):
            if not stat.S_ISDIR(parent.lstat().st_mode):
                raise OperationsError("Directories must be existing directories without symbolic links")
    except OSError:
        raise OperationsError("Operational directory is unavailable") from None


def _private_file(path: Path) -> None:
    _directory_chain(path.parent)
    try:
        if stat.S_IMODE(path.parent.stat().st_mode) != 0o700:
            raise OperationsError("Storage requires a private directory")
        for item in (path, *(Path(str(path) + suffix) for suffix in ("-wal", "-shm", "-journal"))):
            try:
                info = item.lstat()
            except FileNotFoundError:
                if item == path:
                    raise OperationsError("Storage file is unavailable") from None
                continue
            if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1:
                raise OperationsError("Storage files must be regular files without links")
            if stat.S_IMODE(info.st_mode) != 0o600:
                raise OperationsError("Storage requires private files")
    except OSError:
        raise OperationsError("Storage file is unavailable") from None


@contextmanager
def _read(path: Path):
    """Read a consistent transaction; never initialize, prune or claim work."""
    _private_file(path)
    try:
        with closing(sqlite3.connect(path.as_uri() + "?mode=ro", uri=True,
                                     isolation_level=None, timeout=10)) as connection:
            connection.row_factory = sqlite3.Row
            connection.execute("PRAGMA query_only=ON")
            connection.execute("PRAGMA busy_timeout=10000")
            connection.execute("BEGIN")
            yield connection
    except sqlite3.Error:
        raise OperationsError("Storage could not be read") from None


class Operations:
    """Operate only on encrypted storage, never on a remote service or plaintext export."""

    def __init__(self, settings: Settings):
        try:
            settings.validate()
            self._database = _path(settings.database_path)
            self._store = Store(self._database, settings.encryption_key)
        except (ValueError, StorageError):
            raise OperationsError("Explicit valid storage configuration is required") from None

    def _check(self, connection: sqlite3.Connection, *, full: bool) -> dict[str, int]:
        """Authenticate the key and schema; return only aggregate counts."""
        try:
            objects = connection.execute("SELECT type, name FROM sqlite_master WHERE type IN ('table','view','trigger')").fetchall()
            if {(row["type"], row["name"]) for row in objects} != {("table", name) for name in _COLUMNS}:
                raise OperationsError("Storage schema is incompatible")
            for table, columns in _COLUMNS.items():
                if tuple(row["name"] for row in connection.execute(f"PRAGMA table_info({table})")) != columns:
                    raise OperationsError("Storage schema is incompatible")
            marker = connection.execute("SELECT encrypted_value FROM storage_meta WHERE name='key_check'").fetchone()
            if marker is None or self._store._fernet.decrypt(marker[0]) != _KEY_CHECK:
                raise OperationsError("Storage encryption verification failed")
            counts = {"registrations": connection.execute("SELECT COUNT(*) FROM registrations").fetchone()[0],
                      "submissions": connection.execute("SELECT COUNT(*) FROM submissions").fetchone()[0],
                      "pending": 0, "processing": 0, "synced": 0, "review": 0}
            for row in connection.execute("SELECT status, COUNT(*) AS total FROM outbox GROUP BY status"):
                if row["status"] not in {"pending", "processing", "synced", "review"}:
                    raise OperationsError("Storage consistency verification failed")
                counts[row["status"]] = row["total"]
            if not full:
                return counts
            if [tuple(row) for row in connection.execute("PRAGMA integrity_check")] != [("ok",)]:
                raise OperationsError("Storage integrity verification failed")
            if connection.execute("PRAGMA foreign_key_check").fetchone() is not None:
                raise OperationsError("Storage consistency verification failed")
            if connection.execute("""SELECT 1 FROM registrations r LEFT JOIN outbox o ON o.receipt_id=r.receipt_id
                    GROUP BY r.receipt_id HAVING COUNT(o.job_id)!=1 LIMIT 1""").fetchone() is not None:
                raise OperationsError("Storage consistency verification failed")
            if connection.execute("""SELECT 1 FROM registrations r WHERE NOT EXISTS
                    (SELECT 1 FROM submissions s WHERE s.receipt_id=r.receipt_id) LIMIT 1""").fetchone() is not None:
                raise OperationsError("Storage consistency verification failed")
            for table, index_name in (("registrations", "email_branch_index"), ("submissions", "payload_fingerprint")):
                for row in connection.execute(f"SELECT encrypted_payload, {index_name} FROM {table}"):
                    payload = json.loads(self._store._fernet.decrypt(row["encrypted_payload"]))
                    if not isinstance(payload, dict) or not isinstance(payload.pop("received_at", None), str):
                        raise OperationsError("Encrypted storage verification failed")
                    encoded, identity = self._store._payload(payload)
                    expected = identity if table == "registrations" else self._store._index(b"payload", encoded)
                    if not hmac.compare_digest(row[index_name], expected):
                        raise OperationsError("Encrypted storage verification failed")
            for row in connection.execute("SELECT encrypted_contact_id FROM outbox WHERE encrypted_contact_id IS NOT NULL"):
                contact = self._store._fernet.decrypt(row[0]).decode("utf-8")
                if not contact or len(contact) > 256:
                    raise OperationsError("Encrypted storage verification failed")
            return counts
        except (InvalidToken, ValueError, TypeError, UnicodeError, StorageError, sqlite3.Error):
            raise OperationsError("Encrypted storage verification failed") from None

    def status(self) -> dict[str, int]:
        """Return counts only; do not retrieve registrations or provider identifiers."""
        with _read(self._database) as connection:
            return self._check(connection, full=False)

    def verify(self, snapshot: Path) -> dict[str, int]:
        """Verify an existing snapshot read-only using the explicitly configured key."""
        with _read(_path(snapshot)) as connection:
            return self._check(connection, full=True)

    def _snapshot(self, source: Path, destination_dir: Path) -> dict[str, int]:
        """Create an exclusive private directory and a consistent encrypted database."""
        destination = _path(destination_dir)
        _directory_chain(destination.parent)
        target = destination / "intake.sqlite3"
        with _read(source) as connection:
            self._check(connection, full=True)
            try:
                # Never reuse an existing directory, including an empty one.
                destination.mkdir(mode=0o700)
                destination.chmod(0o700)
                descriptor = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
                try:
                    os.fchmod(descriptor, 0o600)
                finally:
                    os.close(descriptor)
                with closing(sqlite3.connect(target, isolation_level=None)) as copy:
                    connection.backup(copy)
                    copy.execute("PRAGMA synchronous=FULL")
                    # A portable snapshot is one database file, without a WAL dependency.
                    copy.execute("PRAGMA journal_mode=DELETE")
                    copy.row_factory = sqlite3.Row
                    counts = self._check(copy, full=True)
                _private_file(target)
                return counts
            except (OSError, sqlite3.Error):
                raise OperationsError("Snapshot requires a new private destination and successful verification") from None

    def backup(self, destination_dir: Path) -> dict[str, int]:
        """Snapshot the active store without modifying registrations, rates or jobs."""
        return self._snapshot(self._database, destination_dir)

    def restore(self, snapshot: Path, destination_dir: Path) -> dict[str, int]:
        """Recover into a new directory; never replace or initialize the active store."""
        return self._snapshot(_path(snapshot), destination_dir)


class _Parser(argparse.ArgumentParser):
    def error(self, message):
        # argparse's usual error may echo a path or a mistakenly supplied secret.
        self.print_usage(sys.stderr)
        self.exit(2, "Invalid operation arguments\n")


def main(argv: list[str] | None = None) -> int:
    """Run private maintenance from Settings environment; emit aggregate JSON only."""
    parser = _Parser(description="Private encrypted storage maintenance")
    commands = parser.add_subparsers(dest="command", required=True, parser_class=_Parser)
    commands.add_parser("status")
    backup = commands.add_parser("backup")
    backup.add_argument("--destination-dir", required=True, type=Path)
    verify = commands.add_parser("verify")
    verify.add_argument("--snapshot", required=True, type=Path)
    restore = commands.add_parser("restore")
    restore.add_argument("--snapshot", required=True, type=Path)
    restore.add_argument("--destination-dir", required=True, type=Path)
    args = parser.parse_args(argv)
    try:
        operations = Operations(Settings.from_env())
        if args.command == "status":
            counts = operations.status()
        elif args.command == "backup":
            counts = operations.backup(args.destination_dir)
        elif args.command == "verify":
            counts = operations.verify(args.snapshot)
        else:
            counts = operations.restore(args.snapshot, args.destination_dir)
    except (OperationsError, ValueError, StorageError, OSError):
        print('{"ok":false,"error":"operation_failed"}', file=sys.stderr)
        return 1
    print(json.dumps({"ok": True, "operation": args.command, "counts": counts}, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
