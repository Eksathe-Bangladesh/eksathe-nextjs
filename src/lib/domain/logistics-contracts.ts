import { z } from "zod";

import {
  createShipmentInputSchema,
  validateShipmentTransition,
  type ShipmentInputPolicy,
  type ShipmentTransitionPolicy,
} from "./logistics";

const identifier = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9][A-Za-z0-9_.:-]*$/);
const actorSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("USER"), userId: identifier }),
  z.strictObject({ kind: z.literal("SYSTEM"), serviceId: identifier }),
]);
const actorContextSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("USER"), authenticatedUserId: identifier }),
  z.strictObject({
    kind: z.literal("SYSTEM"),
    executingServiceId: identifier,
    allowedServiceIds: z.array(identifier).min(1),
  }),
]);
export type TrustedShipmentActorContext = z.infer<typeof actorContextSchema>;

// The adapter must obtain context from authentication/worker configuration.
// A pure function cannot establish provenance: never deserialize this context
// from a request. An actor claim alone is never sufficient.
export function validateShipmentActor(claim: unknown, trustedContext: TrustedShipmentActorContext) {
  const actor = actorSchema.safeParse(claim);
  const context = actorContextSchema.safeParse(trustedContext);
  if (!actor.success || !context.success) throw new Error("Invalid shipment actor");
  if (
    actor.data.kind === "USER" &&
    context.data.kind === "USER" &&
    actor.data.userId === context.data.authenticatedUserId
  )
    return actor.data;
  if (
    actor.data.kind === "SYSTEM" &&
    context.data.kind === "SYSTEM" &&
    actor.data.serviceId === context.data.executingServiceId &&
    context.data.allowedServiceIds.includes(actor.data.serviceId)
  )
    return actor.data;
  throw new Error("Invalid shipment actor");
}

const bookingEnvelopeSchema = z.strictObject({
  payloadContractVersion: identifier,
  operation: identifier,
  listingId: identifier,
  requestId: identifier.nullable(),
  quotation: z.strictObject({ id: identifier, version: identifier }).nullable(),
  shipment: z.unknown(),
});
const fingerprintPolicySchema = z.strictObject({
  payloadContractVersion: identifier,
  operation: identifier,
  requestMode: z.enum(["new", "existing"]),
  quotationMode: z.enum(["required", "absent"]),
});
export type BookingFingerprintPolicy = z.infer<typeof fingerprintPolicySchema>;

// Canonical PII-bearing material, NOT a hash or durable idempotency guarantee.
// Do not log or return it to clients. Historical versions require their original
// canonicalizer; callers must dispatch to the version they actually implement.
export function canonicalizeBookingFingerprint(
  input: unknown,
  policy: BookingFingerprintPolicy,
  shipmentPolicy: ShipmentInputPolicy,
): string {
  const envelope = bookingEnvelopeSchema.safeParse(input);
  const contract = fingerprintPolicySchema.safeParse(policy);
  if (!envelope.success || !contract.success)
    throw new Error("Invalid booking fingerprint contract");
  const data = envelope.data;
  const rules = contract.data;
  if (
    data.payloadContractVersion !== rules.payloadContractVersion ||
    data.operation !== rules.operation ||
    (rules.requestMode === "existing") !== (data.requestId !== null) ||
    (rules.quotationMode === "required") !== (data.quotation !== null)
  )
    throw new Error("Invalid booking fingerprint contract");
  const shipment = createShipmentInputSchema(shipmentPolicy).safeParse(data.shipment);
  if (!shipment.success) throw new Error("Invalid booking fingerprint payload");
  return JSON.stringify({
    payloadContractVersion: data.payloadContractVersion,
    operation: data.operation,
    listingId: data.listingId,
    requestId: data.requestId,
    quotation: data.quotation,
    shipment: shipment.data,
  });
}

const visibilitySchema = z.enum(["public", "customer", "provider", "internal"]);
const eventSchema = z.strictObject({
  shipmentId: identifier,
  sequence: z.number().int().positive().max(2_147_483_647),
  previousStatus: identifier.nullable(),
  resultingStatus: identifier,
  visibility: visibilitySchema,
});
const snapshotSchema = z.strictObject({
  shipmentId: identifier,
  version: z.number().int().positive().max(2_147_483_647),
  status: identifier,
});
export type ShipmentEventSnapshot = z.infer<typeof snapshotSchema>;
export type ShipmentEventIntegrityPolicy = {
  lifecycle: ShipmentTransitionPolicy;
  initialStatus: string;
  allowedVisibilities: readonly z.infer<typeof visibilitySchema>[];
  allowUnchangedStatusEvents: boolean;
};
const eventPolicySchema = z.strictObject({
  lifecycle: z.strictObject({
    approval: z.literal("approved"),
    transitions: z.record(identifier, z.array(identifier)),
  }),
  initialStatus: identifier,
  allowedVisibilities: z.array(visibilitySchema).min(1),
  allowUnchangedStatusEvents: z.boolean(),
});

