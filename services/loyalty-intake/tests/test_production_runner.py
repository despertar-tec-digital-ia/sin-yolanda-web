"""Synthetic production configuration, ASGI only; no server or provider calls."""

import asyncio
import logging
import os
from pathlib import Path
import sys
import uuid

from cryptography.fernet import Fernet
from fastapi.testclient import TestClient
import pytest

import run_production
from run_production import (
    BodyReadDeadlineMiddleware,
    BodyReadTimeout,
    ProductionStartupError,
    SafeServerFormatter,
    STARTUP_FAILURE,
    create_production_app,
)
from sy_intake.storage import Store


@pytest.fixture
def production_env(tmp_path, monkeypatch):
    # This secret is a deliberately synthetic fixture, never sent to Turnstile.
    values = {
        "SY_INTAKE_DATABASE": str(tmp_path / "private" / "fixture.sqlite3"),
        "SY_INTAKE_ENCRYPTION_KEY": Fernet.generate_key().decode("ascii"),
        "SY_INTAKE_MODE": "production",
        "SY_INTAKE_ORIGINS": "https://sin-yolanda.com",
        "SY_INTAKE_TURNSTILE_SECRET": "fixture-unusable-provider-secret",
        "SY_INTAKE_TURNSTILE_HOSTNAME": "sin-yolanda.com",
    }
    for name in tuple(os.environ):
        if name.startswith("SY_INTAKE_"):
            monkeypatch.delenv(name)
    for name, value in values.items():
        monkeypatch.setenv(name, value)
    return values


def test_factory_preflights_durable_storage_and_preserves_health(production_env):
    app = create_production_app()
    path = Path(production_env["SY_INTAKE_DATABASE"])
    assert path.is_file()
    store = Store(path, production_env["SY_INTAKE_ENCRYPTION_KEY"])
    store.initialize()
    assert store.claim() is None
    with TestClient(app) as client:
        assert client.get("/health").json() == {"status": "ok", "capture": "enabled"}
    assert not (path.parent / "encryption.key").exists()


def test_missing_mode_defaults_to_production(production_env, monkeypatch):
    monkeypatch.delenv("SY_INTAKE_MODE")
    app = create_production_app()
    with TestClient(app) as client:
        assert client.get("/health").json()["capture"] == "enabled"


@pytest.mark.parametrize("mode", ["local-qa", "", "development", "Production"])
def test_factory_never_allows_qa_or_unrecognized_mode(production_env, monkeypatch, mode):
    monkeypatch.setenv("SY_INTAKE_MODE", mode)
    with pytest.raises(ProductionStartupError, match=f"^{STARTUP_FAILURE}$"):
        create_production_app()
    assert not Path(production_env["SY_INTAKE_DATABASE"]).exists()


@pytest.mark.parametrize("name,value", [
    ("SY_INTAKE_DATABASE", ""),
    ("SY_INTAKE_DATABASE", "relative/fixture.sqlite3"),
    ("SY_INTAKE_DATABASE", "/fixture-intake.sqlite3"),
    ("SY_INTAKE_ENCRYPTION_KEY", ""),
    ("SY_INTAKE_ENCRYPTION_KEY", "private-invalid-key-fixture"),
    ("SY_INTAKE_TURNSTILE_SECRET", ""),
    ("SY_INTAKE_TURNSTILE_SECRET", "local-qa-only"),
    ("SY_INTAKE_TURNSTILE_SECRET", "1x0000000000000000000000000000000AA"),
    ("SY_INTAKE_TURNSTILE_SECRET", "2x0000000000000000000000000000000AA"),
    ("SY_INTAKE_TURNSTILE_SECRET", "3x0000000000000000000000000000000AA"),
    ("SY_INTAKE_TURNSTILE_SECRET", " fixture-secret "),
    ("SY_INTAKE_ORIGINS", "http://127.0.0.1:8798"),
    ("SY_INTAKE_ORIGINS", "https://sin-yolanda.com/path"),
    ("SY_INTAKE_TURNSTILE_HOSTNAME", "different.example"),
])
def test_invalid_configuration_is_sanitized(production_env, monkeypatch, name, value):
    monkeypatch.setenv(name, value)
    with pytest.raises(ProductionStartupError) as captured:
        create_production_app()
    assert str(captured.value) == STARTUP_FAILURE
    assert captured.value.__suppress_context__ is True


def test_existing_database_rejects_wrong_key_before_app_is_returned(production_env, monkeypatch):
    create_production_app()
    monkeypatch.setenv("SY_INTAKE_ENCRYPTION_KEY", Fernet.generate_key().decode("ascii"))
    with pytest.raises(ProductionStartupError, match=f"^{STARTUP_FAILURE}$"):
        create_production_app()


def test_symlink_storage_path_never_changes_external_directory(production_env, tmp_path, monkeypatch):
    outside = tmp_path / "fixture-outside"
    outside.mkdir(mode=0o755)
    linked = tmp_path / "fixture-linked"
    linked.symlink_to(outside, target_is_directory=True)
    monkeypatch.setenv("SY_INTAKE_DATABASE", str(linked / "fixture.sqlite3"))
    previous_mode = outside.stat().st_mode
    with pytest.raises(ProductionStartupError):
        create_production_app()
    assert outside.stat().st_mode == previous_mode
    assert not (outside / "fixture.sqlite3").exists()


