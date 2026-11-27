import { z } from "zod";

import { verifiedProofSchema, validateDeliveryProof } from "./logistics-delivery";
import { createShipmentMeasurementSchema } from "./logistics-measurements";
import {
  trackingIdentifierSchema as id,
  trackingTimestampSchema as time,
} from "./logistics-tracking";

// Exact Decimal(12,3)-compatible quantities, including zero observations.
export const goodsQuantitySchema = z
  .string()
  .regex(/^(?:0|[1-9]\d{0,8})(?:\.\d{1,3})?$/)
  .transform((v) => {
    const [whole, fraction = ""] = v.split(".");
    return `${whole}.${fraction.padEnd(3, "0")}`;
  });
export function quantityUnits(value: string): bigint {
  return BigInt(goodsQuantitySchema.parse(value).replace(".", ""));
}
export function quantityText(units: bigint): string {
  if (units < BigInt(0)) throw new Error("Invalid goods quantity");
  const s = units.toString().padStart(4, "0");
  return goodsQuantitySchema.parse(`${s.slice(0, -3)}.${s.slice(-3)}`);
}
export const pickupInputSchema = z.strictObject({
  bookingId: id,
  tripId: id,
  shipmentId: id.nullable(),
  locationId: id,
  scheduledAt: time,
  actualAt: time,
  goodsDescription: z.string().trim().min(1).max(1000),
  unit: id,
  expectedQuantity: goodsQuantitySchema,
  collectedQuantity: goodsQuantitySchema,
  weightKg: z.string().nullable(),
  volumeM3: z.string().nullable(),
  condition: id,
  notes: z.string().trim().max(1000).nullable(),
});
export const pickupRecordSchema = pickupInputSchema.extend({
  id,
  reference: id,
  agentId: id,
  createdAt: time,
});
export type PickupRecord = z.output<typeof pickupRecordSchema>;
export function validatePickup(
  input: unknown,
  policy: { maxWeightKg: string; maxVolumeM3: string; conditions: readonly string[] },
  now: string,
) {
  const p = pickupInputSchema.parse(input);
  if (
    quantityUnits(p.expectedQuantity) === BigInt(0) ||
    !policy.conditions.includes(p.condition) ||
    p.actualAt > time.parse(now)
  )
    throw new Error("Invalid pickup");
  const weight = createShipmentMeasurementSchema({ maximum: policy.maxWeightKg });
  const volume = createShipmentMeasurementSchema({ maximum: policy.maxVolumeM3 });
  if (p.weightKg !== null) p.weightKg = weight.parse(p.weightKg).toString();
  if (p.volumeM3 !== null) p.volumeM3 = volume.parse(p.volumeM3).toString();
  return p;
}
export const pickupProofModeSchema = z.enum(["OTP", "SIGNATURE", "PHOTO", "WITNESS", "MANUAL"]);
export const pickupProofHandleSchema = z.strictObject({ id, mode: pickupProofModeSchema });
export type PickupProofHandle = z.output<typeof pickupProofHandleSchema>;
// Reuse delivery attestation fields; no fake Shipment or attempt for unlinked pickup.
export const pickupEvidenceSchema = verifiedProofSchema
  .omit({ shipmentId: true, attemptId: true })
  .extend({
    mode: pickupProofModeSchema,
    bookingId: id,
    tripId: id,
    pickupId: id,
    shipmentId: id.nullable(),
    purpose: z.enum(["confirm", "inspect", "transfer", "acknowledge"]),
    confirmationActorId: id.nullable(),
    deliveryAttemptId: id.nullable(),
    policyVersion: id,
  });
export type PickupEvidence = z.output<typeof pickupEvidenceSchema>;
export function validatePickupEvidence(
  input: unknown,
  handle: PickupProofHandle,
  pickup: PickupRecord,
  purpose: PickupEvidence["purpose"],
  nowInput: string,
  policyVersion: string,
) {
  const p = pickupEvidenceSchema.parse(input),
    now = time.parse(nowInput);
  const kind = handle.mode === "WITNESS" || handle.mode === "MANUAL" ? "CONFIRMATION" : handle.mode;
  if (
    p.id !== handle.id ||
    p.mode !== handle.mode ||
    p.kind !== kind ||
    p.bookingId !== pickup.bookingId ||
    p.tripId !== pickup.tripId ||
    p.pickupId !== pickup.id ||
    p.shipmentId !== pickup.shipmentId ||
    p.agentId !== pickup.agentId ||
    p.purpose !== purpose ||
    p.policyVersion !== policyVersion ||
    p.capturedAt < pickup.actualAt ||
    p.capturedAt > p.verifiedAt ||
    p.verifiedAt > now ||
    p.expiresAt <= now ||
    ((handle.mode === "WITNESS" || handle.mode === "MANUAL") && !p.confirmationActorId)
  )
    throw new Error("Invalid pickup evidence");
  if (p.deliveryAttemptId !== null) {
    if (!p.shipmentId) throw new Error("Invalid delivery linkage");
    validateDeliveryProof(
      {
        id: p.id,
        kind: p.kind,
        shipmentId: p.shipmentId,
        attemptId: p.deliveryAttemptId,
        agentId: p.agentId,
        verified: p.verified,
        authorized: p.authorized,
        used: p.used,
        capturedAt: p.capturedAt,
        verifiedAt: p.verifiedAt,
        expiresAt: p.expiresAt,
        integrityDigest: p.integrityDigest,
        revision: p.revision,
      },
      { id: p.id, kind: p.kind },
      p.shipmentId,
      p.deliveryAttemptId,
      pickup.agentId,
      now,
    );
  }
  return p;
}
