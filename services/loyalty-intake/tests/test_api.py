import asyncio
from dataclasses import replace
import json
import uuid

from cryptography.fernet import Fernet
from fastapi.testclient import TestClient
import httpx
import pytest

from sy_intake.app import create_app
from sy_intake.protection import TurnstileVerifier
from sy_intake.settings import CONSENT_VERSION, Settings
from sy_intake.storage import StorageError, Store


@pytest.fixture
def settings(tmp_path):
    return Settings(database_path=tmp_path / "data" / "intake.sqlite",
                    encryption_key=Fernet.generate_key().decode(), mode="local-qa",
                    allowed_origins=("http://127.0.0.1:8798",))


@pytest.fixture
def payload():
    return {"full_name": "PRUEBA LOCAL", "email": "local-registration@example.com",
            "phone": None, "birthday_day_month": "29/02", "locale": "es", "branch": "el-paso",
            "registration_consent": True, "email_marketing_consent": False,
            "consent_version": CONSENT_VERSION, "turnstile_token": "local-qa-only", "website": ""}


def headers(key=None):
    return {"Origin": "http://127.0.0.1:8798", "Idempotency-Key": key or str(uuid.uuid4())}


def client_for(settings, **kwargs):
    return TestClient(create_app(settings, **kwargs), client=("127.0.0.1", 12345))


def test_committed_receipt_survives_restart(settings, payload):
    key = str(uuid.uuid4())
    with client_for(settings) as client:
        saved = client.post("/api/registrations", json=payload, headers=headers(key))
        assert saved.status_code == 201
        assert saved.json()["status"] == "received"
        assert saved.json()["sync_status"] == "pending"
        assert uuid.UUID(saved.json()["receipt_id"])
        assert saved.headers["cache-control"] == "no-store"
        assert payload["email"] not in saved.text
    with client_for(settings) as restarted:
        response = restarted.post("/api/registrations", json=payload, headers=headers(key))
        assert response.status_code == 200
        assert response.json() == saved.json()
    store = Store(settings.database_path, settings.encryption_key)
    store.initialize()
    job = store.claim()
    assert job.payload["email"] == payload["email"]
    assert job.payload["birthday_day_month"] == "29/02"
    assert job.payload["source"]["utm_content"] == "registro_v2"
    assert "turnstile_token" not in job.payload
    assert "website" not in job.payload
    assert job.payload["email_marketing_consent"] is False


def test_replay_does_not_reverify_consumed_bot_token(settings, payload):
    class Once:
        calls = 0
        async def verify(self, token, **kwargs):
            self.calls += 1
            return self.calls == 1
    verifier = Once()
    key = str(uuid.uuid4())
    with client_for(settings, verifier=verifier) as client:
        first = client.post("/api/registrations", json=payload, headers=headers(key))
        second = client.post("/api/registrations", json=payload, headers=headers(key))
        assert first.status_code == 201 and second.status_code == 200
        assert first.json() == second.json()
        assert verifier.calls == 1
        changed = client.post("/api/registrations", json={**payload, "full_name": "OTRA PRUEBA"}, headers=headers(key))
        assert changed.status_code == 409
        assert changed.json() == {"code": "idempotency_conflict"}


@pytest.mark.parametrize("patch,code", [
    ({"registration_consent": False}, "consent_required"),
    ({"registration_consent": "true"}, "invalid_fields"),
    ({"email_marketing_consent": "false"}, "invalid_fields"),
    ({"birthday_day_month": "31/04"}, "invalid_date"),
    ({"birthday_day_month": "09/10/1980"}, "invalid_date"),
    ({"phone": "3468791675"}, "invalid_phone"),
    ({"phone": "+03468791675"}, "invalid_phone"),
    ({"email": "not-an-email"}, "invalid_fields"),
    ({"branch": "houston"}, "invalid_fields"),
    ({"consent_version": "old"}, "invalid_fields"),
    ({"locale": "fr"}, "invalid_fields"),
    ({"location_id": "untrusted"}, "invalid_fields"),
    ({"source": {"utm_source": "untrusted"}}, "invalid_fields"),
    ({"full_name": "PRUEBA\u0000LOCAL"}, "invalid_fields"),
    ({"turnstile_token": ""}, "verification_failed"),
    ({"turnstile_token": "production-like-but-invalid"}, "verification_failed"),
    ({"website": "spam"}, "verification_failed"),
])
def test_invalid_input_has_no_pii_or_outbox(settings, payload, patch, code):
    with client_for(settings) as client:
        response = client.post("/api/registrations", json={**payload, **patch}, headers=headers())
        assert response.status_code == 400
        assert response.json() == {"code": code}
        assert payload["email"] not in response.text
    store = Store(settings.database_path, settings.encryption_key)
    store.initialize()
    assert store.claim() is None


