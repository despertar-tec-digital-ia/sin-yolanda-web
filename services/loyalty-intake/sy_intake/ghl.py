"""Offline GHL sync contract with no HTTP implementation or credential loading.

An injected transport is usable only after its lookup, authentication, scope,
field-write and creation-idempotency contracts have been independently verified
and the write gate explicitly authorized. This module does not assume the v3
OAuth-only lookup accepts a Private Integration Token. It never uses upsert,
merges, DND, tags, campaigns, workflows, messages, notes or opportunities.
"""

from dataclasses import dataclass
from typing import Any, Mapping, Protocol, Sequence


BIRTHDAY_FIELD_ID = "QyrLBUU32G9rsMJh5SJ0"
REGISTRATION_CONSENT_FIELD_ID = "gF40OUamadQTWNwhePeT"
EMAIL_MARKETING_CONSENT_FIELD_ID = "mvpuYUBFzdWhuS36d87j"
_SOURCE_ATTRIBUTION = {
    "utm_source": "qr",
    "utm_medium": "offline",
    "utm_campaign": "loyalty_el_paso",
    "utm_content": "registro_v2",
}


class SyncDisabled(Exception):
    """Synchronization has no verified, authorized transport."""


class TransientSyncError(Exception):
    """A bounded retry is safe; the transport guarantees idempotent writes."""


class ReviewRequired(Exception):
    """Ambiguous identity or an unverified contract needs manual review."""


@dataclass(frozen=True)
class SyncResult:
    contact_id: str


class Connector(Protocol):
    def sync(self, payload: Mapping[str, Any], *, receipt_id: str) -> SyncResult: ...


class DisabledConnector:
    def sync(self, payload: Mapping[str, Any], *, receipt_id: str) -> SyncResult:
        raise SyncDisabled()


@dataclass(frozen=True)
class GhlPolicy:
    """No boolean here is inferred from environment variables or API access."""

    write_authorized: bool = False
    lookup_contract_verified: bool = False
    field_write_contract_verified: bool = False
    scopes_verified: bool = False
    creation_idempotency_verified: bool = False
    location_id: str = ""
    api_version: str = ""
    auth_kind: str = ""
    lookup_contract: str = ""
    branch: str = ""

    def permits_transport(self) -> bool:
        return (
            self.write_authorized is True
            and self.lookup_contract_verified is True
            and self.field_write_contract_verified is True
            and self.scopes_verified is True
            and all(
                isinstance(value, str) and bool(value.strip())
                for value in (self.location_id, self.api_version, self.branch)
            )
            and (
                (self.auth_kind == "pit" and self.lookup_contract == "legacy-exact")
                or (self.auth_kind == "oauth" and self.lookup_contract == "oauth-exact")
            )
        )


@dataclass(frozen=True)
class GhlContact:
    contact_id: str
    email: str | None = None
    phone: str | None = None
    # None is an unknown snapshot, not evidence that existing fields are empty.
    custom_fields: Mapping[str, Any] | None = None


@dataclass(frozen=True)
class ConsentEvidence:
    """Semantic evidence; a future verified transport defines wire encoding."""

    accepted: bool
    version: str


@dataclass(frozen=True)
class CustomFieldValue:
    field_id: str
    value: str | ConsentEvidence


@dataclass(frozen=True)
class ContactCreate:
    full_name: str
    email: str
    phone: str | None
    # Semantic attribution, not a pre-serialized GHL native "source" value.
    source: Mapping[str, str]
    custom_fields: tuple[CustomFieldValue, ...]


@dataclass(frozen=True)
class ContactFieldUpdate:
    """Existing contacts can receive only these fields; no identity updates."""

    custom_fields: tuple[CustomFieldValue, ...]


class GhlTransport(Protocol):
    """Future transport contract, deliberately independent of any HTTP client.

    Lookups must be complete exact matches scoped to the policy's location.
    Mutation methods must never synthesize defaults for fields absent from the
    document. ``operation_key`` is an actual deduplication guarantee supplied by
    that verified transport, not a claim that GHL accepts an idempotency header.
    Timeouts after an uncertain write must raise ReviewRequired unless that
    transport can prove a replay cannot create a second contact.
    """

    def lookup_email(self, email: str, *, policy: GhlPolicy) -> Sequence[GhlContact]: ...

    def lookup_phone(self, phone: str, *, policy: GhlPolicy) -> Sequence[GhlContact]: ...

    def create_contact(
        self, document: ContactCreate, *, policy: GhlPolicy, operation_key: str
    ) -> str: ...

    def update_custom_fields(
        self,
        contact_id: str,
        document: ContactFieldUpdate,
        *,
        policy: GhlPolicy,
        operation_key: str,
    ) -> str: ...


def _email(value: str | None) -> str:
    return value.strip().casefold() if isinstance(value, str) else ""


def _exact_contact(
    contacts: Sequence[GhlContact], *, email: str | None = None, phone: str | None = None
) -> GhlContact | None:
    matches: dict[str, GhlContact] = {}
    for contact in contacts:
        if (
            not isinstance(contact, GhlContact)
            or not isinstance(contact.contact_id, str)
            or not contact.contact_id.strip()
        ):
            raise ReviewRequired()
        # A fuzzy/partial provider response is not a verified exact lookup.
        if (email is not None and _email(contact.email) != email) or (
            phone is not None and contact.phone != phone
        ):
            raise ReviewRequired()
        previous = matches.get(contact.contact_id)
        if previous is not None and previous != contact:
            raise ReviewRequired()
        matches[contact.contact_id] = contact
    if len(matches) > 1:
        raise ReviewRequired()
    return next(iter(matches.values()), None)


