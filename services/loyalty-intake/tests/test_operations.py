"""Private maintenance tests with generated keys and synthetic data in test temp dirs."""

from concurrent.futures import ThreadPoolExecutor
from dataclasses import replace
import json
from pathlib import Path
import sqlite3
import stat
import subprocess
import sys

from cryptography.fernet import Fernet
import pytest

from sy_intake.operations import Operations, OperationsError, main
from sy_intake.settings import Settings
from sy_intake.storage import Store


@pytest.fixture
def payload():
    return {"full_name": "Synthetic Operations Guest", "email": "operations@example.test",
            "phone": "+12025550124", "birthday_day_month": "09/10", "locale": "es",
            "branch": "el-paso", "registration_consent": True, "email_marketing_consent": False,
            "consent_version": "sy-el-paso-registration-v2-2026-10-09",
            "source": {"utm_source": "qr", "utm_medium": "offline", "utm_campaign": "loyalty_el_paso", "utm_content": "registro_v2"}}


@pytest.fixture
def settings(tmp_path):
    return Settings(database_path=tmp_path / "private" / "intake.sqlite3",
                    encryption_key=Fernet.generate_key().decode(), mode="local-qa",
                    allowed_origins=("http://127.0.0.1:8798",))


@pytest.fixture
def store(settings):
    result = Store(settings.database_path, settings.encryption_key)
    result.initialize()
    return result


def counts(total=0, submissions=None, **states):
    return {"registrations": total, "submissions": total if submissions is None else submissions,
            **{state: states.get(state, 0) for state in ("pending", "processing", "synced", "review")}}


def set_env(monkeypatch, settings):
    monkeypatch.setenv("SY_INTAKE_DATABASE", str(settings.database_path))
    monkeypatch.setenv("SY_INTAKE_ENCRYPTION_KEY", settings.encryption_key)
    monkeypatch.setenv("SY_INTAKE_MODE", "local-qa")
    monkeypatch.setenv("SY_INTAKE_ORIGINS", "http://127.0.0.1:8798")


def test_status_only_aggregates_and_does_not_prune_or_change_jobs(settings, store, payload):
    ops = Operations(settings)
    assert ops.status() == counts()
    for index in range(4):
        store.save(f"request-{index}", {**payload, "email": f"synthetic-{index}@example.test"})
    first = store.claim(now_ts=100)
    assert store.mark_synced(first.job_id, first.lease_token, "synthetic-sensitive-contact")
    second = store.claim(now_ts=100)
    assert store.mark_review(second.job_id, second.lease_token, "review_required")
    third = store.claim(now_ts=100)
    assert store.allow_rate("synthetic-private-bucket", 2, 30, now_ts=1)
    before = settings.database_path.read_bytes()
    assert ops.status() == counts(4, pending=1, processing=1, synced=1, review=1)
    assert settings.database_path.read_bytes() == before
    with sqlite3.connect(settings.database_path) as connection:
        assert connection.execute("SELECT COUNT(*) FROM rate_events").fetchone()[0] == 1
        lease = connection.execute("SELECT lease_token, attempts FROM outbox WHERE job_id=?", (third.job_id,)).fetchone()
        assert lease == (third.lease_token, 1)


def test_backup_encrypted_private_portable_and_correct_key_verifies(tmp_path, settings, store, payload):
    store.save("request-one", payload)
    store.save("request-two", {**payload, "full_name": "Synthetic Second Submission"})
    ops = Operations(settings)
    destination = tmp_path / "snapshot"
    before = settings.database_path.read_bytes()
    assert ops.backup(destination) == counts(1, submissions=2, pending=1)
    snapshot = destination / "intake.sqlite3"
    assert ops.verify(snapshot) == ops.status()
    assert settings.database_path.read_bytes() == before
    assert stat.S_IMODE(destination.stat().st_mode) == 0o700
    assert {file.name for file in destination.iterdir()} == {"intake.sqlite3"}
    assert stat.S_IMODE(snapshot.stat().st_mode) == 0o600
    for sensitive in (settings.encryption_key, payload["full_name"], payload["email"], payload["phone"]):
        assert sensitive.encode() not in snapshot.read_bytes()
    with sqlite3.connect(snapshot) as connection:
        assert connection.execute("PRAGMA journal_mode").fetchone()[0] == "delete"


def test_backup_captures_uncheckpointed_wal_and_concurrent_writes(tmp_path, settings, store, payload):
    ops = Operations(settings)
    # Keep a WAL connection open so successful submissions do not disappear into a last-close checkpoint.
    with sqlite3.connect(store.db_path) as connection:
        connection.execute("PRAGMA wal_autocheckpoint=0")
        connection.execute("SELECT COUNT(*) FROM registrations").fetchone()
        store.save("initial", payload)
        assert Path(str(store.db_path) + "-wal").stat().st_size > 0
        with ThreadPoolExecutor(max_workers=2) as pool:
            def writer():
                for index in range(20):
                    store.save(f"concurrent-{index}", {**payload, "email": f"concurrent-{index}@example.test"})
            writes = pool.submit(writer)
            result = ops.backup(tmp_path / "concurrent-snapshot")
            writes.result()
    assert 1 <= result["registrations"] <= 21
    assert result == counts(result["registrations"], pending=result["registrations"])
    assert ops.verify(tmp_path / "concurrent-snapshot" / "intake.sqlite3") == result
    assert ops.status() == counts(21, pending=21)


