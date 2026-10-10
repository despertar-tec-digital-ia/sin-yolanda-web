"""Encrypted, transactional intake storage and a durable single-purpose outbox."""

from __future__ import annotations

import base64
from contextlib import closing, contextmanager
from dataclasses import dataclass, field
from datetime import datetime, timezone
import hmac
import json
import math
import os
from pathlib import Path
import sqlite3
import stat
import time
import uuid

from cryptography.fernet import Fernet, InvalidToken


class StorageError(Exception):
    """Storage failure with a fixed, nonpersonal message."""


class IdempotencyConflict(StorageError):
    """The same submission key was reused for a different normalized payload."""


@dataclass(frozen=True)
class Receipt:
    receipt_id: str
    status: str = "received"
    sync_status: str = "pending"


@dataclass(frozen=True)
class OutboxJob:
    job_id: str
    receipt_id: str
    payload: dict = field(repr=False)
    attempts: int
    lease_token: str


_KEY_CHECK = b"sy-intake-storage-key-v1"
_ERROR_CODES = frozenset({"sync_disabled", "transient_error", "review_required",
                          "sync_error", "max_attempts_exceeded", "lease_expired"})
_SCHEMA = """
CREATE TABLE IF NOT EXISTS storage_meta (
  name TEXT PRIMARY KEY, encrypted_value BLOB NOT NULL
);
CREATE TABLE IF NOT EXISTS registrations (
  receipt_id TEXT PRIMARY KEY,
  email_branch_index BLOB NOT NULL UNIQUE,
  encrypted_payload BLOB NOT NULL
);
CREATE TABLE IF NOT EXISTS submissions (
  idempotency_index BLOB PRIMARY KEY,
  payload_fingerprint BLOB NOT NULL,
  receipt_id TEXT NOT NULL REFERENCES registrations(receipt_id),
  encrypted_payload BLOB NOT NULL
);
CREATE TABLE IF NOT EXISTS outbox (
  job_id TEXT PRIMARY KEY,
  receipt_id TEXT NOT NULL UNIQUE REFERENCES registrations(receipt_id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','synced','review')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 8),
  available_at REAL NOT NULL DEFAULT 0,
  lease_until REAL,
  lease_token TEXT,
  error_code TEXT,
  encrypted_contact_id BLOB
);
CREATE INDEX IF NOT EXISTS outbox_ready ON outbox(status, available_at, lease_until);
CREATE TABLE IF NOT EXISTS rate_events (
  bucket_index BLOB NOT NULL,
  occurred_at REAL NOT NULL,
  expires_at REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS rate_bucket ON rate_events(bucket_index, occurred_at);
CREATE INDEX IF NOT EXISTS rate_expiry ON rate_events(expires_at);
"""