def _birthday(value: Any) -> str:
    if (
        not isinstance(value, str)
        or len(value) != 5
        or value[2] != "/"
        or not value[:2].isascii()
        or not value[3:].isascii()
        or not value[:2].isdigit()
        or not value[3:].isdigit()
    ):
        raise ReviewRequired()
    day, month = int(value[:2]), int(value[3:])
    maximum_days = (31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31)
    if not 1 <= month <= 12 or not 1 <= day <= maximum_days[month - 1]:
        raise ReviewRequired()
    return value


def _fields(payload: Mapping[str, Any]) -> tuple[CustomFieldValue, ...]:
    version = payload.get("consent_version")
    if (
        payload.get("registration_consent") is not True
        or not isinstance(version, str)
        or not version.strip()
    ):
        raise ReviewRequired()
    values = [
        CustomFieldValue(REGISTRATION_CONSENT_FIELD_ID, ConsentEvidence(True, version))
    ]
    birthday = payload.get("birthday_day_month")
    if birthday is not None:
        values.append(CustomFieldValue(BIRTHDAY_FIELD_ID, _birthday(birthday)))
    marketing = payload.get("email_marketing_consent")
    if marketing is not True and marketing is not False:
        raise ReviewRequired()
    # Unchecked does not revoke a previous opt-in, and checked records evidence
    # only. Neither case enables campaigns or changes delivery preferences.
    if marketing:
        values.append(
            CustomFieldValue(EMAIL_MARKETING_CONSENT_FIELD_ID, ConsentEvidence(True, version))
        )
    return tuple(values)


def _existing_updates(
    contact: GhlContact, incoming: tuple[CustomFieldValue, ...]
) -> tuple[CustomFieldValue, ...]:
    if not isinstance(contact.custom_fields, Mapping):
        raise ReviewRequired()
    for field_id in (
        BIRTHDAY_FIELD_ID,
        REGISTRATION_CONSENT_FIELD_ID,
        EMAIL_MARKETING_CONSENT_FIELD_ID,
    ):
        existing = contact.custom_fields.get(field_id)
        if existing is None:
            continue
        if field_id == BIRTHDAY_FIELD_ID:
            _birthday(existing)
        elif (
            not isinstance(existing, ConsentEvidence)
            or not isinstance(existing.accepted, bool)
            or not isinstance(existing.version, str)
            or not existing.version.strip()
        ):
            # Raw checkbox/string formats cannot be interpreted before a
            # provider-specific field contract has been verified.
            raise ReviewRequired()
    pending = []
    for item in incoming:
        existing = contact.custom_fields.get(item.field_id)
        if existing is None:
            pending.append(item)
        elif existing != item.value:
            # Keep both the durable receipt and pre-existing CRM evidence.
            # Conflicts require a person; this adapter never overwrites them.
            raise ReviewRequired()
    return tuple(pending)


class GhlConnector:
    """Prepared adapter for an explicitly supplied, verified future transport."""

    def __init__(
        self, transport: GhlTransport | None = None, policy: GhlPolicy | None = None
    ):
        self.transport = transport
        self.policy = policy if policy is not None else GhlPolicy()

    def sync(self, payload: Mapping[str, Any], *, receipt_id: str) -> SyncResult:
        if self.transport is None or not self.policy.permits_transport():
            raise SyncDisabled()
        if (
            payload.get("branch") != self.policy.branch
            or not isinstance(receipt_id, str)
            or not receipt_id.strip()
        ):
            raise ReviewRequired()
        email = _email(payload.get("email"))
        full_name = payload.get("full_name")
        phone = payload.get("phone")
        source = payload.get("source")
        if (
            not email
            or not isinstance(full_name, str)
            or not full_name.strip()
            or not isinstance(source, Mapping)
            or dict(source) != _SOURCE_ATTRIBUTION
            or (phone is not None and (not isinstance(phone, str) or not phone.strip()))
        ):
            raise ReviewRequired()
        fields = _fields(payload)
        email_match = _exact_contact(
            self.transport.lookup_email(email, policy=self.policy), email=email
        )
        phone_match = (
            _exact_contact(self.transport.lookup_phone(phone, policy=self.policy), phone=phone)
            if phone is not None
            else None
        )
        if email_match and phone_match and email_match.contact_id != phone_match.contact_id:
            raise ReviewRequired()
        contact = email_match or phone_match
        if contact is not None:
            if (contact.email and _email(contact.email) != email) or (
                phone is not None and contact.phone and contact.phone != phone
            ):
                raise ReviewRequired()
            if email_match and phone_match and email_match != phone_match:
                raise ReviewRequired()
            pending = _existing_updates(contact, fields)
            if not pending:
                return SyncResult(contact.contact_id)
            document = ContactFieldUpdate(pending)
            try:
                contact_id = self.transport.update_custom_fields(
                    contact.contact_id,
                    document,
                    policy=self.policy,
                    operation_key=f"{receipt_id}:fields",
                )
            except (TimeoutError, ConnectionError) as exc:
                raise TransientSyncError() from exc
            if contact_id != contact.contact_id:
                raise ReviewRequired()
        else:
            if self.policy.creation_idempotency_verified is not True:
                raise SyncDisabled()
            document = ContactCreate(full_name.strip(), email, phone, dict(source), fields)
            try:
                contact_id = self.transport.create_contact(
                    document, policy=self.policy, operation_key=f"{receipt_id}:create"
                )
            except (TimeoutError, ConnectionError) as exc:
                # Replaying a creation is safe only under the explicit transport
                # guarantee required above. There is no built-in HTTP transport.
                raise TransientSyncError() from exc
        if not isinstance(contact_id, str) or not contact_id.strip():
            raise ReviewRequired()
        return SyncResult(contact_id)
