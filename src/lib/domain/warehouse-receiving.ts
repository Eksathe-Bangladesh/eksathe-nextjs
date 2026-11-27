import { z } from "zod";

import { goodsQuantitySchema, quantityText, quantityUnits } from "./logistics-pickup";
import {
  trackingActorSchema,
  trackingIdentifierSchema as id,
  trackingTimestampSchema as time,
} from "./logistics-tracking";

export const inspectionInputSchema = z.strictObject({
  expectedQuantity: goodsQuantitySchema,
  receivedQuantity: goodsQuantitySchema,
  visibleDamage: z.boolean(),
  packagingCondition: id,
  condition: id,
  outcome: id,
  notes: z.string().trim().max(1000).nullable(),
  inspectedAt: time,
});
export const inspectionRecordSchema = inspectionInputSchema.extend({
  id,
  pickupId: id,
  inspector: trackingActorSchema,
  shortage: goodsQuantitySchema,
  excess: goodsQuantitySchema,
  missingGoods: z.boolean(),
  evidenceIds: z.array(id),
});
export type InspectionRecord = z.output<typeof inspectionRecordSchema>;
export function inspectionDifference(expected: string, received: string) {
  const a = quantityUnits(expected),
    b = quantityUnits(received);
  return {
    shortage: quantityText(a > b ? a - b : BigInt(0)),
    excess: quantityText(b > a ? b - a : BigInt(0)),
    missingGoods: a > b,
  };
}
export const receivingInputSchema = z.strictObject({
  warehouseId: id,
  storageLocationId: id,
  inspectionId: id,
  arrivedAt: time,
  receivedQuantity: goodsQuantitySchema,
  acceptedQuantity: goodsQuantitySchema,
  rejectedQuantity: goodsQuantitySchema,
  condition: id,
  notes: z.string().trim().max(1000).nullable(),
});
export const receivingRecordSchema = receivingInputSchema.extend({
  id,
  pickupId: id,
  bookingId: id,
  tripId: id,
  shipmentId: id.nullable(),
  staff: trackingActorSchema,
  decisionRevision: id,
});
export type ReceivingRecord = z.output<typeof receivingRecordSchema>;
export function validateReceiving(input: unknown, inspection: InspectionRecord, now: string) {
  const r = receivingInputSchema.parse(input);
  if (
    r.inspectionId !== inspection.id ||
    r.receivedQuantity !== inspection.receivedQuantity ||
    r.condition !== inspection.condition ||
    quantityUnits(r.acceptedQuantity) + quantityUnits(r.rejectedQuantity) !==
      quantityUnits(r.receivedQuantity) ||
    r.arrivedAt > now ||
    inspection.inspectedAt < r.arrivedAt
  )
    throw new Error("Invalid warehouse receiving");
  return r;
}