def test_restore_new_directory_preserves_snapshot_without_replacing_live_store(tmp_path, settings, store, payload):
    first = store.save("first", payload)
    job = store.claim(now_ts=100, lease_seconds=10)
    assert store.allow_rate("private-bucket", 1, 60, now_ts=100)
    ops = Operations(settings)
    ops.backup(tmp_path / "snapshot")
    snapshot = tmp_path / "snapshot" / "intake.sqlite3"
    snapshot_bytes = snapshot.read_bytes()
    store.save("second", {**payload, "email": "second@example.test"})
    live_bytes = store.db_path.read_bytes()
    destination = tmp_path / "recovered"
    assert ops.restore(snapshot, destination) == counts(1, processing=1)
    assert snapshot.read_bytes() == snapshot_bytes
    assert store.db_path.read_bytes() == live_bytes
    assert ops.status() == counts(2, pending=1, processing=1)
    restored = Store(destination / "intake.sqlite3", settings.encryption_key)
    restored.initialize()
    assert restored.replay("first", payload) == first
    assert restored.claim(now_ts=109) is None
    reclaimed = restored.claim(now_ts=110)
    assert reclaimed.receipt_id == first.receipt_id and reclaimed.lease_token != job.lease_token
    assert not restored.allow_rate("private-bucket", 1, 60, now_ts=110)
    assert stat.S_IMODE(destination.stat().st_mode) == 0o700
    assert all(stat.S_IMODE(file.stat().st_mode) == 0o600 for file in destination.iterdir())


def test_wrong_key_fails_read_and_restore_before_destination_creation(tmp_path, settings, store, payload):
    store.save("first", payload)
    ops = Operations(settings)
    ops.backup(tmp_path / "snapshot")
    wrong = Operations(replace(settings, encryption_key=Fernet.generate_key().decode()))
    snapshot = tmp_path / "snapshot" / "intake.sqlite3"
    before = snapshot.read_bytes()
    for action in (wrong.status, lambda: wrong.verify(snapshot),
                   lambda: wrong.backup(tmp_path / "bad-backup"),
                   lambda: wrong.restore(snapshot, tmp_path / "bad-restore")):
        with pytest.raises(OperationsError) as error:
            action()
        assert payload["email"] not in str(error.value)
        assert settings.encryption_key not in str(error.value)
    assert not (tmp_path / "bad-backup").exists()
    assert not (tmp_path / "bad-restore").exists()
    assert snapshot.read_bytes() == before


@pytest.mark.parametrize("target_kind", ["existing-empty", "existing-db", "live", "symlink"])
def test_destination_never_overwrites_or_changes_existing_permissions(tmp_path, settings, store, target_kind):
    ops = Operations(settings)
    target = tmp_path / "occupied"
    if target_kind == "live":
        target = settings.database_path.parent
    elif target_kind == "symlink":
        target.symlink_to(settings.database_path.parent, target_is_directory=True)
    else:
        target.mkdir(mode=0o755)
        if target_kind == "existing-db":
            (target / "intake.sqlite3").write_bytes(b"synthetic-existing-sentinel")
    mode = target.stat().st_mode
    before = settings.database_path.read_bytes()
    with pytest.raises(OperationsError):
        ops.backup(target)
    assert target.stat().st_mode == mode
    assert settings.database_path.read_bytes() == before
    if target_kind == "existing-db":
        assert (target / "intake.sqlite3").read_bytes() == b"synthetic-existing-sentinel"


def test_symlink_ancestors_source_sidecars_and_hardlinks_rejected(tmp_path, settings, store):
    ops = Operations(settings)
    linked = tmp_path / "linked-parent"
    linked.symlink_to(settings.database_path.parent, target_is_directory=True)
    with pytest.raises(OperationsError):
        ops.verify(linked / "intake.sqlite3")
    with pytest.raises(OperationsError):
        ops.backup(linked / "new-child")
    link = settings.database_path.parent / "linked.sqlite3"
    link.symlink_to(settings.database_path)
    with pytest.raises(OperationsError):
        ops.verify(link)
    import os
    hard = settings.database_path.parent / "hard.sqlite3"
    os.link(settings.database_path, hard)
    with pytest.raises(OperationsError):
        ops.status()
    hard.unlink()
    wal = Path(str(settings.database_path) + "-wal")
    wal.symlink_to(link)
    with pytest.raises(OperationsError):
        ops.status()
    assert wal.is_symlink()