class Store:
    """Keep PII encrypted; commit receipt, submission and outbox before success."""

    max_attempts = 8

    def __init__(self, db_path: Path, encryption_key: str):
        self.db_path = Path(db_path).absolute()
        try:
            encoded = encryption_key.encode("ascii")
            self._fernet = Fernet(encoded)
            raw_key = base64.urlsafe_b64decode(encoded)
            self._index_key = hmac.digest(raw_key, b"sy-intake-index-key-v1", "sha256")
        except (ValueError, TypeError, AttributeError, UnicodeError):
            raise StorageError("Invalid storage encryption configuration") from None

    def _index(self, context: bytes, value: bytes) -> bytes:
        return hmac.digest(self._index_key, context + b"\x00" + value, "sha256")

    def _secure_files(self) -> None:
        for path in [self.db_path, *(Path(str(self.db_path) + suffix) for suffix in ("-wal", "-shm", "-journal"))]:
            try:
                mode = path.lstat().st_mode
            except FileNotFoundError:
                continue
            except OSError:
                raise StorageError("Intake storage is unavailable") from None
            if stat.S_ISLNK(mode):
                raise StorageError("Storage files must not be symbolic links")
            if not stat.S_ISREG(mode):
                raise StorageError("Storage files must be regular files")
            try:
                path.chmod(0o600)
            except FileNotFoundError:
                # SQLite removes WAL/SHM when the last concurrent connection closes.
                if path == self.db_path:
                    raise StorageError("Intake storage is unavailable") from None
            except OSError:
                raise StorageError("Intake storage is unavailable") from None

    @contextmanager
    def _connection(self):
        connection = None
        try:
            self._secure_files()
            connection = sqlite3.connect(self.db_path, timeout=10, isolation_level=None)
            connection.row_factory = sqlite3.Row
            connection.execute("PRAGMA foreign_keys=ON")
            connection.execute("PRAGMA busy_timeout=10000")
            connection.execute("PRAGMA synchronous=FULL")
            yield connection
        except (sqlite3.Error, OSError):
            raise StorageError("Intake storage is unavailable") from None
        finally:
            if connection is not None:
                connection.close()
            self._secure_files()

    @contextmanager
    def _transaction(self):
        with self._connection() as connection:
            connection.execute("BEGIN IMMEDIATE")
            try:
                yield connection
                connection.commit()
            except BaseException:
                connection.rollback()
                raise

    def initialize(self) -> None:
        """Initialize private storage; reject a different encryption key on restart."""
        parent = self.db_path.parent
        if parent in {Path("/"), Path.home(), Path.cwd(), Path("/tmp")}:
            raise StorageError("Use a dedicated private storage directory")
        for path in [parent, *parent.parents]:
            if path.is_symlink():
                raise StorageError("Storage directory must not contain symbolic links")
        try:
            parent.mkdir(mode=0o700, parents=True, exist_ok=True)
            parent.chmod(0o700)
            if not self.db_path.exists():
                try:
                    descriptor = os.open(self.db_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
                except FileExistsError:
                    # Another process may have created the same private DB first.
                    pass
                else:
                    os.close(descriptor)
        except OSError:
            raise StorageError("Intake storage is unavailable") from None
        with self._connection() as connection:
            connection.execute("PRAGMA journal_mode=WAL")
            connection.executescript(_SCHEMA)
        with self._transaction() as connection:
            row = connection.execute("SELECT encrypted_value FROM storage_meta WHERE name='key_check'").fetchone()
            if row is None:
                connection.execute("INSERT INTO storage_meta VALUES ('key_check', ?)", (self._fernet.encrypt(_KEY_CHECK),))
            else:
                try:
                    valid = self._fernet.decrypt(row[0]) == _KEY_CHECK
                except InvalidToken:
                    valid = False
                if not valid:
                    raise StorageError("Storage encryption key does not match") from None

    def _payload(self, payload: dict) -> tuple[bytes, bytes]:
        try:
            if not isinstance(payload, dict) or not isinstance(payload.get("email"), str):
                raise ValueError
            if not payload["email"].strip() or payload.get("branch") != "el-paso" or "received_at" in payload:
                raise ValueError
            encoded = json.dumps(payload, sort_keys=True, separators=(",", ":"),
                                 ensure_ascii=False, allow_nan=False).encode("utf-8")
            identity = (payload["email"].strip().lower() + "\x00" + payload["branch"]).encode("utf-8")
        except (ValueError, TypeError, UnicodeError):
            raise StorageError("Invalid normalized registration payload") from None
        return encoded, self._index(b"email-branch", identity)

    def _submission_index(self, key: str) -> bytes:
        if not isinstance(key, str) or not key or len(key) > 200:
            raise StorageError("Invalid submission key")
        try:
            return self._index(b"submission-key", key.encode("utf-8"))
        except UnicodeError:
            raise StorageError("Invalid submission key") from None

    @staticmethod
    def _receipt(row: sqlite3.Row) -> Receipt:
        sync_status = row["status"] if row["status"] in {"synced", "review"} else "pending"
        return Receipt(row["receipt_id"], sync_status=sync_status)

    def _replay(self, connection, key_index: bytes, fingerprint: bytes) -> Receipt | None:
        row = connection.execute("""SELECT s.payload_fingerprint, s.receipt_id, o.status
            FROM submissions s JOIN outbox o ON o.receipt_id=s.receipt_id WHERE s.idempotency_index=?""",
            (key_index,)).fetchone()
        if row is None:
            return None
        if not hmac.compare_digest(row["payload_fingerprint"], fingerprint):
            raise IdempotencyConflict("Submission key was already used for different data")
        return self._receipt(row)

    def replay(self, idempotency_key: str, payload: dict) -> Receipt | None:
        """Return a committed receipt only when the original payload also matches."""
        encoded, _ = self._payload(payload)
        with self._connection() as connection:
            return self._replay(connection, self._submission_index(idempotency_key), self._index(b"payload", encoded))

    def save(self, idempotency_key: str, payload: dict) -> Receipt:
        """Append an encrypted submission without replacing the first registration."""
        encoded, identity_index = self._payload(payload)
        key_index = self._submission_index(idempotency_key)
        fingerprint = self._index(b"payload", encoded)
        recorded = json.loads(encoded)
        recorded["received_at"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        encrypted = self._fernet.encrypt(json.dumps(recorded, sort_keys=True, ensure_ascii=False).encode("utf-8"))
        with self._transaction() as connection:
            existing = self._replay(connection, key_index, fingerprint)
            if existing:
                return existing
            row = connection.execute("SELECT receipt_id FROM registrations WHERE email_branch_index=?", (identity_index,)).fetchone()
            if row:
                receipt_id = row["receipt_id"]
            else:
                receipt_id = str(uuid.uuid4())
                connection.execute("INSERT INTO registrations VALUES (?, ?, ?)", (receipt_id, identity_index, encrypted))
                connection.execute("INSERT INTO outbox (job_id, receipt_id) VALUES (?, ?)", (str(uuid.uuid4()), receipt_id))
            connection.execute("INSERT INTO submissions VALUES (?, ?, ?, ?)", (key_index, fingerprint, receipt_id, encrypted))
            row = connection.execute("SELECT receipt_id, status FROM outbox WHERE receipt_id=?", (receipt_id,)).fetchone()
            receipt = self._receipt(row)
        return receipt

    @staticmethod
    def _now(now_ts: float | None) -> float:
        now = time.time() if now_ts is None else now_ts
        if not isinstance(now, (int, float)) or not math.isfinite(now):
            raise StorageError("Invalid storage clock")
        return float(now)

    def claim(self, now_ts: float | None = None, lease_seconds: int = 60) -> OutboxJob | None:
        """Atomically claim a due job, or reclaim one abandoned by another worker."""
        now = self._now(now_ts)
        if not isinstance(lease_seconds, int) or not 1 <= lease_seconds <= 3600:
            raise StorageError("Invalid lease duration")
        with self._transaction() as connection:
            eligible = "((status='pending' AND available_at<=?) OR (status='processing' AND lease_until<=?))"
            connection.execute(f"""UPDATE outbox SET status='review', error_code='max_attempts_exceeded',
                lease_token=NULL, lease_until=NULL WHERE attempts>=8 AND {eligible}""", (now, now))
            row = connection.execute(f"""SELECT o.*, r.encrypted_payload FROM outbox o
                JOIN registrations r ON r.receipt_id=o.receipt_id WHERE attempts<8 AND {eligible}
                ORDER BY available_at, job_id LIMIT 1""", (now, now)).fetchone()
            if row is None:
                return None
            try:
                payload = json.loads(self._fernet.decrypt(row["encrypted_payload"]))
            except (InvalidToken, ValueError, TypeError):
                raise StorageError("Encrypted registration could not be read") from None
            token = str(uuid.uuid4())
            connection.execute("""UPDATE outbox SET status='processing', attempts=attempts+1,
                lease_token=?, lease_until=? WHERE job_id=?""", (token, now + lease_seconds, row["job_id"]))
            return OutboxJob(row["job_id"], row["receipt_id"], payload, row["attempts"] + 1, token)

    def mark_synced(self, job_id: str, lease_token: str, contact_id: str) -> bool:
        """Acknowledge only the current lease; encrypt the provider identifier."""
        if not isinstance(contact_id, str) or not contact_id or len(contact_id) > 256:
            raise StorageError("Invalid synchronization result")
        encrypted = self._fernet.encrypt(contact_id.encode("utf-8"))
        with self._transaction() as connection:
            return connection.execute("""UPDATE outbox SET status='synced', encrypted_contact_id=?,
                lease_token=NULL, lease_until=NULL, error_code=NULL WHERE job_id=? AND lease_token=? AND status='processing'""",
                (encrypted, job_id, lease_token)).rowcount == 1

    @staticmethod
    def _error_code(value: str) -> str:
        return value if isinstance(value, str) and value in _ERROR_CODES else "sync_error"

    def retry(self, job_id: str, lease_token: str, error_code: str, now_ts: float | None = None) -> bool:
        """Retry with bounded exponential backoff; stop after eight claims."""
        now = self._now(now_ts)
        with self._transaction() as connection:
            row = connection.execute("SELECT attempts FROM outbox WHERE job_id=? AND lease_token=? AND status='processing'", (job_id, lease_token)).fetchone()
            if row is None:
                return False
            final = row["attempts"] >= self.max_attempts
            connection.execute("""UPDATE outbox SET status=?, available_at=?, error_code=?,
                lease_token=NULL, lease_until=NULL WHERE job_id=?""", ("review" if final else "pending",
                now + min(3600, 5 * 2 ** (row["attempts"] - 1)),
                "max_attempts_exceeded" if final else self._error_code(error_code), job_id))
            return True

    def mark_review(self, job_id: str, lease_token: str, error_code: str) -> bool:
        """Move an ambiguous job to review without saving raw provider errors."""
        with self._transaction() as connection:
            return connection.execute("""UPDATE outbox SET status='review', error_code=?, lease_token=NULL,
                lease_until=NULL WHERE job_id=? AND lease_token=? AND status='processing'""",
                (self._error_code(error_code), job_id, lease_token)).rowcount == 1

    def allow_rate(self, bucket_key: str, limit: int, window_seconds: int, now_ts: float | None = None) -> bool:
        """Share a sliding-window limiter across processes without storing raw keys."""
        now = self._now(now_ts)
        if not isinstance(bucket_key, str) or not bucket_key or len(bucket_key) > 1000:
            raise StorageError("Invalid rate bucket")
        if not isinstance(limit, int) or not 1 <= limit <= 100000 or not isinstance(window_seconds, int) or not 1 <= window_seconds <= 86400:
            raise StorageError("Invalid rate policy")
        try:
            bucket = self._index(b"rate-bucket", bucket_key.encode("utf-8"))
        except UnicodeError:
            raise StorageError("Invalid rate bucket") from None
        with self._transaction() as connection:
            connection.execute("DELETE FROM rate_events WHERE expires_at<=?", (now,))
            count = connection.execute("SELECT COUNT(*) FROM rate_events WHERE bucket_index=? AND occurred_at>?", (bucket, now - window_seconds)).fetchone()[0]
            if count >= limit:
                return False
            connection.execute("INSERT INTO rate_events VALUES (?, ?, ?)", (bucket, now, now + window_seconds))
            return True

    def backup(self, destination: Path) -> None:
        """Create an exclusive, consistent SQLite snapshot outside the live files."""
        target = Path(destination).absolute()
        if target == self.db_path or target.exists() or target.is_symlink():
            raise StorageError("Backup destination must be a fresh file")
        if target.parent in {Path("/"), Path.home(), Path.cwd(), Path("/tmp")}:
            raise StorageError("Use a dedicated private backup directory")
        for path in [target.parent, *target.parent.parents]:
            if path.is_symlink():
                raise StorageError("Backup directory must not contain symbolic links")
        try:
            target.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
            target.parent.chmod(0o700)
            descriptor = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            os.close(descriptor)
            with self._connection() as source, closing(sqlite3.connect(target)) as snapshot:
                source.backup(snapshot)
                if snapshot.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
                    raise StorageError("Backup integrity check failed")
            target.chmod(0o600)
        except (sqlite3.Error, OSError):
            raise StorageError("Intake backup is unavailable") from None