// Snapshot and policy are trusted server facts. This validates an append, not
// an update to history, and does not lock or reserve the next sequence.
export function validateShipmentEventAppend(
  input: unknown,
  previous: ShipmentEventSnapshot | null,
  policy: ShipmentEventIntegrityPolicy,
) {
  const event = eventSchema.safeParse(input);
  const configuration = eventPolicySchema.safeParse(policy);
  if (!event.success || !configuration.success) throw new Error("Invalid shipment event contract");
  const e = event.data;
  const p = configuration.data;
  if (
    !Object.hasOwn(p.lifecycle.transitions, p.initialStatus) ||
    !Object.hasOwn(p.lifecycle.transitions, e.resultingStatus) ||
    !p.allowedVisibilities.includes(e.visibility)
  )
    throw new Error("Invalid shipment event contract");
  if (previous === null) {
    if (e.sequence !== 1 || e.previousStatus !== null || e.resultingStatus !== p.initialStatus)
      throw new Error("Invalid shipment initial event");
  } else {
    const snapshot = snapshotSchema.safeParse(previous);
    if (
      !snapshot.success ||
      snapshot.data.shipmentId !== e.shipmentId ||
      e.sequence !== snapshot.data.version + 1 ||
      e.previousStatus !== snapshot.data.status
    )
      throw new Error("Invalid shipment event sequence or status");
    const unchanged = e.previousStatus === e.resultingStatus;
    if (
      !(unchanged && p.allowUnchangedStatusEvents) &&
      !validateShipmentTransition(snapshot.data.status, e.resultingStatus, p.lifecycle).allowed
    )
      throw new Error("Shipment event transition denied");
  }
  return e;
}

// Persisted visibility is immutable even if the caller can publish new events.
export function validateShipmentEventVisibilityChange(existing: unknown, requested: unknown) {
  const before = visibilitySchema.safeParse(existing);
  const after = visibilitySchema.safeParse(requested);
  if (!before.success || !after.success || before.data !== after.data)
    throw new Error("Shipment event visibility is immutable");
  return after.data;
}

const retentionPolicySchema = z.strictObject({
  approval: z.literal("approved"),
  version: identifier,
  anchor: z.literal("operational-closure"),
  retentionMs: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
});
export type ShipmentRetentionPolicy = z.infer<typeof retentionPolicySchema>;
const instant = z.number().int().min(0).max(8_640_000_000_000_000);
const retentionContextSchema = z.strictObject({
  nowMs: instant,
  closedAtMs: instant.nullable(),
  legalHold: z.boolean(),
  recordedPolicyVersion: identifier,
});
export type ShipmentRetentionContext = z.infer<typeof retentionContextSchema>;

// Returns eligibility only; performs no deletion. No clock reads or assumed
// duration. Closure is a proposed explicit policy anchor, not a default.
export function evaluateShipmentRetention(
  policy: ShipmentRetentionPolicy,
  context: ShipmentRetentionContext,
) {
  const p = retentionPolicySchema.safeParse(policy);
  const c = retentionContextSchema.safeParse(context);
  if (!p.success || !c.success || p.data.version !== c.data.recordedPolicyVersion)
    throw new Error("Invalid shipment retention policy or context");
  const { nowMs, closedAtMs, legalHold } = c.data;
  if (closedAtMs !== null && closedAtMs > nowMs)
    throw new Error("Invalid shipment retention anchor");
  const expiresAtMs = closedAtMs === null ? null : closedAtMs + p.data.retentionMs;
  if (
    expiresAtMs !== null &&
    (!Number.isSafeInteger(expiresAtMs) || expiresAtMs > 8_640_000_000_000_000)
  )
    throw new Error("Invalid shipment retention expiry");
  const reason = legalHold
    ? "legal-hold"
    : expiresAtMs === null
      ? "awaiting-closure"
      : nowMs < expiresAtMs
        ? "not-expired"
        : "expired";
  return { eligibleForPurge: reason === "expired", expiresAtMs, reason };
}