def test_body_origin_and_identity_limits(settings, payload):
    with client_for(settings) as client:
        for origin in (None, "https://malicious.example", "http://127.0.0.1:8798.evil.example"):
            h = headers()
            if origin is None:
                del h["Origin"]
            else:
                h["Origin"] = origin
            assert client.post("/api/registrations", json=payload, headers=h).status_code == 403
        assert client.post("/api/registrations", content=json.dumps(payload), headers=headers()).status_code == 415
        assert client.post("/api/registrations", json=payload, headers={**headers(), "Idempotency-Key": "wrong"}).status_code == 400
        assert client.post("/api/registrations", json=payload, headers={**headers(), "Idempotency-Key": str(uuid.uuid1())}).status_code == 400
        assert client.post("/api/registrations", content="x" * 9000, headers={**headers(), "Content-Type": "application/json"}).status_code == 413
        assert client.post("/api/registrations", content="{", headers={**headers(), "Content-Type": "application/json"}).status_code == 400


def test_qa_cannot_be_exposed_by_spoofing_forwarded_headers(settings, payload):
    with TestClient(create_app(settings), client=("203.0.113.10", 42)) as client:
        response = client.post("/api/registrations", json=payload, headers={**headers(), "X-Forwarded-For": "127.0.0.1", "CF-Connecting-IP": "127.0.0.1"})
        assert response.status_code == 403


def test_oversized_chunk_is_not_copied_into_buffer(settings, monkeypatch):
    import sy_intake.app as app_module
    extended = []
    class ObservedBuffer(bytearray):
        def extend(self, chunk):
            extended.append(len(chunk))
            super().extend(chunk)
    monkeypatch.setattr(app_module, "bytearray", ObservedBuffer, raising=False)
    with client_for(settings) as client:
        response = client.post("/api/registrations", content="x" * (1024 * 1024),
                               headers={**headers(), "Content-Type": "application/json"})
        assert response.status_code == 413
        assert extended == []


def test_rate_limit_is_durable_and_does_not_store_ip(settings, payload):
    limited = replace(settings, rate_limit=2)
    with client_for(limited) as client:
        assert client.post("/api/registrations", json=payload, headers=headers()).status_code == 201
        assert client.post("/api/registrations", json=payload, headers=headers()).status_code == 201
    with client_for(limited) as restarted:
        response = restarted.post("/api/registrations", json=payload, headers=headers())
        assert response.status_code == 429
        assert response.json() == {"code": "rate_limited"}
    assert b"127.0.0.1" not in settings.database_path.read_bytes()


def test_storage_failure_never_returns_success(settings, payload, monkeypatch):
    store = Store(settings.database_path, settings.encryption_key)
    def fail(*args):
        raise StorageError("safe")
    with client_for(settings, store=store) as client:
        monkeypatch.setattr(store, "save", fail)
        response = client.post("/api/registrations", json=payload, headers=headers())
        assert response.status_code == 503
        assert response.json() == {"code": "unavailable"}
        assert store.claim() is None


def test_no_public_contact_or_admin_routes(settings):
    with client_for(settings) as client:
        assert client.get("/health").json() == {"status": "ok", "capture": "local-qa"}
        for path in ("/api/registrations", "/contacts", "/admin", "/export", "/docs", "/openapi.json", "/var/registrations.sqlite"):
            assert client.get(path).status_code in (404, 405)


def test_production_does_not_fallback_to_qa(settings):
    with pytest.raises(ValueError):
        create_app(replace(settings, mode="production", allowed_origins=("https://sin-yolanda.com",)))
    with pytest.raises(ValueError):
        create_app(replace(settings, allowed_origins=("http://0.0.0.0:8798",)))
    with pytest.raises(ValueError):
        create_app(replace(settings, encryption_key="not-a-key"))


@pytest.mark.parametrize("result,expected", [
    ({"success": True, "hostname": "sin-yolanda.com", "action": "loyalty_register"}, True),
    ({"success": True, "hostname": "elsewhere.example", "action": "loyalty_register"}, False),
    ({"success": True, "hostname": "sin-yolanda.com", "action": "other"}, False),
    ({"success": False, "error-codes": ["timeout-or-duplicate"]}, False),
    ({"success": "true", "hostname": "sin-yolanda.com", "action": "loyalty_register"}, False),
])
def test_turnstile_server_result_requires_exact_contract(settings, result, expected):
    seen = []
    def handler(request):
        seen.append(str(request.url))
        return httpx.Response(200, json=result)
    production = replace(settings, mode="production", allowed_origins=("https://sin-yolanda.com",), turnstile_secret="synthetic-local-secret")
    verifier = TurnstileVerifier(production, transport=httpx.MockTransport(handler))
    assert asyncio.run(verifier.verify("synthetic", ip="203.0.113.1", request_id=str(uuid.uuid4()))) is expected
    assert seen == ["https://challenges.cloudflare.com/turnstile/v0/siteverify"]


def test_turnstile_outage_fails_closed(settings):
    def handler(request):
        raise httpx.ConnectError("simulated")
    verifier = TurnstileVerifier(settings, transport=httpx.MockTransport(handler))
    assert asyncio.run(verifier.verify("synthetic", ip="203.0.113.1", request_id=str(uuid.uuid4()))) is False