def test_private_permissions_required_without_silently_chmodding_source(settings, store):
    ops = Operations(settings)
    settings.database_path.chmod(0o644)
    with pytest.raises(OperationsError):
        ops.status()
    assert stat.S_IMODE(settings.database_path.stat().st_mode) == 0o644
    settings.database_path.chmod(0o600)
    settings.database_path.parent.chmod(0o755)
    with pytest.raises(OperationsError):
        ops.status()
    assert stat.S_IMODE(settings.database_path.parent.stat().st_mode) == 0o755


@pytest.mark.parametrize("corruption", ["payload", "contact", "index", "audit", "schema", "sqlite"])
def test_verification_rejects_corruption_without_printing_plaintext(tmp_path, settings, store, payload, corruption):
    store.save("first", payload)
    job = store.claim(now_ts=100)
    store.mark_synced(job.job_id, job.lease_token, "synthetic-contact-sensitive")
    ops = Operations(settings)
    ops.backup(tmp_path / "snapshot")
    snapshot = tmp_path / "snapshot" / "intake.sqlite3"
    if corruption == "sqlite":
        snapshot.write_bytes(b"synthetic-invalid-db")
    else:
        with sqlite3.connect(snapshot) as connection:
            if corruption == "payload":
                connection.execute("UPDATE submissions SET encrypted_payload=?", (b"synthetic-invalid-ciphertext",))
            elif corruption == "contact":
                connection.execute("UPDATE outbox SET encrypted_contact_id=?", (b"synthetic-invalid-ciphertext",))
            elif corruption == "index":
                connection.execute("UPDATE registrations SET email_branch_index=?", (b"synthetic-invalid-index",))
            elif corruption == "audit":
                connection.execute("DELETE FROM submissions")
            else:
                connection.execute("CREATE TABLE unexpected (private TEXT)")
    with pytest.raises(OperationsError) as error:
        ops.verify(snapshot)
    assert payload["email"] not in str(error.value)
    assert "synthetic-contact-sensitive" not in str(error.value)
    with pytest.raises(OperationsError):
        ops.restore(snapshot, tmp_path / "refused-restore")
    assert not (tmp_path / "refused-restore").exists()


def test_missing_database_never_initializes_and_paths_do_not_traverse(tmp_path, settings):
    ops = Operations(settings)
    with pytest.raises(OperationsError):
        ops.status()
    assert not settings.database_path.parent.exists()
    with pytest.raises(OperationsError):
        ops.verify(Path("relative.sqlite3"))
    with pytest.raises(OperationsError):
        ops.verify(Path("/synthetic-invalid-\x00-path"))
    with pytest.raises(OperationsError):
        ops.backup(tmp_path / "child" / ".." / "new-dir")


def test_cli_settings_only_aggregate_output_all_commands(tmp_path, settings, store, payload, monkeypatch, capsys):
    store.save("first", payload)
    set_env(monkeypatch, settings)
    for args in (["status"], ["backup", "--destination-dir", str(tmp_path / "snapshot")],
                 ["verify", "--snapshot", str(tmp_path / "snapshot" / "intake.sqlite3")],
                 ["restore", "--snapshot", str(tmp_path / "snapshot" / "intake.sqlite3"),
                  "--destination-dir", str(tmp_path / "restored")]):
        assert main(args) == 0
        output = capsys.readouterr()
        assert output.err == ""
        assert json.loads(output.out) == {"ok": True, "operation": args[0], "counts": counts(1, pending=1)}
        for sensitive in (payload["email"], payload["phone"], settings.encryption_key, str(settings.database_path)):
            assert sensitive not in output.out


def test_cli_missing_key_production_guards_and_safe_errors(tmp_path, settings, store, monkeypatch, capsys):
    set_env(monkeypatch, settings)
    monkeypatch.delenv("SY_INTAKE_ENCRYPTION_KEY")
    before = store.db_path.read_bytes()
    assert main(["status"]) == 1
    assert capsys.readouterr().err == '{"ok":false,"error":"operation_failed"}\n'
    assert not (tmp_path / "private" / "encryption.key").exists()
    set_env(monkeypatch, settings)
    monkeypatch.setenv("SY_INTAKE_MODE", "production")
    assert main(["status"]) == 1
    assert capsys.readouterr().err == '{"ok":false,"error":"operation_failed"}\n'
    with pytest.raises(SystemExit) as error:
        main(["status", "--unknown", "synthetic-sensitive-secret"])
    assert error.value.code == 2
    assert "synthetic-sensitive-secret" not in capsys.readouterr().err
    assert store.db_path.read_bytes() == before


def test_module_entrypoint(settings, store, monkeypatch):
    set_env(monkeypatch, settings)
    result = subprocess.run([sys.executable, "-m", "sy_intake.operations", "status"],
                            capture_output=True, text=True, check=False)
    assert result.returncode == 0 and not result.stderr
    assert json.loads(result.stdout) == {"ok": True, "operation": "status", "counts": counts()}
