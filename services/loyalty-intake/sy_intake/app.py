"""Public intake API; no contact browsing, CRM writes or worker in this process."""

from contextlib import asynccontextmanager
import json
import uuid

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from .models import RegistrationInput
from .protection import BotVerifier, LocalQaVerifier, TurnstileVerifier, is_loopback, rate_bucket
from .settings import Settings
from .storage import IdempotencyConflict, StorageError, Store


def error(code: str, status: int) -> JSONResponse:
    return JSONResponse({"code": code}, status_code=status)


def create_app(settings: Settings, *, store: Store | None = None, verifier: BotVerifier | None = None) -> FastAPI:
    settings.validate()
    active_store = store if store is not None else Store(settings.database_path, settings.encryption_key)
    active_verifier = verifier if verifier is not None else (
        LocalQaVerifier() if settings.mode == "local-qa" else TurnstileVerifier(settings)
    )

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        active_store.initialize()
        yield

    app = FastAPI(lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)

    @app.middleware("http")
    async def safe_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
        response.headers["Referrer-Policy"] = "no-referrer"
        return response

    @app.get("/health")
    async def health():
        return {"status": "ok", "capture": "local-qa" if settings.mode == "local-qa" else "enabled"}

    @app.post("/api/registrations")
    async def register(request: Request):
        # Ignore X-Forwarded-For/CF-Connecting-IP unless a reviewed ingress explicitly
        # establishes trust. Uvicorn local runner also has proxy_headers=False.
        ip = request.client.host if request.client else ""
        if request.headers.get("origin") not in settings.allowed_origins:
            return error("unavailable", 403)
        if settings.mode == "local-qa" and not is_loopback(ip):
            return error("unavailable", 403)
        if request.headers.get("content-type", "").split(";", 1)[0].strip() != "application/json":
            return error("invalid_fields", 415)
        try:
            request_key = uuid.UUID(request.headers.get("idempotency-key", ""))
            if request_key.version != 4:
                return error("invalid_fields", 400)
        except ValueError:
            return error("invalid_fields", 400)
        try:
            allowed = active_store.allow_rate(rate_bucket(settings.encryption_key, ip), settings.rate_limit, settings.rate_window)
            if not allowed:
                response = error("rate_limited", 429)
                response.headers["Retry-After"] = str(settings.rate_window)
                return response
            body = bytearray()
            async for chunk in request.stream():
                if len(body) + len(chunk) > settings.max_body_bytes:
                    return error("invalid_fields", 413)
                body.extend(chunk)
            try:
                data = json.loads(body)
                registration = RegistrationInput.model_validate(data)
            except (ValueError, UnicodeError, ValidationError) as exc:
                code = "invalid_fields"
                if isinstance(exc, ValidationError):
                    # Pydantic's raw details contain input values; never return or log them.
                    reasons = {item["msg"].removeprefix("Value error, ") for item in exc.errors(include_input=False)}
                    for reason in ("consent_required", "invalid_date", "invalid_phone", "verification_failed"):
                        if reason in reasons:
                            code = reason
                            break
                return error(code, 400)
            if registration.website:
                return error("verification_failed", 400)
            payload = registration.storage_payload()
            key = str(request_key)
            receipt = active_store.replay(key, payload)
            if receipt is not None:
                return JSONResponse({"status": "received", "receipt_id": receipt.receipt_id, "sync_status": "pending"})
            if not await active_verifier.verify(registration.turnstile_token, ip=ip, request_id=key):
                return error("verification_failed", 400)
            receipt = active_store.save(key, payload)
            return JSONResponse({"status": "received", "receipt_id": receipt.receipt_id, "sync_status": "pending"}, status_code=201)
        except IdempotencyConflict:
            return error("idempotency_conflict", 409)
        except (StorageError, OSError):
            # Success can never precede the committed transaction. No exception PII.
            return error("unavailable", 503)

    return app
