"""Fictional local fixtures only; no HTTP client, credential or live GHL access."""

from dataclasses import asdict, dataclass, replace
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from cryptography.fernet import Fernet

from sy_intake.ghl import (
    BIRTHDAY_FIELD_ID,
    EMAIL_MARKETING_CONSENT_FIELD_ID,
    REGISTRATION_CONSENT_FIELD_ID,
    ConsentEvidence,
    GhlConnector,
    GhlContact,
    GhlPolicy,
    ReviewRequired,
    SyncDisabled,
    SyncResult,
    TransientSyncError,
)
from sy_intake.worker import run_once
from sy_intake.storage import Store
from sy_intake.models import RegistrationInput
from sy_intake.settings import CONSENT_VERSION


def fixture_payload(**changes):
    payload = {
        "full_name": "Fictional Local Fixture",
        "email": "fixture@example.invalid",
        "phone": "+12025550123",
        "birthday_day_month": "29/02",
        "locale": "es",
        "branch": "el-paso",
        "registration_consent": True,
        "email_marketing_consent": False,
        "consent_version": "fixture-v1",
        "source": {
            "utm_source": "qr", "utm_medium": "offline",
            "utm_campaign": "loyalty_el_paso", "utm_content": "registro_v2",
        },
    }
    return payload | changes


@dataclass(frozen=True)
class FixtureJob:
    job_id: str
    receipt_id: str
    payload: dict
    attempts: int
    lease_token: str


class FixtureStore:
    """Models the atomic lease contract, not the production persistence logic."""

    def __init__(self, payload=None, max_attempts=8):
        self.payload = payload if payload is not None else fixture_payload()
        self.state = "pending"
        self.attempts = 0
        self.max_attempts = max_attempts
        self.lease_token = ""
        self.actions = []
        self.contact_id = None

    def claim(self):
        if self.state != "pending":
            return None
        self.attempts += 1
        self.lease_token = f"fixture-lease-{self.attempts}"
        self.state = "processing"
        return FixtureJob(
            "fixture-job", "fixture-receipt", self.payload.copy(), self.attempts,
            self.lease_token,
        )

    def _finish(self, job_id, lease_token, state, value):
        self.actions.append((job_id, lease_token, state, value))
        if (
            job_id != "fixture-job"
            or lease_token != self.lease_token
            or self.state != "processing"
        ):
            return False
        self.state = state
        return True

    def mark_synced(self, job_id, lease_token, contact_id):
        accepted = self._finish(job_id, lease_token, "synced", contact_id)
        if accepted:
            self.contact_id = contact_id
        return accepted

    def retry(self, job_id, lease_token, error_code):
        state = "review" if self.attempts >= self.max_attempts else "pending"
        return self._finish(job_id, lease_token, state, error_code)

    def mark_review(self, job_id, lease_token, error_code):
        return self._finish(job_id, lease_token, "review", error_code)


class FixtureConnector:
    def __init__(self, result=None, error=None):
        self.result = result if result is not None else SyncResult("fixture-contact")
        self.error = error
        self.receipts = []

    def sync(self, payload, *, receipt_id):
        self.receipts.append(receipt_id)
        if self.error is not None:
            raise self.error
        return self.result


def verified_fixture_policy(**changes):
    # This policy is a fictional test capability; no settings load it by default.
    return replace(
        GhlPolicy(
            write_authorized=True,
            lookup_contract_verified=True,
            field_write_contract_verified=True,
            scopes_verified=True,
            creation_idempotency_verified=True,
            location_id="fixture-location",
            api_version="fixture-contract-v1",
            auth_kind="pit",
            lookup_contract="legacy-exact",
            branch="el-paso",
        ),
        **changes,
    )


