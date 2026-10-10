"""Synthetic scheduler bridge; no Docker, remote host, credentials or contacts."""
from importlib.util import spec_from_file_location, module_from_spec
import json
from pathlib import Path
from subprocess import CompletedProcess
import pytest

spec = spec_from_file_location("host_maintenance", Path(__file__).parents[1] / "ops/host_maintenance.py")
bridge = module_from_spec(spec)
spec.loader.exec_module(bridge)


def result(payload, code=0, stderr=b""):
    return CompletedProcess([], code, json.dumps(payload).encode(), stderr)


def test_only_safe_counts_are_saved_and_provider_fields_are_omitted():
    payload = {"ok": True, "operation": "monitor", "counts": {"registrations": 0},
               "backup_age_seconds": 10, "fictional_secret": "omit_fixture@example.test"}
    assert bridge.sanitize(result(payload), "monitor") == {
        "ok": True, "operation": "monitor", "counts": {"registrations": 0}, "backup_age_seconds": 10}


@pytest.mark.parametrize("payload", [None, [], {"ok": 1},
    {"ok": True, "operation": "backup", "counts": {"email": "fixture@example.test"}},
    {"ok": True, "operation": "backup", "counts": {"registrations": True}},
    {"ok": True, "operation": "backup", "counts": {"registrations": -1}},
    {"ok": False, "error": "fixture@example.test"}])
def test_invalid_outputs_fail_closed_without_values(payload):
    assert bridge.sanitize(result(payload), "backup") == {
        "ok": False, "operation": "backup", "error": "maintenance_failed"}


def test_process_failure_stderr_and_oversized_output_never_become_success():
    payload = {"ok": True, "operation": "backup", "counts": {"registrations": 0}}
    for completed in [result(payload, code=1), result(payload, stderr=b"fictional_private_value"),
                      CompletedProcess([], 0, b"a" * 8193, b"")]:
        assert not bridge.sanitize(completed, "backup")["ok"]


def test_known_failure_and_wrong_operation_are_rejected_safely():
    assert bridge.sanitize(result({"ok": False, "error": "backup_stale"}, code=1), "monitor")["error"] == "backup_stale"
    assert not bridge.sanitize(result({"ok": True, "operation": "backup", "counts": {"registrations": 0}}), "monitor")["ok"]


def test_atomic_private_status_and_no_overwrite_of_links(tmp_path):
    directory = tmp_path.resolve() / "private-status"
    directory.mkdir(mode=0o700)
    bridge.save_state(directory, "backup", {"ok": True})
    target = directory / "backup.json"
    assert target.stat().st_mode & 0o777 == 0o600
    bridge.save_state(directory, "backup", {"ok": False})
    assert json.loads(target.read_bytes())["ok"] is False
    target.unlink()
    outside = directory / "outside"
    outside.write_bytes(b"fictional-unchanged")
    target.symlink_to(outside)
    with pytest.raises(ValueError):
        bridge.save_state(directory, "backup", {"ok": True})
    assert outside.read_bytes() == b"fictional-unchanged"


def test_non_private_status_directory_is_not_repaired(tmp_path):
    directory = tmp_path.resolve() / "not-private"
    directory.mkdir(mode=0o755)
    with pytest.raises(ValueError):
        bridge.save_state(directory, "monitor", {"ok": True})
    assert directory.stat().st_mode & 0o777 == 0o755


def test_main_uses_only_fixed_container_and_never_reads_service_credentials(monkeypatch):
    commands, states = [], []
    monkeypatch.setattr(bridge.os, "geteuid", lambda: 0)
    def run(command, **options):
        commands.append((command, options))
        return result({"ok": True, "operation": "backup", "counts": {"registrations": 0}})
    monkeypatch.setattr(bridge.subprocess, "run", run)
    monkeypatch.setattr(bridge, "save_state", lambda directory, operation, payload: states.append(payload))
    assert bridge.main(["backup"]) == 0
    assert commands[0][0] == ["/usr/bin/docker", "exec", bridge.CONTAINER, "python", "-m",
                              "sy_intake.maintenance", "backup", "--root", "/backups/scheduled"]
    assert commands[0][1] == {"capture_output": True, "timeout": 120, "check": False}
    assert states[0]["ok"]
