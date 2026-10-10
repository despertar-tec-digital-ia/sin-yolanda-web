"""Local persistence tests; all personal data and keys below are synthetic."""

from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor
from dataclasses import asdict
from pathlib import Path
import sqlite3
import stat

from cryptography.fernet import Fernet
import pytest

from sy_intake.storage import IdempotencyConflict, StorageError, Store


@pytest.fixture
def payload():
    return {"full_name": "Synthetic Guest Alpha", "email": "alpha@example.test",
            "phone": "+12025550123", "birthday_day_month": "09/10", "locale": "es",
            "branch": "el-paso", "registration_consent": True, "email_marketing_consent": False,
            "consent_version": "sy-el-paso-registration-v2-2026-10-09",
            "source": {"utm_source": "qr", "utm_medium": "offline", "utm_campaign": "loyalty_el_paso", "utm_content": "registro_v2"}}


@pytest.fixture
def key():
    return Fernet.generate_key().decode("ascii")


@pytest.fixture
def store(tmp_path, key):
    result = Store(tmp_path / "private" / "intake.sqlite3", key)
    result.initialize()
    return result


def counts(store):
    with sqlite3.connect(store.db_path) as connection:
        return {table: connection.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
                for table in ("registrations", "submissions", "outbox")}


def row(store, table):
    with sqlite3.connect(store.db_path) as connection:
        connection.row_factory = sqlite3.Row
        return dict(connection.execute(f"SELECT * FROM {table}").fetchone())


def test_received_restart_replay_and_actual_pragmas(store, key, payload):
    receipt = store.save("request-a", payload)
    assert asdict(receipt) == {"receipt_id": receipt.receipt_id, "status": "received", "sync_status": "pending"}
    restarted = Store(store.db_path, key)
    restarted.initialize()
    assert restarted.replay("request-a", dict(reversed(list(payload.items())))) == receipt
    assert restarted.save("request-a", payload) == receipt
    assert counts(store) == {"registrations": 1, "submissions": 1, "outbox": 1}
    with store._connection() as connection:
        assert connection.execute("PRAGMA journal_mode").fetchone()[0] == "wal"
        assert connection.execute("PRAGMA synchronous").fetchone()[0] == 2
        assert connection.execute("PRAGMA busy_timeout").fetchone()[0] == 10000
    job = restarted.claim(now_ts=100)
    assert job.payload.pop("received_at").endswith("Z")
    assert job.payload == payload


def test_all_personal_data_identifiers_and_buckets_are_encrypted(store, key, payload):
    receipt = store.save("idempotency-" + payload["email"], payload)
    job = store.claim(now_ts=100)
    contact = "synthetic-ghl-contact-sensitive"
    assert store.mark_synced(job.job_id, job.lease_token, contact)
    assert store.allow_rate("ip-sensitive-192.0.2.1", 2, 60, now_ts=100)
    record = row(store, "registrations")
    decoded = Fernet(key.encode()).decrypt(record["encrypted_payload"])
    assert payload["email"].encode() in decoded
    assert Fernet(key.encode()).decrypt(row(store, "outbox")["encrypted_contact_id"]).decode() == contact
    for file in store.db_path.parent.iterdir():
        contents = file.read_bytes()
        for sensitive in (payload["email"], payload["phone"], payload["full_name"], contact, "ip-sensitive-192.0.2.1"):
            assert sensitive.encode() not in contents
        assert stat.S_IMODE(file.stat().st_mode) == 0o600
    assert stat.S_IMODE(store.db_path.parent.stat().st_mode) == 0o700
    assert store.replay("idempotency-" + payload["email"], payload).sync_status == "synced"
    assert receipt.receipt_id == job.receipt_id


def test_email_branch_dedupe_keeps_first_data_and_appends_audit(store, key, payload):
    first = store.save("first-key", payload)
    second_payload = {**payload, "full_name": "Synthetic Changed Name", "locale": "en",
                      "email_marketing_consent": True, "birthday_day_month": None}
    second = store.save("second-key", second_payload)
    assert first == second
    assert counts(store) == {"registrations": 1, "submissions": 2, "outbox": 1}
    job = store.claim(now_ts=100)
    assert job.payload["full_name"] == payload["full_name"]
    assert job.payload["email_marketing_consent"] is False
    with sqlite3.connect(store.db_path) as connection:
        audit = [Fernet(key.encode()).decrypt(r[0]) for r in connection.execute("SELECT encrypted_payload FROM submissions")]
    assert any(second_payload["full_name"].encode() in item for item in audit)
    assert store.replay("second-key", second_payload) == second


