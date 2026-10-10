"""One bounded outbox iteration; importing this module never starts a worker."""

from dataclasses import dataclass
from typing import Any, Mapping, Protocol

from .ghl import (
    Connector,
    DisabledConnector,
    ReviewRequired,
    SyncDisabled,
    SyncResult,
    TransientSyncError,
)


class OutboxJobLike(Protocol):
    job_id: str
    receipt_id: str
    payload: Mapping[str, Any]
    attempts: int
    lease_token: str


class WorkerStore(Protocol):
    """The store owns atomic claims, backoff and the maximum attempt count."""

    def claim(self) -> OutboxJobLike | None: ...

    def mark_synced(self, job_id: str, lease_token: str, contact_id: str) -> bool: ...

    def retry(self, job_id: str, lease_token: str, error_code: str) -> bool: ...

    def mark_review(self, job_id: str, lease_token: str, error_code: str) -> bool: ...


@dataclass(frozen=True)
class WorkerOutcome:
    state: str
    receipt_id: str | None = None


def run_once(store: WorkerStore, connector: Connector | None = None) -> WorkerOutcome:
    """Claim at most one receipt and finish it with the same lease token.

    There is no network-enabled default, polling loop, credential discovery, or
    deletion. ``deferred`` means the store handled the retry; its retry ceiling
    can instead put the receipt in manual review. Exception messages are never
    passed to storage or returned to a caller.
    """
    job = store.claim()
    if job is None:
        return WorkerOutcome("idle")
    active_connector = connector if connector is not None else DisabledConnector()
    try:
        result = active_connector.sync(job.payload, receipt_id=job.receipt_id)
        if not isinstance(result, SyncResult) or not result.contact_id.strip():
            raise ReviewRequired()
    except SyncDisabled:
        accepted = store.retry(job.job_id, job.lease_token, "sync_disabled")
        state = "deferred"
    except (TransientSyncError, TimeoutError, ConnectionError):
        accepted = store.retry(job.job_id, job.lease_token, "transient_error")
        state = "deferred"
    except ReviewRequired:
        accepted = store.mark_review(job.job_id, job.lease_token, "review_required")
        state = "review"
    except Exception:
        # A programming/provider-contract error must not enter an unbounded
        # retry loop or persist an arbitrary exception (which may contain PII).
        accepted = store.mark_review(job.job_id, job.lease_token, "sync_error")
        state = "review"
    else:
        accepted = store.mark_synced(job.job_id, job.lease_token, result.contact_id)
        state = "synced"
    return WorkerOutcome(state if accepted else "lease_lost", job.receipt_id)
