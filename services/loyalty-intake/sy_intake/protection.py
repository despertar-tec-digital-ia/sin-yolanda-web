"""Bot verification has no fail-open path or client-controlled endpoint."""

import base64
import hashlib
import hmac
import ipaddress
from typing import Protocol

import httpx

from .settings import Settings


class BotVerifier(Protocol):
    async def verify(self, token: str, *, ip: str, request_id: str) -> bool: ...


def is_loopback(ip: str) -> bool:
    try:
        return ipaddress.ip_address(ip).is_loopback
    except ValueError:
        return False


def rate_bucket(key: str, ip: str) -> str:
    # The database contains a purpose-specific keyed hash, never the raw IP.
    secret = base64.urlsafe_b64decode(key)
    derived = hmac.new(secret, b"sy-intake-rate-v1", hashlib.sha256).digest()
    return hmac.new(derived, ip.encode("utf-8"), hashlib.sha256).hexdigest()


class LocalQaVerifier:
    async def verify(self, token: str, *, ip: str, request_id: str) -> bool:
        return is_loopback(ip) and token == "local-qa-only"


class TurnstileVerifier:
    def __init__(self, settings: Settings, *, transport: httpx.AsyncBaseTransport | None = None):
        self.settings = settings
        self.transport = transport

    async def verify(self, token: str, *, ip: str, request_id: str) -> bool:
        try:
            async with httpx.AsyncClient(transport=self.transport, timeout=5.0, follow_redirects=False) as client:
                response = await client.post(
                    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
                    data={"secret": self.settings.turnstile_secret, "response": token,
                          "remoteip": ip, "idempotency_key": request_id},
                )
                if response.status_code != 200 or len(response.content) > 16384:
                    return False
                result = response.json()
                return (isinstance(result, dict) and result.get("success") is True
                        and result.get("hostname") == self.settings.turnstile_hostname
                        and result.get("action") == self.settings.turnstile_action)
        except (httpx.HTTPError, ValueError, TypeError):
            return False
