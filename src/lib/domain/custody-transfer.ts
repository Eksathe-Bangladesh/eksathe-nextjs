import { z } from "zod";

import { goodsQuantitySchema } from "./logistics-pickup";
import {
  trackingActorSchema,
  trackingIdentifierSchema as id,
  trackingTimestampSchema as time,
} from "./logistics-tracking";

export const custodyTransferInputSchema = z.strictObject({
  previousCustodianId: id,
  newCustodianId: id,
  quantity: goodsQuantitySchema,
  condition: id,
  transferredAt: time,
  reason: z.string().trim().min(1).max(1000),
  receivingId: id.nullable(),
});
export const custodyTransferRecordSchema = custodyTransferInputSchema.extend({
  id,
  pickupId: id,
  actor: trackingActorSchema,
  evidenceIds: z.array(id),
});
export type CustodyTransferRecord = z.output<typeof custodyTransferRecordSchema>;
export const custodyAcknowledgmentSchema = z.strictObject({
  id,
  transferId: id,
  pickupId: id,
  custodianId: id,
  acknowledgedAt: time,
  actor: trackingActorSchema,
  evidenceIds: z.array(id),
});
export type CustodyAcknowledgment = z.output<typeof custodyAcknowledgmentSchema>;
export function validateCustodyTransfer(
  input: unknown,
  currentCustodian: string,
  quantity: string,
  now: string,
) {
  const t = custodyTransferInputSchema.parse(input);
  if (
    t.previousCustodianId !== currentCustodian ||
    t.previousCustodianId === t.newCustodianId ||
    t.quantity !== quantity ||
    t.transferredAt > now
  )
    throw new Error("Invalid custody transfer");
  return t;
}