class FixtureTransport:
    """In-memory transport; never creates a socket or reads credentials."""

    def __init__(self, email_contacts=(), phone_contacts=()):
        self.email_contacts = list(email_contacts)
        self.phone_contacts = list(phone_contacts)
        self.calls = []
        self.created = []
        self.updates = []
        self.lookup_error = None
        self.timeout_after_create = False
        self.created_keys = {}
        self.remote_preserved = {
            "full_name": "Existing Fictional Name",
            "email": "fixture@example.invalid",
            "phone": "+12025550123",
            "source": "existing-fixture-source",
            "tags": ["existing-fixture-tag"],
            "dnd": True,
            "dndSettings": {"Email": {"status": "active"}},
        }

    def lookup_email(self, email, *, policy):
        self.calls.append(("lookup_email", email))
        if self.lookup_error is not None:
            raise self.lookup_error
        return self.email_contacts

    def lookup_phone(self, phone, *, policy):
        self.calls.append(("lookup_phone", phone))
        if self.lookup_error is not None:
            raise self.lookup_error
        return self.phone_contacts

    def create_contact(self, document, *, policy, operation_key):
        self.calls.append(("create_contact", operation_key))
        if operation_key not in self.created_keys:
            self.created.append(document)
            self.created_keys[operation_key] = "fixture-created-contact"
            contact = GhlContact(
                "fixture-created-contact", document.email, document.phone,
                {item.field_id: item.value for item in document.custom_fields},
            )
            self.email_contacts = [contact]
            self.phone_contacts = [contact] if document.phone is not None else []
        if self.timeout_after_create:
            self.timeout_after_create = False
            raise TimeoutError("fictional provider response containing fixture@example.invalid")
        return self.created_keys[operation_key]

    def update_custom_fields(self, contact_id, document, *, policy, operation_key):
        self.calls.append(("update_custom_fields", operation_key))
        self.updates.append((contact_id, document))
        return contact_id


class WorkerTests(unittest.TestCase):
    def test_empty_queue_is_idle_without_connector(self):
        store = FixtureStore()
        store.state = "synced"
        self.assertEqual(run_once(store).state, "idle")
        self.assertEqual(store.actions, [])

    def test_default_is_disabled_and_keeps_payload_pending(self):
        store = FixtureStore()
        original = store.payload.copy()
        self.assertEqual(run_once(store).state, "deferred")
        self.assertEqual(store.state, "pending")
        self.assertEqual(store.payload, original)
        self.assertEqual(store.actions[-1][3], "sync_disabled")

    def test_success_finishes_with_claimed_lease_and_receipt(self):
        store = FixtureStore()
        connector = FixtureConnector()
        self.assertEqual(run_once(store, connector).state, "synced")
        self.assertEqual(connector.receipts, ["fixture-receipt"])
        self.assertEqual(
            store.actions,
            [("fixture-job", "fixture-lease-1", "synced", "fixture-contact")],
        )
        self.assertEqual(run_once(store, connector).state, "idle")
        self.assertEqual(len(connector.receipts), 1)

    def test_provider_down_and_timeout_use_bounded_retry_without_raw_errors(self):
        for error in (
            TransientSyncError("fixture@example.invalid"),
            TimeoutError("fictional response with fixture@example.invalid"),
            ConnectionError("fictional response with fixture@example.invalid"),
        ):
            with self.subTest(error=type(error).__name__):
                store = FixtureStore(max_attempts=2)
                connector = FixtureConnector(error=error)
                self.assertEqual(run_once(store, connector).state, "deferred")
                self.assertEqual(store.state, "pending")
                self.assertEqual(store.actions[-1][3], "transient_error")
                run_once(store, connector)
                self.assertEqual(store.state, "review")
                self.assertEqual(store.attempts, 2)
                self.assertEqual(run_once(store, connector).state, "idle")
                self.assertNotIn("@", repr(store.actions))

    def test_ambiguous_identity_goes_to_review(self):
        store = FixtureStore()
        outcome = run_once(store, FixtureConnector(error=ReviewRequired("private raw detail")))
        self.assertEqual(outcome.state, "review")
        self.assertEqual(store.actions[-1][3], "review_required")
        self.assertEqual(store.payload, fixture_payload())

    def test_unexpected_exception_goes_to_review_without_raw_details(self):
        store = FixtureStore()
        run_once(store, FixtureConnector(error=ValueError("fixture@example.invalid")))
        self.assertEqual(store.state, "review")
        self.assertEqual(store.actions[-1][3], "sync_error")
        self.assertNotIn("@", repr(store.actions))

    def test_stale_worker_cannot_complete_new_lease(self):
        store = FixtureStore()

        class ReclaimedConnector:
            def sync(self, payload, *, receipt_id):
                store.lease_token = "fixture-new-lease"
                return SyncResult("fixture-contact")

        self.assertEqual(run_once(store, ReclaimedConnector()).state, "lease_lost")
        self.assertEqual(store.state, "processing")
        self.assertIsNone(store.contact_id)
        self.assertEqual(store.actions[-1][1], "fixture-lease-1")


class DurableWorkerTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.path = Path(self.directory.name).resolve() / "private" / "fixture.sqlite3"
        self.key = Fernet.generate_key().decode("ascii")
        self.store = Store(self.path, self.key)
        self.store.initialize()
        self.payload = fixture_payload()
        self.receipt = self.store.save("fixture-submission", self.payload)

    def test_provider_down_remains_durable_after_process_restart_then_syncs(self):
        connector = FixtureConnector(error=TransientSyncError("fictional unreachable provider"))
        with patch("sy_intake.storage.time.time", return_value=1000):
            self.assertEqual(run_once(self.store, connector).state, "deferred")
        reopened = Store(self.path, self.key)
        reopened.initialize()
        self.assertEqual(reopened.replay("fixture-submission", self.payload).sync_status, "pending")
        with patch("sy_intake.storage.time.time", return_value=1004):
            self.assertEqual(run_once(reopened, FixtureConnector()).state, "idle")
        with patch("sy_intake.storage.time.time", return_value=1005):
            self.assertEqual(run_once(reopened, FixtureConnector()).state, "synced")
        receipt = reopened.replay("fixture-submission", self.payload)
        self.assertEqual(receipt.receipt_id, self.receipt.receipt_id)
        self.assertEqual(receipt.sync_status, "synced")

    def test_bounded_real_outbox_retry_keeps_receipt_and_stops_at_eight_claims(self):
        connector = FixtureConnector(error=TimeoutError("fixture@example.invalid"))
        for attempt in range(8):
            with patch("sy_intake.storage.time.time", return_value=1000 + attempt * 4000):
                self.assertEqual(run_once(self.store, connector).state, "deferred")
        receipt = self.store.replay("fixture-submission", self.payload)
        self.assertEqual(receipt.sync_status, "review")
        self.assertEqual(receipt.receipt_id, self.receipt.receipt_id)
        with patch("sy_intake.storage.time.time", return_value=100000):
            self.assertEqual(run_once(self.store, connector).state, "idle")
        self.assertEqual(connector.receipts, [self.receipt.receipt_id] * 8)

    def test_timeout_after_create_retries_same_durable_receipt_without_duplicate(self):
        transport = FixtureTransport()
        transport.timeout_after_create = True
        connector = GhlConnector(transport, verified_fixture_policy())
        with patch("sy_intake.storage.time.time", return_value=1000):
            self.assertEqual(run_once(self.store, connector).state, "deferred")
        reopened = Store(self.path, self.key)
        reopened.initialize()
        with patch("sy_intake.storage.time.time", return_value=1005):
            self.assertEqual(run_once(reopened, connector).state, "synced")
        self.assertEqual(len(transport.created), 1)
        self.assertEqual(transport.updates, [])
        self.assertEqual(self.store.replay("fixture-submission", self.payload).sync_status, "synced")

    def test_ambiguous_identity_preserves_durable_payload_for_review(self):
        connector = FixtureConnector(error=ReviewRequired())
        with patch("sy_intake.storage.time.time", return_value=1000):
            self.assertEqual(run_once(self.store, connector).state, "review")
        receipt = self.store.replay("fixture-submission", self.payload)
        self.assertEqual(receipt.receipt_id, self.receipt.receipt_id)
        self.assertEqual(receipt.sync_status, "review")

    def test_reclaimed_real_lease_rejects_old_completion(self):
        with patch("sy_intake.storage.time.time", return_value=1000):
            old = self.store.claim(lease_seconds=1)
        with patch("sy_intake.storage.time.time", return_value=1001):
            new = self.store.claim()
        self.assertEqual(old.receipt_id, new.receipt_id)
        self.assertNotEqual(old.lease_token, new.lease_token)
        self.assertFalse(self.store.mark_synced(old.job_id, old.lease_token, "fixture-stale-contact"))
        self.assertTrue(self.store.mark_synced(new.job_id, new.lease_token, "fixture-contact"))
        self.assertEqual(self.store.replay("fixture-submission", self.payload).sync_status, "synced")

    def test_api_model_to_durable_store_to_mock_transport_preserves_contract(self):
        inputs = fixture_payload(email="fixture-pipeline@example.com", consent_version=CONSENT_VERSION)
        del inputs["source"]
        inputs["turnstile_token"] = "local-qa-only"
        normalized = RegistrationInput.model_validate(inputs).storage_payload()
        pipeline_store = Store(self.path.parent / "fixture-pipeline.sqlite3", self.key)
        pipeline_store.initialize()
        receipt = pipeline_store.save("fixture-pipeline-submission", normalized)
        transport = FixtureTransport()
        connector = GhlConnector(transport, verified_fixture_policy())
        with patch("sy_intake.storage.time.time", return_value=1000):
            self.assertEqual(run_once(pipeline_store, connector).state, "synced")
        documents = [item for item in transport.created if item.email == normalized["email"]]
        self.assertEqual(len(documents), 1)
        self.assertEqual(documents[0].source, normalized["source"])
        self.assertEqual(
            pipeline_store.replay("fixture-pipeline-submission", normalized).receipt_id,
            receipt.receipt_id,
        )
        self.assertEqual(pipeline_store.replay("fixture-pipeline-submission", normalized).sync_status, "synced")


