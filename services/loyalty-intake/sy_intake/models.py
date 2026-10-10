"""Strict input contract; transport-only fields are never persisted."""

import calendar
import re
import unicodedata
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, StrictBool, field_validator

from .settings import CONSENT_VERSION


class RegistrationInput(BaseModel):
    model_config = ConfigDict(extra="forbid", str_max_length=2048)

    full_name: str
    email: EmailStr
    phone: str | None = None
    birthday_day_month: str | None = None
    locale: Literal["es", "en"]
    branch: Literal["el-paso"]
    registration_consent: StrictBool
    email_marketing_consent: StrictBool = False
    consent_version: Literal[CONSENT_VERSION]
    turnstile_token: str
    website: str = ""

    @field_validator("full_name")
    @classmethod
    def name(cls, value: str) -> str:
        if any(unicodedata.category(char).startswith("C") for char in value):
            raise ValueError("invalid_fields")
        value = " ".join(value.split())
        if not 2 <= len(value) <= 100:
            raise ValueError("invalid_fields")
        return value

    @field_validator("email")
    @classmethod
    def email_normalized(cls, value: str) -> str:
        if len(value) > 254:
            raise ValueError("invalid_fields")
        return value.casefold()

    @field_validator("phone")
    @classmethod
    def phone_normalized(cls, value: str | None) -> str | None:
        if not value:
            return None
        value = value.strip()
        # Only harmless visual separators; require the explicit country code.
        value = re.sub(r"[ ()-]", "", value)
        if not re.fullmatch(r"\+[1-9][0-9]{7,14}", value):
            raise ValueError("invalid_phone")
        return value

    @field_validator("birthday_day_month")
    @classmethod
    def birthday(cls, value: str | None) -> str | None:
        if not value:
            return None
        match = re.fullmatch(r"([0-9]{1,2})/([0-9]{1,2})", value.strip())
        if not match:
            raise ValueError("invalid_date")
        day, month = map(int, match.groups())
        # A leap-year calendar validates day/month without inventing a birth year.
        if month < 1 or month > 12 or day < 1 or day > calendar.monthrange(2000, month)[1]:
            raise ValueError("invalid_date")
        return f"{day:02d}/{month:02d}"

    @field_validator("registration_consent")
    @classmethod
    def core_consent(cls, value: bool) -> bool:
        if value is not True:
            raise ValueError("consent_required")
        return value

    @field_validator("turnstile_token")
    @classmethod
    def bot_token(cls, value: str) -> str:
        if not value or len(value) > 2048:
            raise ValueError("verification_failed")
        return value

    def storage_payload(self) -> dict:
        payload = self.model_dump(exclude={"turnstile_token", "website"})
        payload["source"] = {
            "utm_source": "qr", "utm_medium": "offline",
            "utm_campaign": "loyalty_el_paso", "utm_content": "registro_v2",
        }
        return payload
