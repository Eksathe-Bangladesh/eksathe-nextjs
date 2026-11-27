# Pickup proof and warehouse handover foundation

## Implemented scope

PROMPT 41 adds isolated pure pickup, inspection/receiving and custody contracts,
`createLogisticsHandoverService(dependencies)`, synthetic tests and this guide.
The service exposes `execute(command)` and `get(pickupId)`. No route, Prisma model,
database adapter, authentication system, upload service or real proof verification
is introduced. PROMPT 35–40 and BDT financial contracts are unchanged.

SRS v3.0 remains a Final Draft. Sections 4.2/4.3 describe pickup events, controlled
proof references and restricted media; security requirements cover least privilege
and append-only history. The inspected SRS text does not define warehouse custody
policies. Warehouse requirements here come from PROMPT 41, not invented SRS IDs or
stakeholder approvals. All operational policies remain injected pending approval.

## Composition and logical records

Inject request-bound shared-auth identity, exact-command authorization, integration
facts, proof verifier, evidence-consumption authorization, policies, clock, secure
identifier generators and repository. Missing dependencies fail closed without
logging input or raw errors. A policy's `approved` field is an interface contract,
not proof of stakeholder consent; only trusted server composition supplies it.

Pickup contains independent ID/reference, booking/trip references, optional Shipment
reference, trusted assigned agent, opaque location reference, scheduled/actual time,
goods description, unit, expected/collected quantities, optional measurements,
condition and notes. Inspection, receiving, transfer and acknowledgment have their
own IDs, records and immutable history entries. The aggregate version coordinates
them; it does not replace booking, Shipment, trip or assignment versions.

Integration facts must independently resolve the existing authorized Transport
booking/trip, customer/provider, pickup agent, location/schedule and initial
custodian. The existing trip schema is reused. An optional linked Shipment uses
the existing tracking schema; an optional assignment uses the existing assignment
validator. Gateways must validate eligibility, active assignment and the approved
relationship, not merely deserialize caller IDs. A driver is not automatically a
delivery agent. Facts/revisions must be rechecked atomically at commit. Historic
assigned-agent changes currently fail closed and require a reviewed reassignment
integration; they are not silently applied to existing pickup records.

No external booking/trip/Shipment status is changed. Tracking, vehicle/driver
management and pricing are reused through existing integration boundaries rather
than duplicated. No money calculation or payment feature belongs to this milestone.

## Proof references and consumption

Commands accept only `{id, mode}` handles: OTP, SIGNATURE, PHOTO, WITNESS or MANUAL.
Unknown fields, plaintext OTP, signature bodies and raw image payloads are rejected.
Witness/manual attestations reuse the existing CONFIRMATION proof kind and require
a trusted confirmation actor reference. Their authority must be checked by the
verifier against policy; a supplied user ID alone is not authorization.

The attestation schema reuses PROMPT 38's verification fields. It adds pickup,
booking/trip, optional Shipment and action-purpose bindings without manufacturing
a fake Shipment or delivery attempt. If an actual delivery-attempt linkage exists,
the existing `validateDeliveryProof` is also invoked. Required proof modes are
injected per action. Attestations must be authorized, verified, unused, bound to the
pickup agent/context/purpose and policy version, and valid at the injected clock.

Proof verification is part of confirm/inspect/transfer/acknowledge. No independent
OTP or cryptographic verifier is implemented. The consumption gateway approves
the exact evidence set; it must not consume evidence itself. The repository performs
compare-and-consume with evidence revision/expiry checks in the same transaction as
the operational record and audit. Global uniqueness is required across consumers,
including earlier Delivery/Transport proof users. Local history rejects reuse too.
Raw attestation digests/metadata are private commit inputs, not public history.

## Quantities and inspection

Quantities are canonical decimal strings with at most three fractional places and
Decimal(12,3)-compatible bounds. Comparison/subtraction/addition uses integer
thousandths; no rounding, unit conversion or monetary arithmetic occurs. Expected
pickup quantity is positive; collected/observed/accepted/rejected quantities may
be zero. The trusted gateway must approve the opaque unit and goods context.
Weight/volume reuse existing measurement validation with injected maximums.

Pickup inspection compares original expectation with collected quantity. Warehouse
inspection compares collected quantity with observed received quantity. Shortage,
excess and missing-goods flags are derived, while visible damage, packaging,
condition and configured outcome remain observations. Outcome names come from an
allowlist; none automatically accepts or rejects goods. Trusted inspector identity
and evidence references are recorded separately from notes.

Arrival/inspection/pickup/transfer/acknowledgment times are validated, normalized UTC
and cannot be future operational facts. An earlier-than-scheduled pickup is not
automatically rejected: scheduling tolerance is an authorization policy decision.

## Warehouse receiving and custody