def test_unexpected_startup_error_never_exposes_values(production_env, monkeypatch, capsys):
    def fail():
        raise ValueError("fixture@example.invalid private-fixture-token /private/fixture-path")
    monkeypatch.setattr(run_production.Settings, "from_env", fail)
    monkeypatch.setattr(run_production, "is_container_runtime", lambda: True)
    assert run_production.main() == 1
    output = capsys.readouterr()
    assert output.out == ""
    assert output.err == STARTUP_FAILURE + "\n"


def test_main_never_binds_all_interfaces_outside_container(production_env, monkeypatch, capsys):
    monkeypatch.setattr(run_production, "is_container_runtime", lambda: False)
    def forbidden(*args, **kwargs):
        pytest.fail("Server must not start outside the container")
    monkeypatch.setattr(run_production.uvicorn, "run", forbidden)
    assert run_production.main() == 1
    assert capsys.readouterr().err == STARTUP_FAILURE + "\n"
    assert not Path(production_env["SY_INTAKE_DATABASE"]).exists()


def test_main_uses_bounded_container_runtime_without_reload_proxy_or_access_logs(production_env, monkeypatch):
    monkeypatch.setattr(run_production, "is_container_runtime", lambda: True)
    calls = []
    monkeypatch.setattr(run_production.uvicorn, "run", lambda app, **options: calls.append((app, options)))
    assert run_production.main() == 0
    assert len(calls) == 1
    options = calls[0][1]
    assert options["host"] == "0.0.0.0" and options["port"] == 8000
    assert options["proxy_headers"] is False
    assert options["access_log"] is False
    assert options["reload"] is False and options["workers"] == 1
    assert options["lifespan"] == "on"
    assert options["limit_concurrency"] == 64
    assert options["timeout_keep_alive"] == 5
    assert options["timeout_graceful_shutdown"] == 15
    assert options["h11_max_incomplete_event_size"] == 16384


def test_server_formatter_never_formats_messages_arguments_or_exception_pii():
    try:
        raise ValueError("fixture@example.invalid private-fixture-key")
    except ValueError:
        record = logging.LogRecord(
            "uvicorn.error", logging.ERROR, "/private/fixture-path", 1,
            "Request %s failed", ("fixture@example.invalid",), sys.exc_info(),
        )
    assert SafeServerFormatter().format(record) == "error: intake_server_event"


def scope_for_registration():
    return {
        "type": "http", "asgi": {"version": "3.0", "spec_version": "2.3"},
        "http_version": "1.1", "method": "POST", "scheme": "https",
        "path": "/api/registrations", "raw_path": b"/api/registrations",
        "query_string": b"", "root_path": "",
        "headers": [
            (b"origin", b"https://sin-yolanda.com"),
            (b"content-type", b"application/json"),
            (b"idempotency-key", str(uuid.uuid4()).encode("ascii")),
        ],
        "client": ("203.0.113.1", 12345), "server": ("fixture-container", 8000),
    }


def test_stalled_body_times_out_before_capture_with_safe_response(production_env, monkeypatch):
    monkeypatch.setattr(run_production, "BODY_READ_SECONDS", 0.01)
    app = create_production_app()
    messages = []
    async def stalled_receive():
        await asyncio.Future()
    async def send(message):
        messages.append(message)
    asyncio.run(app(scope_for_registration(), stalled_receive, send))
    start = next(message for message in messages if message["type"] == "http.response.start")
    assert start["status"] == 408
    assert dict(start["headers"])[b"cache-control"] == b"no-store"
    assert b"".join(message.get("body", b"") for message in messages) == b'{"code":"unavailable"}'
    store = Store(Path(production_env["SY_INTAKE_DATABASE"]), production_env["SY_INTAKE_ENCRYPTION_KEY"])
    assert store.claim() is None


def test_deadline_does_not_time_out_processing_after_body_is_complete():
    messages = []
    async def app(scope, receive, send):
        await receive()
        await asyncio.sleep(0.02)
        await send({"type": "http.response.start", "status": 200, "headers": []})
        await send({"type": "http.response.body", "body": b"fixture-safe"})
    async def receive():
        return {"type": "http.request", "body": b"{}", "more_body": False}
    async def send(message):
        messages.append(message)
    middleware = BodyReadDeadlineMiddleware(app, seconds=0.01)
    asyncio.run(middleware(scope_for_registration(), receive, send))
    assert messages[0]["status"] == 200


def test_body_timeout_never_sends_a_second_response_after_headers():
    messages = []
    async def app(scope, receive, send):
        await send({"type": "http.response.start", "status": 200, "headers": []})
        await receive()
    async def receive():
        await asyncio.Future()
    async def send(message):
        messages.append(message)
    middleware = BodyReadDeadlineMiddleware(app, seconds=0.01)
    with pytest.raises(BodyReadTimeout):
        asyncio.run(middleware(scope_for_registration(), receive, send))
    assert messages == [{"type": "http.response.start", "status": 200, "headers": []}]


def test_mixed_exception_group_is_not_hidden_as_a_body_timeout():
    messages = []
    async def app(scope, receive, send):
        raise ExceptionGroup("fixture-group", [BodyReadTimeout(), ValueError("fixture-contract-error")])
    async def receive():
        return {"type": "http.request", "body": b"", "more_body": False}
    async def send(message):
        messages.append(message)
    middleware = BodyReadDeadlineMiddleware(app, seconds=0.01)
    with pytest.raises(ExceptionGroup):
        asyncio.run(middleware(scope_for_registration(), receive, send))
    assert messages == []