class GhlPreparedAdapterTests(unittest.TestCase):
    def test_disabled_default_and_each_missing_gate_never_call_transport(self):
        policies = [GhlPolicy()]
        for gate in (
            "write_authorized", "lookup_contract_verified", "field_write_contract_verified",
            "scopes_verified",
        ):
            policies.append(verified_fixture_policy(**{gate: False}))
            policies.append(verified_fixture_policy(**{gate: "false"}))
        for required in ("location_id", "api_version", "auth_kind", "lookup_contract", "branch"):
            policies.append(verified_fixture_policy(**{required: ""}))
            policies.append(verified_fixture_policy(**{required: None}))
        policies.append(verified_fixture_policy(auth_kind="pit", lookup_contract="oauth-exact"))
        for policy in policies:
            with self.subTest(policy=policy):
                transport = FixtureTransport()
                with self.assertRaises(SyncDisabled):
                    GhlConnector(transport, policy).sync(fixture_payload(), receipt_id="fixture-receipt")
                self.assertEqual(transport.calls, [])

    def test_duplicate_matches_and_crossed_identity_never_write_or_merge(self):
        one = GhlContact("fixture-one", "fixture@example.invalid", "+12025550123")
        other = GhlContact("fixture-two", "fixture@example.invalid", "+12025550123")
        for email_contacts, phone_contacts in (([one, other], []), ([one], [other])):
            with self.subTest(email_contacts=email_contacts):
                transport = FixtureTransport(email_contacts, phone_contacts)
                with self.assertRaises(ReviewRequired):
                    GhlConnector(transport, verified_fixture_policy()).sync(
                        fixture_payload(), receipt_id="fixture-receipt"
                    )
                self.assertEqual(transport.created, [])
                self.assertEqual(transport.updates, [])

    def test_fuzzy_lookup_or_inconsistent_existing_identity_requires_review(self):
        cases = (
            FixtureTransport([GhlContact("fixture-contact", "other@example.invalid")]),
            FixtureTransport([GhlContact("fixture-contact", "fixture@example.invalid", "+12025550124")]),
            FixtureTransport([], [GhlContact("fixture-contact", "other@example.invalid", "+12025550123")]),
        )
        for transport in cases:
            with self.subTest(contacts=transport.email_contacts):
                with self.assertRaises(ReviewRequired):
                    GhlConnector(transport, verified_fixture_policy()).sync(
                        fixture_payload(), receipt_id="fixture-receipt"
                    )
                self.assertEqual(transport.updates, [])
                self.assertEqual(transport.created, [])

    def test_existing_contact_changes_only_custom_fields_preserving_dnd(self):
        contact = GhlContact("fixture-contact", "fixture@example.invalid", "+12025550123", {})
        transport = FixtureTransport([contact], [contact])
        preserved = {**transport.remote_preserved, "tags": transport.remote_preserved["tags"].copy()}
        connector = GhlConnector(transport, verified_fixture_policy())
        result = connector.sync(fixture_payload(), receipt_id="fixture-receipt")
        self.assertEqual(result.contact_id, "fixture-contact")
        self.assertEqual(transport.created, [])
        document = transport.updates[0][1]
        self.assertEqual(set(asdict(document)), {"custom_fields"})
        self.assertEqual(transport.remote_preserved, preserved)
        fields = {item.field_id: item.value for item in document.custom_fields}
        self.assertEqual(fields[BIRTHDAY_FIELD_ID], "29/02")
        self.assertEqual(fields[REGISTRATION_CONSENT_FIELD_ID], ConsentEvidence(True, "fixture-v1"))
        self.assertNotIn(EMAIL_MARKETING_CONSENT_FIELD_ID, fields)

    def test_blank_optional_fields_do_not_revoke_or_invent_birthday(self):
        contact = GhlContact("fixture-contact", "fixture@example.invalid", "+12025550123", {})
        transport = FixtureTransport([contact], [contact])
        GhlConnector(transport, verified_fixture_policy()).sync(
            fixture_payload(phone=None, birthday_day_month=None), receipt_id="fixture-receipt"
        )
        field_ids = {item.field_id for item in transport.updates[0][1].custom_fields}
        self.assertEqual(field_ids, {REGISTRATION_CONSENT_FIELD_ID})
        self.assertEqual([call[0] for call in transport.calls], ["lookup_email", "update_custom_fields"])

    def test_marketing_check_records_evidence_without_delivery_settings(self):
        transport = FixtureTransport()
        GhlConnector(transport, verified_fixture_policy()).sync(
            fixture_payload(email_marketing_consent=True), receipt_id="fixture-receipt"
        )
        document = transport.created[0]
        fields = {item.field_id: item.value for item in document.custom_fields}
        self.assertEqual(fields[EMAIL_MARKETING_CONSENT_FIELD_ID], ConsentEvidence(True, "fixture-v1"))
        self.assertEqual(set(asdict(document)), {"full_name", "email", "phone", "source", "custom_fields"})

    def test_new_contact_needs_verified_creation_idempotency(self):
        transport = FixtureTransport()
        connector = GhlConnector(transport, verified_fixture_policy(creation_idempotency_verified=False))
        with self.assertRaises(SyncDisabled):
            connector.sync(fixture_payload(), receipt_id="fixture-receipt")
        self.assertEqual(transport.created, [])

    def test_create_timeout_retry_links_same_contact_without_duplicate_creation(self):
        store = FixtureStore()
        transport = FixtureTransport()
        transport.timeout_after_create = True
        connector = GhlConnector(transport, verified_fixture_policy())
        self.assertEqual(run_once(store, connector).state, "deferred")
        self.assertEqual(store.state, "pending")
        self.assertEqual(run_once(store, connector).state, "synced")
        self.assertEqual(store.contact_id, "fixture-created-contact")
        self.assertEqual(len(transport.created), 1)
        self.assertEqual(len(transport.updates), 0)
        self.assertEqual([action[1] for action in store.actions], ["fixture-lease-1", "fixture-lease-2"])

    def test_existing_evidence_is_never_overwritten(self):
        existing_fields = {
            BIRTHDAY_FIELD_ID: "29/02",
            REGISTRATION_CONSENT_FIELD_ID: ConsentEvidence(True, "fixture-v1"),
            EMAIL_MARKETING_CONSENT_FIELD_ID: ConsentEvidence(True, "fixture-previous-version"),
        }
        contact = GhlContact(
            "fixture-contact", "fixture@example.invalid", "+12025550123", existing_fields
        )
        transport = FixtureTransport([contact], [contact])
        result = GhlConnector(transport, verified_fixture_policy()).sync(
            fixture_payload(), receipt_id="fixture-receipt"
        )
        self.assertEqual(result.contact_id, "fixture-contact")
        self.assertEqual(transport.updates, [])
        self.assertEqual(existing_fields[EMAIL_MARKETING_CONSENT_FIELD_ID].version, "fixture-previous-version")
        for changes in (
            {"birthday_day_month": "28/02"},
            {"consent_version": "fixture-new-version"},
            {"email_marketing_consent": True},
        ):
            with self.subTest(changes=changes):
                with self.assertRaises(ReviewRequired):
                    GhlConnector(transport, verified_fixture_policy()).sync(
                        fixture_payload(**changes), receipt_id="fixture-receipt"
                    )
                self.assertEqual(transport.updates, [])

    def test_unknown_existing_field_snapshot_or_encoding_requires_review(self):
        for fields in (
            None,
            {BIRTHDAY_FIELD_ID: "2000-02-29"},
            {REGISTRATION_CONSENT_FIELD_ID: True},
            {EMAIL_MARKETING_CONSENT_FIELD_ID: ["accepted"]},
        ):
            with self.subTest(fields=fields):
                contact = GhlContact("fixture-contact", "fixture@example.invalid", "+12025550123", fields)
                transport = FixtureTransport([contact], [contact])
                with self.assertRaises(ReviewRequired):
                    GhlConnector(transport, verified_fixture_policy()).sync(
                        fixture_payload(), receipt_id="fixture-receipt"
                    )
                self.assertEqual(transport.updates, [])

    def test_invalid_or_year_birthday_and_missing_consent_fail_before_transport(self):
        for change in (
            {"birthday_day_month": "29/02/2000"},
            {"birthday_day_month": "31/04"},
            {"birthday_day_month": "00/12"},
            {"birthday_day_month": "01/13"},
            {"birthday_day_month": "aa/bb"},
            {"registration_consent": False},
            {"consent_version": ""},
            {"email_marketing_consent": None},
        ):
            with self.subTest(change=change):
                transport = FixtureTransport()
                with self.assertRaises(ReviewRequired):
                    GhlConnector(transport, verified_fixture_policy()).sync(
                        fixture_payload(**change), receipt_id="fixture-receipt"
                    )
                self.assertEqual(transport.calls, [])


if __name__ == "__main__":
    unittest.main()
