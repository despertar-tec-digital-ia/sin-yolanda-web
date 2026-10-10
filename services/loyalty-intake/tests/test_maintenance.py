"""No real guests, secrets, schedules or provider calls in maintenance tests."""

from datetime import datetime, timedelta, timezone
import fcntl
import json
from pathlib import Path
import stat

from cryptography.fernet import Fernet
import pytest

from sy_intake.maintenance import Maintenance, main
from sy_intake.operations import OperationsError
from sy_intake.settings import Settings
from sy_intake.storage import Store

NOW = datetime(2026, 10, 10, 18, 0, tzinfo=timezone.utc)


@pytest.fixture
def setup(tmp_path):
    settings = Settings(database_path=tmp_path / "data" / "intake.sqlite3",
                        encryption_key=Fernet.generate_key().decode(), mode="local-qa",
                        allowed_origins=("http://127.0.0.1:8798",))
    store = Store(settings.database_path, settings.encryption_key)
    store.initialize()
    root = tmp_path / "backups"
    root.mkdir(mode=0o700)
    payload = {"full_name": "Fictional Maintenance Guest", "email": "maintenance@example.test",
               "phone": None, "birthday_day_month": None, "locale": "es", "branch": "el-paso",
               "registration_consent": True, "email_marketing_consent": False,
               "consent_version": "synthetic-maintenance-version", "source": {"utm_source": "qr"}}
    store.save("synthetic-request", payload)
    return settings, root, store, payload


def test_verified_new_backups_and_monitor_have_no_personal_data(setup):
    settings, root, store, payload = setup
    maintenance = Maintenance(settings, root)
    before = store.db_path.read_bytes()
    assert maintenance.monitor(now=NOW) == {"ok": False, "error": "backup_missing"}
    result = maintenance.backup(now=NOW)
    second = maintenance.backup(now=NOW + timedelta(seconds=1))
    assert result["ok"] and second["ok"]
    assert result["counts"]["registrations"] == 1
    assert store.db_path.read_bytes() == before
    assert maintenance.monitor(now=NOW + timedelta(hours=1))["ok"]
    assert maintenance.monitor(now=NOW + timedelta(hours=9))["error"] == "backup_stale"
    snapshots = [p for p in root.iterdir() if p.is_dir()]
    assert len(snapshots) == 2
    for directory in snapshots:
        assert stat.S_IMODE(directory.stat().st_mode) == 0o700
        for file in directory.iterdir():
            assert stat.S_IMODE(file.stat().st_mode) == 0o600
            for value in (payload["full_name"], payload["email"], settings.encryption_key):
                assert value.encode() not in file.read_bytes()
    assert payload["email"] not in json.dumps(result)
    # Monitoring has no retention deletion or outbox mutation.
    assert store.claim(now_ts=100) is not None


@pytest.mark.parametrize("corruption", ["hash", "counts", "future", "manifest", "snapshot", "permissions", "link", "unfinished"])
def test_monitor_rejects_new_invalid_backup_instead_of_using_older_success(setup, corruption):
    settings, root, _, _ = setup
    maintenance = Maintenance(settings, root)
    maintenance.backup(now=NOW - timedelta(hours=1))
    maintenance.backup(now=NOW)
    latest = sorted(p for p in root.iterdir() if p.is_dir())[-1]
    manifest = latest / "manifest.json"
    data = json.loads(manifest.read_bytes())
    if corruption == "hash":
        data["sha256"] = "0" * 64
    elif corruption == "counts":
        data["counts"]["registrations"] = True
    elif corruption == "future":
        data["created_at"] = (NOW + timedelta(hours=1)).isoformat()
    elif corruption == "manifest":
        manifest.write_bytes(b"{bad-json")
    elif corruption == "snapshot":
        (latest / "intake.sqlite3").write_bytes(b"bad-snapshot")
    elif corruption == "permissions":
        manifest.chmod(0o644)
    elif corruption == "link":
        manifest.unlink()
        manifest.symlink_to(settings.database_path)
    elif corruption == "unfinished":
        manifest.unlink()
    if corruption in {"hash", "counts", "future"}:
        manifest.write_text(json.dumps(data))
    assert maintenance.monitor(now=NOW)["error"] == "backup_invalid"
    assert len([p for p in root.iterdir() if p.is_dir()]) == 2


def test_bad_storage_and_low_disk_are_reported_without_personal_details(setup, monkeypatch):
    settings, root, _, _ = setup
    maintenance = Maintenance(settings, root)
    maintenance.backup(now=NOW)
    class Disk:
        free = 1
    monkeypatch.setattr("sy_intake.maintenance.shutil.disk_usage", lambda _: Disk())
    assert maintenance.monitor(now=NOW)["error"] == "disk_low"
    settings.database_path.chmod(0o644)
    assert maintenance.monitor(now=NOW)["error"] == "storage_unavailable"


def test_newer_snapshot_in_same_second_is_not_hidden_by_random_uuid_order(setup):
    settings, root, _, _ = setup
    maintenance = Maintenance(settings, root)
    maintenance.backup(now=NOW)
    maintenance.backup(now=NOW + timedelta(microseconds=1))
    latest = sorted(p for p in root.iterdir() if p.is_dir())[-1]
    (latest / "manifest.json").unlink()
    assert maintenance.monitor(now=NOW + timedelta(seconds=1))["error"] == "backup_invalid"


def test_private_backup_root_and_nonoverlapping_lock_required(setup, tmp_path):
    settings, root, _, _ = setup
    with pytest.raises(OperationsError):
        Maintenance(settings, settings.database_path.parent)
    root.chmod(0o755)
    with pytest.raises(OperationsError):
        Maintenance(settings, root)
    root.chmod(0o700)
    linked = tmp_path / "linked"
    linked.symlink_to(root, target_is_directory=True)
    with pytest.raises(OperationsError):
        Maintenance(settings, linked)
    maintenance = Maintenance(settings, root)
    maintenance.backup(now=NOW)
    with (root / ".maintenance.lock").open("r+") as handle:
        fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        with pytest.raises(OperationsError):
            maintenance.backup(now=NOW)
    assert len([p for p in root.iterdir() if p.is_dir()]) == 1


def test_cli_prints_only_fixed_errors_when_config_is_missing(setup, monkeypatch, capsys):
    _, root, _, _ = setup
    monkeypatch.delenv("SY_INTAKE_ENCRYPTION_KEY", raising=False)
    assert main(["monitor", "--root", str(root)]) == 1
    assert json.loads(capsys.readouterr().out) == {"ok": False, "error": "maintenance_failed"}