def test_phone_does_not_merge_people_and_email_index_is_normalized(store, payload):
    first = store.save("key-a", payload)
    assert store.save("key-uppercase", {**payload, "email": "ALPHA@EXAMPLE.TEST"}).receipt_id == first.receipt_id
    other = store.save("key-b", {**payload, "email": "other@example.test"})
    assert other.receipt_id != first.receipt_id
    assert counts(store) == {"registrations": 2, "submissions": 3, "outbox": 2}


def test_conflict_has_no_personal_details_and_does_not_write(store, payload):
    store.save("same-key", payload)
    changed = {**payload, "email": "changed@example.test"}
    for operation in (store.replay, store.save):
        with pytest.raises(IdempotencyConflict) as error:
            operation("same-key", changed)
        assert payload["email"] not in str(error.value)
        assert changed["email"] not in str(error.value)
    assert counts(store) == {"registrations": 1, "submissions": 1, "outbox": 1}
    assert store.replay("not-found", payload) is None


def test_partial_write_failure_rolls_back_receipt_submission_and_outbox(store, payload):
    with sqlite3.connect(store.db_path) as connection:
        connection.execute("CREATE TRIGGER reject_submission BEFORE INSERT ON submissions BEGIN SELECT RAISE(ABORT, 'fixture-failure'); END")
    with pytest.raises(StorageError, match="unavailable") as error:
        store.save("request-a", payload)
    assert "fixture-failure" not in str(error.value)
    assert counts(store) == {"registrations": 0, "submissions": 0, "outbox": 0}
    assert store.replay("request-a", payload) is None


def test_leases_survive_restart_and_stale_workers_cannot_ack(store, key, payload):
    store.save("request-a", payload)
    first = store.claim(now_ts=100, lease_seconds=10)
    assert first.attempts == 1
    restarted = Store(store.db_path, key)
    restarted.initialize()
    assert restarted.claim(now_ts=109) is None
    second = restarted.claim(now_ts=110)
    assert second.job_id == first.job_id and second.lease_token != first.lease_token and second.attempts == 2
    assert not store.mark_synced(first.job_id, first.lease_token, "synthetic-old-contact")
    assert not store.retry(first.job_id, first.lease_token, "transient_error", now_ts=111)
    assert not store.mark_review(first.job_id, first.lease_token, "review_required")
    assert restarted.mark_synced(second.job_id, second.lease_token, "synthetic-contact")
    assert not restarted.mark_synced(second.job_id, second.lease_token, "synthetic-contact")
    assert restarted.claim(now_ts=1000) is None


def test_retry_backoff_is_bounded_and_eighth_attempt_stops(store, payload):
    store.save("request-a", payload)
    now = 100
    for attempt in range(1, 9):
        job = store.claim(now_ts=now)
        assert job.attempts == attempt
        assert store.retry(job.job_id, job.lease_token, "transient_error", now_ts=now)
        if attempt < 8:
            delay = min(3600, 5 * 2 ** (attempt - 1))
            assert store.claim(now_ts=now + delay - 0.1) is None
            now += delay
    assert row(store, "outbox")["status"] == "review"
    assert row(store, "outbox")["error_code"] == "max_attempts_exceeded"
    assert store.claim(now_ts=now + 100000) is None


def test_repeated_worker_crashes_also_stop_after_eight_claims(store, payload):
    store.save("request-a", payload)
    for attempt in range(1, 9):
        assert store.claim(now_ts=100 + attempt, lease_seconds=1).attempts == attempt
    assert store.claim(now_ts=109) is None
    assert row(store, "outbox")["status"] == "review"


def test_review_and_raw_error_sanitization(store, payload):
    store.save("request-a", payload)
    job = store.claim(now_ts=100)
    assert store.mark_review(job.job_id, job.lease_token, payload["email"] + " provider response")
    assert row(store, "outbox")["error_code"] == "sync_error"
    assert store.replay("request-a", payload).sync_status == "review"
    assert store.claim(now_ts=200) is None


def test_parallel_saves_claims_and_rate_limits_are_atomic(store, key, payload):
    stores = [Store(store.db_path, key) for _ in range(12)]
    with ThreadPoolExecutor(max_workers=12) as pool:
        receipts = list(pool.map(lambda pair: pair[1].save("parallel-" + str(pair[0]), payload), enumerate(stores)))
    assert len({receipt.receipt_id for receipt in receipts}) == 1
    assert counts(store) == {"registrations": 1, "submissions": 12, "outbox": 1}
    with ThreadPoolExecutor(max_workers=12) as pool:
        claims = list(pool.map(lambda instance: instance.claim(now_ts=100), stores))
    assert sum(job is not None for job in claims) == 1
    with ThreadPoolExecutor(max_workers=12) as pool:
        allowed = list(pool.map(lambda instance: instance.allow_rate("shared-bucket", 4, 60, now_ts=100), stores))
    assert sum(allowed) == 4