Receiving requires confirmed pickup, an authorized warehouse inspection, matching
condition/observed quantity and accepted + rejected = received. Warehouse/storage
IDs are opaque. The gateway must verify storage belongs to the warehouse and staff
scope, and explicitly return a disposition decision revision for the exact request.
This applies even to undamaged goods; damaged/missing/excess goods are never
automatically approved. One receiving per warehouse per pickup is currently enforced
to prevent duplicate physical receiving; repeat visits need separately approved
contracts. Receiving does not itself transfer custody.

A transfer proposes previous/new custodian, complete collected quantity, condition,
time, reason, optional receiving link and evidence. It requires confirmed pickup,
the current source custodian, a different target, approved scopes, no pending
transfer and matching quantities. Duplicate transfer identities/observations are
rejected. Linked receiving must match quantity/condition. It leaves custody with
the source until authorized target acknowledgment is appended. Acknowledgment is
single-use, cannot predate transfer, and changes the current-custodian pointer.

The foundation supports whole-lot transfers only. It does not invent partial-lot
splits, discrepancy reconciliation, loss write-offs, return-to-warehouse policies or
stock accounting. Shortage/excess inspection and receiving can be recorded, but a
quantity-mismatched custody transfer remains blocked until a future approved
reconciliation contract exists. Accepted/rejected goods are not silently removed
from physical custody. Cancellation/exception operations require injected lifecycle
rules; cancellation cannot discard an unresolved pending handover.

## Authorization and privacy

Grants bind exact action, actor, pickup, customer/provider, permitted warehouses and
custodians, subject identity and revision. Customer reads additionally match the
authenticated customer. Agent/driver access matches the assigned user. Warehouse
commands check explicit warehouse scope; warehouse reads require associated records.
Provider membership, staff-to-warehouse mapping, receiving authority and target
custodian acknowledgment rights are trusted gateway responsibilities and must be
rechecked at commit. These audiences are projections, not new shared auth roles.

There is no public read grant. Unauthorized/missing reads return the same generic
unavailable result. Default projections include reference, status, quantities and
minimal action/time history only. They omit location, goods description, notes,
actors, identity documents, proof handles/contents and custodian internals. Only an
explicit operations detail grant (`includeNotes`) exposes full private operational
records; adapters must treat that as permission for the full detail scope, not just
one note. Endpoints later need authorization-aware caching, rate limits and secure
reference lookup. Opaque IDs are never credentials.

## History, idempotency and atomicity

History is an append-only event stream. Deterministic replay validates sequential
versions, IDs, transitions, timestamps, ownership/association, inspection arithmetic,
receiving invariants and custody continuity; the reconstructed state must match the
resolved snapshot. Policies are versioned and immutable. History currently requires
the compatible policy version and a bounded complete stream; version dispatch and
verified pagination are future work. Writes stop at the configured bound.

Receipt scope is trusted actor + operation namespace + key. The canonical versioned
payload binds normalized command, policies and owner/provider. It is private data,
not a cryptographic hash: do not log or return it. Replays require current access,
then return the existing result before re-verifying consumed evidence or doing new
work. Different payloads conflict. Retry a lost/unknown outcome with the same key;
there is no automatic rollback or new reference allocation on a completed replay.

The future repository transaction must:

1. Reauthorize current actor, warehouse/custodian/disposition scope and integration
   revisions; handle an existing scoped receipt before new-work CAS.
2. Enforce unique pickup/reference/event/receiving/transfer IDs, scoped receipts,
   approved natural business keys and one acknowledgment per transfer.
3. Compare aggregate and linked source revisions, and verify current custody.
4. Atomically consume unused/unexpired evidence, append event/audit, store the next
   state, receipt and notification intents, or write none.

Do not use a separate side-effecting audit writer or proof-consumption call before
commit. Audit and outbox interfaces are represented inside the atomic commit object.
Notification templates are policy-controlled references only; a future worker
resolves authorized recipients, deduplicates by pickup/sequence/template/policy,
retries after commit and records delivery failures. No real notification is sent.
Synthetic adapter tests do not establish PostgreSQL atomicity, durability, global
evidence-consumption safety or production concurrency guarantees.

## Approvals and next steps

Pending decisions: warehouse topology/storage and staff mappings; custody actors and
allowed transitions; required proof types/retention/consent and witness authority;
quantity units, partial/split lots and discrepancy decisions; linkage/cardinality
with booking/Shipment/trip; reassignment; cancellation/returns; notification recipients;
record/receipt retention; shared schema, locking strategy, API/UI and reviewer ownership.
No suggested decision is treated as approved.

Future API/server-action composition must use these trusted gateways, validated
inputs and privacy projections. UI can show observations separately from disposition
decisions and pending handovers separately from acknowledged custody. Database-backed
security/concurrency/crash-recovery tests need separate authorization on an isolated
test database. Both Mobility sectors stay COMING_SOON.

Recommended next milestone: **Goods Complaint & Exception Management**. PROMPT 42
has not been started.
