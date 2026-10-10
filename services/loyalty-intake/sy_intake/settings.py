"""Explicit configuration; missing production protection never enables QA mode."""

from dataclasses import dataclass, field
import os
from pathlib import Path
from urllib.parse import urlsplit

from cryptography.fernet import Fernet

CONSENT_VERSION = "sy-el-paso-registration-v2-2026-10-09"


@dataclass(frozen=True)
class Settings:
    database_path: Path
    encryption_key: str = field(repr=False)
    mode: str = "production"
    allowed_origins: tuple[str, ...] = ("https://sin-yolanda.com",)
    turnstile_secret: str = field(default="", repr=False)
    turnstile_hostname: str = "sin-yolanda.com"
    turnstile_action: str = "loyalty_register"
    rate_limit: int = 120
    rate_window: int = 900
    max_body_bytes: int = 8192

    def validate(self) -> None:
        # Error messages must not reveal key values, paths or configuration input.
        try:
            Fernet(self.encryption_key.encode("ascii"))
        except (ValueError, TypeError, UnicodeError):
            raise ValueError("A valid encryption key is required") from None
        if not self.database_path.is_absolute():
            raise ValueError("An absolute database path is required")
        if self.mode not in ("local-qa", "production"):
            raise ValueError("Unknown execution mode")
        if not self.allowed_origins or self.rate_limit < 1 or self.rate_window < 1:
            raise ValueError("Invalid protection configuration")
        for origin in self.allowed_origins:
            parsed = urlsplit(origin)
            if parsed.username or parsed.password or parsed.path or parsed.query or parsed.fragment:
                raise ValueError("Origins must be exact, without paths or credentials")
            if self.mode == "local-qa":
                if origin != "http://127.0.0.1:8798":
                    raise ValueError("Local QA requires the fixed loopback preview origin")
            elif parsed.scheme != "https" or parsed.hostname in (None, "localhost", "127.0.0.1"):
                raise ValueError("Production requires HTTPS origins")
        if self.mode == "production":
            if not self.turnstile_secret or self.turnstile_secret.startswith("1x"):
                raise ValueError("Production requires a real Turnstile secret")
            if self.turnstile_action != "loyalty_register" or not self.turnstile_hostname:
                raise ValueError("Production requires an explicit bot-verification contract")
            if any(urlsplit(origin).hostname != self.turnstile_hostname for origin in self.allowed_origins):
                raise ValueError("Origin and bot-verification hostname must match")

    @classmethod
    def from_env(cls) -> "Settings":
        # No GHL credential discovery here. The API persists only; sync is separate.
        settings = cls(
            database_path=Path(os.environ.get("SY_INTAKE_DATABASE", "")),
            encryption_key=os.environ.get("SY_INTAKE_ENCRYPTION_KEY", ""),
            mode=os.environ.get("SY_INTAKE_MODE", "production"),
            allowed_origins=tuple(os.environ.get("SY_INTAKE_ORIGINS", "https://sin-yolanda.com").split(",")),
            turnstile_secret=os.environ.get("SY_INTAKE_TURNSTILE_SECRET", ""),
            turnstile_hostname=os.environ.get("SY_INTAKE_TURNSTILE_HOSTNAME", "sin-yolanda.com"),
        )
        settings.validate()
        return settings
