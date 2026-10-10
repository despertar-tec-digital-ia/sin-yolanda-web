"""Production-only container entry point; configuration never creates QA keys."""

import asyncio
import logging
import os
from pathlib import Path
import sys
import time

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send
import uvicorn

from sy_intake.app import create_app
from sy_intake.settings import Settings
from sy_intake.storage import Store


BODY_READ_SECONDS = 10.0
STARTUP_FAILURE = "Production intake startup failed"


class ProductionStartupError(Exception):
    """Fixed startup error; never disclose configuration or filesystem values."""


class BodyReadTimeout(Exception):
    """The request body did not arrive before its deadline."""


def only_body_timeouts(error: BaseException) -> bool:
    # Starlette's body reader may carry a receive failure through nested task
    # groups. A mixed group must propagate rather than hide another failure.
    if isinstance(error, BodyReadTimeout):
        return True
    return (
        isinstance(error, BaseExceptionGroup)
        and bool(error.exceptions)
        and all(only_body_timeouts(item) for item in error.exceptions)
    )


class BodyReadDeadlineMiddleware:
    """Bound body reception only; do not time out processing or rewrite responses."""

    def __init__(self, app: ASGIApp, *, seconds: float = BODY_READ_SECONDS):
        self.app = app
        self.seconds = seconds

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        deadline = time.monotonic() + self.seconds
        body_complete = False
        response_started = False

        async def receive_body() -> Message:
            nonlocal body_complete
            if body_complete:
                return await receive()
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise BodyReadTimeout() from None
            try:
                message = await asyncio.wait_for(receive(), timeout=remaining)
            except TimeoutError:
                raise BodyReadTimeout() from None
            if message["type"] == "http.disconnect" or (
                message["type"] == "http.request" and not message.get("more_body", False)
            ):
                body_complete = True
            return message

        async def track_response(message: Message) -> None:
            nonlocal response_started
            if message["type"] == "http.response.start":
                response_started = True
            await send(message)

        try:
            await self.app(scope, receive_body, track_response)
        except Exception as exc:
            if not only_body_timeouts(exc) or response_started:
                # ASGI cannot send a second status after a response has started.
                # Uvicorn will close an incomplete response and log a fixed code.
                raise
            response = JSONResponse(
                {"code": "unavailable"},
                status_code=408,
                headers={
                    "Cache-Control": "no-store",
                    "X-Content-Type-Options": "nosniff",
                    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
                    "Referrer-Policy": "no-referrer",
                },
            )
            await response(scope, receive, send)


class SafeServerFormatter(logging.Formatter):
    """Server warnings/errors expose severity only, including during startup."""

    def format(self, record: logging.LogRecord) -> str:
        level = "error" if record.levelno >= logging.ERROR else "warning"
        return f"{level}: intake_server_event"


SERVER_LOG_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {"default": {"()": SafeServerFormatter}},
    "handlers": {
        "default": {
            "class": "logging.StreamHandler",
            "formatter": "default",
            "stream": "ext://sys.stderr",
        }
    },
    "loggers": {
        "uvicorn": {"handlers": ["default"], "level": "WARNING", "propagate": False},
        "uvicorn.error": {"handlers": ["default"], "level": "WARNING", "propagate": False},
        "uvicorn.access": {"handlers": [], "level": "CRITICAL", "propagate": False},
    },
}


def create_production_app() -> FastAPI:
    """Fail before listening if mode, protection, key or durable storage is invalid.

    Configuration is loaded only by the explicit factory, not on import. The
    factory is also usable for local ASGI tests without opening a network port.
    A configured Turnstile secret is not proof of a live provider integration.
    """
    try:
        if os.environ.get("SY_INTAKE_MODE", "production") != "production":
            raise ValueError()
        settings = Settings.from_env()
        secret = settings.turnstile_secret
        if (
            secret != secret.strip()
            or secret.startswith(("1x", "2x", "3x"))
            or secret == "local-qa-only"
        ):
            raise ValueError()
        store = Store(settings.database_path, settings.encryption_key)
        store.initialize()
        app = create_app(settings, store=store)
        app.add_middleware(BodyReadDeadlineMiddleware, seconds=BODY_READ_SECONDS)
        return app
    except Exception:
        raise ProductionStartupError(STARTUP_FAILURE) from None


def is_container_runtime() -> bool:
    """Prevent an accidental all-interface bind on a developer's host."""
    return Path("/.dockerenv").is_file() or Path("/run/.containerenv").is_file()


def main() -> int:
    if not is_container_runtime():
        print(STARTUP_FAILURE, file=sys.stderr)
        return 1
    try:
        app = create_production_app()
    except ProductionStartupError:
        print(STARTUP_FAILURE, file=sys.stderr)
        return 1
    # Uvicorn owns SIGTERM/SIGINT and executes ASGI lifespan on shutdown. There
    # are no workers, background sync tasks, reloaders or dotenv files to load.
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        proxy_headers=False,
        access_log=False,
        log_level="warning",
        log_config=SERVER_LOG_CONFIG,
        reload=False,
        workers=1,
        lifespan="on",
        server_header=False,
        limit_concurrency=64,
        timeout_keep_alive=5,
        timeout_graceful_shutdown=15,
        h11_max_incomplete_event_size=16384,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
