import { z } from "zod";

import { createShipmentMeasurementSchema } from "./logistics-measurements";

// Pure domain primitives only. Policies and identity/ownership facts must come
// from trusted server code, never request-supplied authorization claims.
export type ShipmentInputPolicy = {
  maxParcelCount: number;
  maxWeightKg: number;
  maxVolumeM3: number;
  phonePattern: RegExp;
  districts: readonly string[];
  parcelCategories: readonly string[];
};

export function createShipmentInputSchema(policy: ShipmentInputPolicy) {
  if (
    !Number.isSafeInteger(policy.maxParcelCount) ||
    policy.maxParcelCount < 1 ||
    !Number.isFinite(policy.maxWeightKg) ||
    policy.maxWeightKg <= 0 ||
    !Number.isFinite(policy.maxVolumeM3) ||
    policy.maxVolumeM3 <= 0 ||
    !policy.districts.length ||
    !policy.parcelCategories.length ||
    !policy.phonePattern.source.startsWith("^") ||
    !policy.phonePattern.source.endsWith("$")
  )
    throw new Error("Invalid shipment input policy");

  const requiredText = (max: number) => z.string().trim().min(1).max(max);
  const optionalText = (max: number) =>
    z
      .string()
      .trim()
      .max(max)
      .optional()
      .transform((v) => v || undefined);
  const phonePattern = new RegExp(
    policy.phonePattern.source,
    policy.phonePattern.flags.replace(/[gy]/g, ""),
  );
  const contact = z.strictObject({
    name: requiredText(200),
    phone: requiredText(40).regex(phonePattern),
  });
  const district = requiredText(200).refine((v) => policy.districts.includes(v));
  const measurement = (max: number) => createShipmentMeasurementSchema({ maximum: max });
  const count = z
    .union([
      z.number(),
      z
        .string()
        .trim()
        .regex(/^[1-9]\d*$/)
        .transform(Number),
    ])
    .pipe(z.number().int().positive().max(policy.maxParcelCount));

  return z.strictObject({
    pickupDistrict: district,
    pickupAddress: requiredText(1000),
    destinationDistrict: district,
    destinationAddress: requiredText(1000),
    sender: contact,
    receiver: contact,
    parcelCategory: requiredText(100).refine((v) => policy.parcelCategories.includes(v)),
    parcelCount: count,
    weightKg: measurement(policy.maxWeightKg),
    volumeM3: measurement(policy.maxVolumeM3).optional(),
    cargoDescription: optionalText(2000),
    handlingNotes: optionalText(2000),
  });
}

export type ShipmentInput = z.output<ReturnType<typeof createShipmentInputSchema>>;

// Technical key syntax only; not a credential, ownership check or durable lock.
export const shipmentIdempotencyKeySchema = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{15,127}$/);

export function normalizeShipmentPayload(input: unknown, policy: ShipmentInputPolicy): string {
  const result = createShipmentInputSchema(policy).safeParse(input);
  if (!result.success) throw new Error("Invalid shipment input");
  // Zod emits the fixed schema field order. Never log this string: it contains PII.
  return JSON.stringify(result.data);
}

export type ShipmentSubmission = {
  actorId: string;
  operation: string;
  key: string;
  payload: unknown;
};

export function compareShipmentSubmission(
  previous: ShipmentSubmission | null,
  incoming: ShipmentSubmission,
  policy: ShipmentInputPolicy,
): "new" | "retry" | "conflict" {
  const validScope = (value: ShipmentSubmission) =>
    value.actorId.trim().length > 0 &&
    value.operation.trim().length > 0 &&
    shipmentIdempotencyKeySchema.safeParse(value.key).success;
  if (!validScope(incoming) || (previous && !validScope(previous))) {
    throw new Error("Invalid submission identity or key");
  }
  const payload = normalizeShipmentPayload(incoming.payload, policy);
  if (!previous) return "new";
  if (
    previous.actorId !== incoming.actorId ||
    previous.operation !== incoming.operation ||
    previous.key !== incoming.key
  )
    return "new";
  return normalizeShipmentPayload(previous.payload, policy) === payload ? "retry" : "conflict";
}

export type TrackingEvent = {
  status: string;
  eventAt: string;
  recordedAt: string;
  visibility: "public" | "customer" | "provider" | "internal";
  internalNote?: string;
};

export type ShipmentTrackingSource = {
  trackingReference: string;
  status: string;
  customerId: string;
  providerId: string;
  shipment: ShipmentInput;
  events: readonly TrackingEvent[];
  internalNotes?: string;
};

function trackingProjection(
  source: ShipmentTrackingSource,
  audience: "public" | "customer" | "provider",
) {
  return {
    trackingReference: source.trackingReference,
    status: source.status,
    events: source.events
      .filter((e) => e.visibility === "public" || e.visibility === audience)
      .map((e) => ({
        status: e.status,
        eventAt: e.eventAt,
        recordedAt: e.recordedAt,
      })),
  };
}

// Projection does not authorize an anonymous endpoint. Public lookup policy is
// still pending; callers must gate lookup separately. No contacts/addresses/notes.
export function projectPublicTracking(source: ShipmentTrackingSource) {
  return trackingProjection(source, "public");
}

export function projectCustomerTracking(
  source: ShipmentTrackingSource,
  authenticatedCustomerId: string,
) {
  if (!authenticatedCustomerId.trim() || authenticatedCustomerId !== source.customerId) return null;
  return trackingProjection(source, "customer");
}

export function projectProviderTracking(
  source: ShipmentTrackingSource,
  authorizedProviderId: string,
) {
  if (!authorizedProviderId.trim() || authorizedProviderId !== source.providerId) return null;
  return trackingProjection(source, "provider");
}

export type ShipmentTransitionPolicy = {
  approval: "approved" | "pending";
  transitions: Readonly<Record<string, readonly string[]>>;
};

// Approval is trusted configuration, not proof of stakeholder consent. No
// operational status vocabulary or transition graph is supplied by this module.
export function validateShipmentTransition(
  from: string,
  to: string,
  policy?: ShipmentTransitionPolicy | null,
): { allowed: boolean; reason: "allowed" | "policy-required" | "transition-denied" } {
  if (!policy || policy.approval !== "approved")
    return { allowed: false, reason: "policy-required" };
  if (
    !from.trim() ||
    !to.trim() ||
    !Object.hasOwn(policy.transitions, from) ||
    !Object.hasOwn(policy.transitions, to)
  ) {
    return { allowed: false, reason: "transition-denied" };
  }
  const allowed = policy.transitions[from].includes(to);
  return { allowed, reason: allowed ? "allowed" : "transition-denied" };
}
