# Logistics booking application core

`src/lib/application/logistics-booking.ts` exports
`createLogisticsBookingService(dependencies).book(input)`. Its interfaces are in
`logistics-booking-contracts.ts`. This is an isolated service with no route,
authentication implementation, database adapter, or notification transport.
Both Mobility sectors remain coming-soon.

## Trusted composition

A future **server** composition must provide all of the following:

- A request-bound authenticated customer resolver. Customer and provider IDs are
  not accepted in the booking body.
- A context gateway that independently loads and authorizes the Logistics
  listing, its provider, the customer's request, and the selected quotation or
  server pricing result. The gateway must apply approved eligibility and
  commercial policies; unavailable policies or unauthorized contexts are denied.
- Explicit shipment limits, canonical payload contract, approved initial
  lifecycle/event visibility policy, and approved notification policy. An empty
  notification list is an explicit decision. No production statuses or commercial
  confirmation conditions are supplied by this module.
- A server clock and secure identifier generator. Tracking references must use a
  CSPRNG with at least 128 bits of entropy; syntax validation cannot prove that.
- A receipt repository and atomic booking persistence implementation.

These are trusted server interfaces, not JSON authorization claims. The service
validates their returned shapes and cross-checks customer, listing, provider,
request, quotation identity/version, and quote snapshot facts. A gateway approval
is not inferred from a quote status such as `ACCEPTED`.

Monetary validation reuses the existing BDT-only decimal-string snapshot
contract. Display consumers must use the existing `formatBdtMoney` helper for ৳
formatting. This service does not calculate new prices or change money models.

## Idempotency and privacy

The receipt scope is authenticated customer + operation + exact idempotency key.
The `logistics-booking-envelope-v1` envelope wraps the existing canonical booking
string and binds customer, provider, and the full validated quote snapshot.
Equivalent normalized shipment and quote representations compare equally.
Changed bound facts conflict under the same scope/key. Generated identifiers,
the current clock, and authorization revision are excluded from the fingerprint.
Quote facts, including the captured timestamp, must be stable for a quote version.

The canonical envelope **contains private data**. It belongs in restricted
receipt storage with appropriate retention, never logs or a client response.
The separate private-details record contains contacts, addresses, and free text.
The returned acknowledgement contains only shipment ID, tracking reference,
initial status, and creation timestamp. Notification intents contain references
and template keys, not contact details or free text.

Every attempt, including a retry, requires current authorization and valid
policies before a receipt can be returned. A tracking reference grants no access;
future tracking endpoints need their own authenticated authorization policy.
Dependency failures return generic error codes without exception messages,
validation issues, causes, or request data. The service does not log.

## Future persistence obligations

The initial receipt lookup is advisory. The future `commitBooking` adapter must:

1. Revalidate the authorized context/revision within the persistence boundary.
2. Enforce unique receipt scope, shipment ID, and tracking reference.
3. Persist shipment, private details, initial event, receipt, and notification
   intents together, or persist none of them.
4. Return the winning existing receipt for a raced scope, without inserting any
   additional records or intents. The service checks its scope and full envelope
   just as it does for the initial read.
5. Leave no writes for a context change or identifier collision. A caller can
   retry the same key after a transient failure. A failed response can represent
   an unknown commit outcome; do not switch keys to recover it.

Notification dispatch is separate from booking. A future worker needs its own
authorization and deduplication using shipment/event/recipient/template/policy
version. This module supplies no production persistence or delivery guarantees.

The synthetic in-memory tests exercise service orchestration, replay decisions,
privacy, and the intended persistence contract. They do **not** establish real
database concurrency, transaction isolation, durability, rollback guarantees,
or production notification delivery. Those require a future adapter and its own
integration verification.