def test_durable_limiter_prunes_and_keeps_buckets_separate(store, key):
    assert store.allow_rate("a", 1, 60, now_ts=100)
    restarted = Store(store.db_path, key)
    assert not restarted.allow_rate("a", 1, 60, now_ts=159)
    assert restarted.allow_rate("b", 1, 60, now_ts=159)
    assert restarted.allow_rate("a", 1, 60, now_ts=160)
    with sqlite3.connect(store.db_path) as connection:
        assert connection.execute("SELECT COUNT(*) FROM rate_events").fetchone()[0] == 2


def process_worker(arguments):
    """Exercise independent interpreter instances without network or shared objects."""
    path, key, payload, number = arguments
    instance = Store(Path(path), key)
    instance.initialize()
    receipt = instance.save("process-" + str(number), payload)
    allowed = instance.allow_rate("process-bucket", 1, 60, now_ts=100)
    job = instance.claim(now_ts=100)
    return receipt.receipt_id, allowed, job.job_id if job else None


def test_two_real_worker_processes_share_dedupe_leases_and_limiter(store, key, payload):
    arguments = [(str(store.db_path), key, payload, number) for number in range(4)]
    with ProcessPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(process_worker, arguments))
    assert len({result[0] for result in results}) == 1
    assert sum(result[1] for result in results) == 1
    assert sum(result[2] is not None for result in results) == 1
    assert counts(store) == {"registrations": 1, "submissions": 4, "outbox": 1}


def test_backup_is_consistent_while_other_connections_write(store, tmp_path, payload):
    store.save("seed", payload)
    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = [pool.submit(store.save, "concurrent-" + str(number),
                               {**payload, "email": f"guest{number}@example.test"}) for number in range(20)]
        target = tmp_path / "concurrent-backup" / "snapshot.sqlite3"
        store.backup(target)
        for future in futures:
            future.result()
    with sqlite3.connect(target) as connection:
        assert connection.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
        assert connection.execute("PRAGMA foreign_key_check").fetchall() == []
        snapshot_counts = [connection.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
                           for table in ("registrations", "submissions", "outbox")]
    assert 1 <= snapshot_counts[0] <= 21
    assert len(set(snapshot_counts)) == 1


def test_backup_restores_pending_lease_audit_and_rate_events(store, tmp_path, key, payload):
    receipt = store.save("request-a", payload)
    store.save("request-b", {**payload, "locale": "en"})
    first = store.claim(now_ts=100, lease_seconds=10)
    store.allow_rate("shared", 1, 60, now_ts=100)
    backup = tmp_path / "restore" / "snapshot.sqlite3"
    store.backup(backup)
    restored = Store(backup, key)
    restored.initialize()
    assert restored.replay("request-a", payload).receipt_id == receipt.receipt_id
    assert counts(restored) == {"registrations": 1, "submissions": 2, "outbox": 1}
    assert restored.claim(now_ts=109) is None
    second = restored.claim(now_ts=110)
    assert second.attempts == 2 and second.lease_token != first.lease_token
    assert not restored.allow_rate("shared", 1, 60, now_ts=110)
    assert stat.S_IMODE(backup.stat().st_mode) == 0o600
    with pytest.raises(StorageError, match="fresh"):
        store.backup(backup)
    with pytest.raises(StorageError, match="fresh"):
        store.backup(store.db_path)


def test_wrong_key_invalid_configuration_symlinks_and_payload_fail_safely(store, tmp_path, payload):
    store.save("request-a", payload)
    with pytest.raises(StorageError, match="does not match"):
        Store(store.db_path, Fernet.generate_key().decode()).initialize()
    with pytest.raises(StorageError, match="configuration"):
        Store(tmp_path / "bad" / "db", "not-a-fernet-key")
    link = tmp_path / "linked"
    link.symlink_to(store.db_path.parent, target_is_directory=True)
    with pytest.raises(StorageError, match="symbolic"):
        Store(link / "db", Fernet.generate_key().decode()).initialize()
    for bad in ({**payload, "branch": "other"}, {**payload, "received_at": "caller-owned"}, {**payload, "email": None}):
        with pytest.raises(StorageError, match="normalized"):
            store.save("invalid", bad)
    assert counts(store) == {"registrations": 1, "submissions": 1, "outbox": 1}
