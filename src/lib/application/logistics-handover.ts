import { z } from "zod";

import {
  custodyAcknowledgmentSchema,
  custodyTransferInputSchema,
  custodyTransferRecordSchema,
  validateCustodyTransfer,
  type CustodyAcknowledgment,
  type CustodyTransferRecord,
} from "../domain/custody-transfer";
import { shipmentIdempotencyKeySchema } from "../domain/logistics";
import { assignmentStateSchema, validateAssignmentState } from "../domain/logistics-assignment";
import {
  validateShipmentActor,
  type TrustedShipmentActorContext,
} from "../domain/logistics-contracts";
import {
  pickupInputSchema,
  pickupProofHandleSchema,
  pickupRecordSchema,
  quantityUnits,
  validatePickup,
  validatePickupEvidence,
  type PickupEvidence,
  type PickupRecord,
} from "../domain/logistics-pickup";
import {
  trackingActorSchema,
  trackingIdentifierSchema as id,
  trackingShipmentSchema,
  trackingTimestampSchema as time,
} from "../domain/logistics-tracking";
import { transportTripSchema } from "../domain/transport-trip";
import {
  inspectionDifference,
  inspectionInputSchema,
  inspectionRecordSchema,
  receivingInputSchema,
  receivingRecordSchema,
  validateReceiving,
  type InspectionRecord,
  type ReceivingRecord,
} from "../domain/warehouse-receiving";

const actionSchema = z.enum([
  "create",
  "inspect",
  "confirm",
  "receive",
  "transfer",
  "acknowledge",
  "cancel",
  "exception",
]);
type Action = z.output<typeof actionSchema>;
type Actor = z.output<typeof trackingActorSchema>;
export const handoverPolicySchema = z.strictObject({
  approval: z.literal("approved"),
  version: id,
  integrationVersion: id,
  evidenceVersion: id,
  initialStatus: id,
  statuses: z.array(id).min(1),
  conditions: z.array(id).min(1),
  packagingConditions: z.array(id).min(1),
  inspectionOutcomes: z.array(id).min(1),
  maxWeightKg: z.string(),
  maxVolumeM3: z.string(),
  maxHistory: z.number().int().positive().max(1000),
  notificationsApproved: z.literal(true),
  creationTemplates: z.array(id),
  rules: z
    .array(
      z.strictObject({
        action: actionSchema.exclude(["create"]),
        from: id,
        to: id,
        requiredProofs: z.array(pickupProofHandleSchema.shape.mode),
        allowedProofs: z.array(pickupProofHandleSchema.shape.mode),
        notificationTemplates: z.array(id),
      }),
    )
    .min(1),
});
export type HandoverPolicy = z.input<typeof handoverPolicySchema>;
const requestSchema = z
  .strictObject({
    pickupId: id.nullable(),
    action: actionSchema,
    expectedVersion: z.number().int().min(0).max(2147483646),
    idempotencyKey: shipmentIdempotencyKeySchema,
    data: z.unknown(),
    proofs: z.array(pickupProofHandleSchema).max(10),
  })
  .refine(
    (r) =>
      (r.action === "create"
        ? r.pickupId === null && r.expectedVersion === 0 && r.proofs.length === 0
        : r.pickupId !== null && r.expectedVersion > 0) &&
      new Set(r.proofs.map((p) => p.id)).size === r.proofs.length,
  );
export type HandoverCommand = z.output<typeof requestSchema>;
const warehouseInspectionSchema = inspectionInputSchema.extend({ warehouseId: id.nullable() });
const warehouseInspectionRecordSchema = inspectionRecordSchema.extend({
  warehouseId: id.nullable(),
});
type Inspection = InspectionRecord & { warehouseId: string | null };
export type HandoverState = {
  pickup: PickupRecord;
  customerId: string;
  providerId: string;
  agentUserId: string;
  version: number;
  status: string;
  updatedAt: string;
  custodianId: string;
  confirmed: boolean;
  inspections: Inspection[];
  receivings: ReceivingRecord[];
  transfers: CustodyTransferRecord[];
  acknowledgments: CustodyAcknowledgment[];
  pendingTransferId: string | null;
};
const creationSchema = z.strictObject({
  pickup: pickupRecordSchema,
  customerId: id,
  providerId: id,
  agentUserId: id,
  initialCustodianId: id,
});
const eventSchema = z.strictObject({
  id,
  pickupId: id,
  sequence: z.number().int().positive(),
  action: actionSchema,
  previousStatus: id.nullable(),
  resultingStatus: id,
  actor: trackingActorSchema,
  recordedAt: time,
  policyVersion: id,
  authorizationRevision: id,
  data: z.unknown(),
  evidenceIds: z.array(id),
});
export type HandoverEvent = z.output<typeof eventSchema>;
const grantSchema = z.strictObject({
  action: z.enum(["read", ...actionSchema.options]),
  actor: trackingActorSchema,
  pickupId: id.nullable(),
  customerId: id,
  providerId: id,
  revision: id,
  audience: z.enum(["customer", "provider", "agent", "driver", "warehouse", "operations"]),
  subjectId: id.nullable(),
  warehouseIds: z.array(id),
  custodianIds: z.array(id),
  includeNotes: z.boolean(),
  decisionRevision: id.nullable(),
});
export type HandoverGrant = z.output<typeof grantSchema>;
const linkSchema = z.strictObject({
  bookingId: id,
  trip: transportTripSchema,
  shipment: trackingShipmentSchema.nullable(),
  assignment: assignmentStateSchema.nullable(),
  customerId: id,
  providerId: id,
  agentId: id,
  agentUserId: id,
  locationId: id,
  scheduledAt: time,
  initialCustodianId: id,
  revision: id,
  policyVersion: id,
});
export type HandoverLinks = z.output<typeof linkSchema>;
const scopeSchema = z.strictObject({
  actor: trackingActorSchema,
  operation: z.literal("logistics.handover.v1"),
  key: shipmentIdempotencyKeySchema,
});
type Scope = z.output<typeof scopeSchema>;
const summarySchema = z.strictObject({
  pickupId: id,
  reference: id,
  version: z.number().int().positive(),
  status: id,
});
const receiptSchema = z.strictObject({
  scope: scopeSchema,
  canonical: z.string().min(1),
  result: summarySchema,
});
export type HandoverReceipt = z.output<typeof receiptSchema>;
export type HandoverCommit = {
  previous: HandoverState | null;
  next: HandoverState;
  event: HandoverEvent;
  receipt: HandoverReceipt;
  actor: Actor;
  grant: HandoverGrant;
  links: HandoverLinks;
  evidence: PickupEvidence[];
  consumption: { id: string; revision: string; expiresAt: string; purpose: string }[];
  notificationIntents: {
    pickupId: string;
    sequence: number;
    template: string;
    policyVersion: string;
  }[];
};
export type HandoverDependencies = {
  policy: HandoverPolicy | null;
  identity: { getActor(): Promise<TrustedShipmentActorContext | null> };
  authorization: {
    authorize(input: {
      actor: Actor;
      state: HandoverState | null;
      command: HandoverCommand | null;
    }): Promise<HandoverGrant | null>;
  };
  integration: {
    resolve(input: {
      bookingId: string;
      tripId: string;
      shipmentId: string | null;
    }): Promise<HandoverLinks | null>;
  };
  proofVerifier: {
    verify(input: {
      handle: z.output<typeof pickupProofHandleSchema>;
      pickup: PickupRecord;
      action: Action;
      actor: Actor;
    }): Promise<PickupEvidence | null>;
  };
  consumption: {
    authorize(input: {
      evidence: PickupEvidence[];
      pickup: PickupRecord;
      action: Action;
      actor: Actor;
    }): Promise<{ approved: true; evidenceIds: string[]; policyVersion: string } | null>;
  };
  identifiers: {
    generate(
      kind:
        | "pickup"
        | "reference"
        | "event"
        | "inspection"
        | "receiving"
        | "transfer"
        | "acknowledgment",
    ): Promise<string>;
  };
  clock: { now(): string };
  repository: {
    resolve(pickupId: string): Promise<HandoverState | null>;
    history(pickupId: string, expectedVersion: number): Promise<readonly HandoverEvent[]>;
    findReceipt(scope: Scope): Promise<HandoverReceipt | null>;
    // Single transaction: reauthorize scopes/revisions; receipt before CAS;
    // enforce reference/record/business uniqueness, append-only history,
    // consume all evidence + write state/event/receipt/outbox together or none.
    commit(
      command: HandoverCommit,
    ): Promise<
      { kind: "created" | "existing"; receipt: HandoverReceipt } | { kind: "conflict" | "denied" }
    >;
  };
};
type Code =
  | "INVALID_INPUT"
  | "POLICY_UNAVAILABLE"
  | "HANDOVER_UNAVAILABLE"
  | "NOT_ALLOWED"
  | "CONFLICT"
  | "IDEMPOTENCY_CONFLICT";
class Failure extends Error {
  constructor(readonly code: Code) {
    super(code);
  }
}
function fail(code: Code): never {
  throw new Failure(code);
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
function normalizedData(action: Action, raw: unknown, p: HandoverPolicy, now: string): unknown {
  switch (action) {
    case "create":
      return validatePickup(raw, p, now);
    case "inspect":
      return warehouseInspectionSchema.parse(raw);
    case "receive":
      return receivingInputSchema.parse(raw);
    case "transfer":
      return custodyTransferInputSchema.parse(raw);
    case "acknowledge":
      return z.strictObject({ transferId: id, acknowledgedAt: time }).parse(raw);
    case "confirm":
      return z.strictObject({ confirmedAt: time }).parse(raw);
    default:
      return z
        .strictObject({ reason: z.string().trim().min(1).max(1000), eventAt: time })
        .parse(raw);
  }
}

// Deterministic replay validates append semantics; no mutation of stored events.
export function applyHandoverEvent(
  previous: HandoverState | null,
  input: unknown,
  policy: HandoverPolicy,
): HandoverState {
  const e = eventSchema.parse(input);
  if (
    e.policyVersion !== policy.version ||
    e.sequence !== (previous?.version ?? 0) + 1 ||
    e.previousStatus !== (previous?.status ?? null) ||
    (previous && (e.pickupId !== previous.pickup.id || e.recordedAt < previous.updatedAt))
  )
    throw new Error("Invalid handover history");
  if (!previous) {
    if (e.action !== "create" || e.resultingStatus !== policy.initialStatus || e.evidenceIds.length)
      throw new Error("Invalid pickup history");
    const d = creationSchema.parse(e.data);
    validatePickup(pickupInputSchema.strip().parse(d.pickup), policy, e.recordedAt);
    if (d.pickup.id !== e.pickupId || d.pickup.createdAt !== e.recordedAt)
      throw new Error("Invalid pickup identity");
    return {
      pickup: d.pickup,
      customerId: d.customerId,
      providerId: d.providerId,
      agentUserId: d.agentUserId,
      custodianId: d.initialCustodianId,
      version: 1,
      status: e.resultingStatus,
      updatedAt: e.recordedAt,
      confirmed: false,
      inspections: [],
      receivings: [],
      transfers: [],
      acknowledgments: [],
      pendingTransferId: null,
    };
  }
  const rule = policy.rules.find((r) => r.action === e.action && r.from === previous.status);
  if (!rule || rule.to !== e.resultingStatus) throw new Error("Invalid handover transition");
  const s = structuredClone(previous),
    pickup = s.pickup;
  const eventTime = (value: string) => {
    if (value < pickup.actualAt || value > e.recordedAt)
      throw new Error("Invalid operational time");
  };
  switch (e.action) {
    case "inspect": {
      const r = warehouseInspectionRecordSchema.parse(e.data);
      eventTime(r.inspectedAt);
      if (
        r.pickupId !== pickup.id ||
        !same(r.inspector, e.actor) ||
        r.expectedQuantity !==
          (r.warehouseId ? pickup.collectedQuantity : pickup.expectedQuantity) ||
        (!r.warehouseId && r.receivedQuantity !== pickup.collectedQuantity) ||
        !same(r.evidenceIds, e.evidenceIds) ||
        !policy.conditions.includes(r.condition) ||
        !policy.packagingConditions.includes(r.packagingCondition) ||
        !policy.inspectionOutcomes.includes(r.outcome) ||
        s.inspections.some((i) => i.id === r.id)
      )
        throw new Error("Invalid inspection");
      const diff = inspectionDifference(r.expectedQuantity, r.receivedQuantity);
      if (
        diff.shortage !== r.shortage ||
        diff.excess !== r.excess ||
        diff.missingGoods !== r.missingGoods
      )
        throw new Error("Invalid discrepancy");
      s.inspections.push(r);
      break;
    }
    case "confirm": {
      const d = z.strictObject({ confirmedAt: time }).parse(e.data);
      eventTime(d.confirmedAt);
      if (s.confirmed) throw new Error("Duplicate pickup confirmation");
      s.confirmed = true;
      break;
    }
    case "receive": {
      const r = receivingRecordSchema.parse(e.data);
      const inspection = s.inspections.find((i) => i.id === r.inspectionId);
      if (
        !s.confirmed ||
        !inspection ||
        inspection.warehouseId !== r.warehouseId ||
        s.receivings.some(
          (i) =>
            i.inspectionId === r.inspectionId || i.id === r.id || i.warehouseId === r.warehouseId,
        ) ||
        r.pickupId !== pickup.id ||
        r.bookingId !== pickup.bookingId ||
        r.tripId !== pickup.tripId ||
        r.shipmentId !== pickup.shipmentId ||
        !same(r.staff, e.actor)
      )
        throw new Error("Invalid receiving association");
      eventTime(r.arrivedAt);
      validateReceiving(receivingInputSchema.strip().parse(r), inspection, e.recordedAt);
      s.receivings.push(r);
      break;
    }
    case "transfer": {
      const r = custodyTransferRecordSchema.parse(e.data);
      eventTime(r.transferredAt);
      if (
        !s.confirmed ||
        s.pendingTransferId ||
        r.pickupId !== pickup.id ||
        !same(r.actor, e.actor) ||
        !same(r.evidenceIds, e.evidenceIds) ||
        s.transfers.some(
          (t) =>
            t.id === r.id ||
            (t.previousCustodianId === r.previousCustodianId &&
              t.newCustodianId === r.newCustodianId &&
              t.transferredAt === r.transferredAt),
        ) ||
        r.transferredAt < (s.acknowledgments.at(-1)?.acknowledgedAt ?? pickup.actualAt) ||
        !policy.conditions.includes(r.condition) ||
        quantityUnits(r.quantity) === BigInt(0)
      )
        throw new Error("Invalid handover");
      validateCustodyTransfer(
        custodyTransferInputSchema.strip().parse(r),
        s.custodianId,
        pickup.collectedQuantity,
        e.recordedAt,
      );
      if (r.receivingId) {
        const received = s.receivings.find((v) => v.id === r.receivingId);
        if (
          !received ||
          received.receivedQuantity !== r.quantity ||
          received.condition !== r.condition
        )
          throw new Error("Receiving handover mismatch");
      }
      s.transfers.push(r);
      s.pendingTransferId = r.id;
      break;
    }
    case "acknowledge": {
      const r = custodyAcknowledgmentSchema.parse(e.data),
        transfer = s.transfers.find((t) => t.id === s.pendingTransferId);
      eventTime(r.acknowledgedAt);
      if (
        !transfer ||
        r.transferId !== transfer.id ||
        r.custodianId !== transfer.newCustodianId ||
        r.pickupId !== pickup.id ||
        r.acknowledgedAt < transfer.transferredAt ||
        !same(r.actor, e.actor) ||
        !same(r.evidenceIds, e.evidenceIds) ||
        s.acknowledgments.some((a) => a.transferId === r.transferId || a.id === r.id)
      )
        throw new Error("Invalid handover acknowledgment");
      s.acknowledgments.push(r);
      s.custodianId = r.custodianId;
      s.pendingTransferId = null;
      break;
    }
    case "cancel":
    case "exception": {
      const d = z
        .strictObject({ reason: z.string().trim().min(1).max(1000), eventAt: time })
        .parse(e.data);
      eventTime(d.eventAt);
      if (e.action === "cancel" && s.pendingTransferId) throw new Error("Unresolved handover");
      break;
    }
    default:
      throw new Error("Invalid repeated creation");
  }
  return { ...s, version: e.sequence, status: e.resultingStatus, updatedAt: e.recordedAt };
}

export function createLogisticsHandoverService(deps: HandoverDependencies) {
  function policy() {
    try {
      const p = handoverPolicySchema.parse(deps.policy);
      if (
        !p.statuses.includes(p.initialStatus) ||
        new Set(p.statuses).size !== p.statuses.length ||
        new Set(p.rules.map((r) => `${r.action}:${r.from}`)).size !== p.rules.length ||
        p.rules.some(
          (r) =>
            !p.statuses.includes(r.from) ||
            !p.statuses.includes(r.to) ||
            r.requiredProofs.some((k) => !r.allowedProofs.includes(k)) ||
            new Set(r.allowedProofs).size !== r.allowedProofs.length ||
            new Set(r.requiredProofs).size !== r.requiredProofs.length ||
            (r.allowedProofs.length > 0 &&
              !["confirm", "inspect", "transfer", "acknowledge"].includes(r.action)),
        )
      )
        fail("POLICY_UNAVAILABLE");
      return p;
    } catch {
      return fail("POLICY_UNAVAILABLE");
    }
  }
  async function actor() {
    const a = await deps.identity.getActor();
    if (!a) fail("HANDOVER_UNAVAILABLE");
    return validateShipmentActor(
      a.kind === "USER"
        ? { kind: "USER", userId: a.authenticatedUserId }
        : { kind: "SYSTEM", serviceId: a.executingServiceId },
      a,
    );
  }
  async function authorize(
    who: Actor,
    state: HandoverState | null,
    command: HandoverCommand | null,
  ) {
    const g = grantSchema.parse(
      await deps.authorization.authorize(structuredClone({ actor: who, state, command })),
    );
    if (
      !same(g.actor, who) ||
      g.action !== (command?.action ?? "read") ||
      g.pickupId !== (state?.pickup.id ?? null) ||
      (state && (g.customerId !== state.customerId || g.providerId !== state.providerId)) ||
      (g.includeNotes && g.audience !== "operations") ||
      (g.audience === "customer" && (who.kind !== "USER" || who.userId !== g.customerId)) ||
      (["agent", "driver", "warehouse"].includes(g.audience) &&
        (who.kind !== "USER" || g.subjectId !== who.userId)) ||
      ((g.audience === "agent" || g.audience === "driver") &&
        state &&
        state.agentUserId !== g.subjectId)
    )
      fail("HANDOVER_UNAVAILABLE");
    return g;
  }
  async function history(pickupId: string, p: HandoverPolicy, now: string) {
    const raw = await deps.repository.resolve(pickupId);
    if (!raw || raw.pickup.id !== pickupId) fail("HANDOVER_UNAVAILABLE");
    const rows = z
      .array(eventSchema)
      .min(1)
      .max(p.maxHistory)
      .parse(await deps.repository.history(pickupId, raw.version));
    let state: HandoverState | null = null;
    const ids = new Set<string>(),
      evidence = new Set<string>();
    for (const e of rows) {
      if (
        e.pickupId !== pickupId ||
        ids.has(e.id) ||
        e.recordedAt > now ||
        e.evidenceIds.some((i) => evidence.has(i)) ||
        new Set(e.evidenceIds).size !== e.evidenceIds.length
      )
        fail("HANDOVER_UNAVAILABLE");
      ids.add(e.id);
      e.evidenceIds.forEach((i) => evidence.add(i));
      state = applyHandoverEvent(state, e, p);
    }
    if (!state || !same(state, raw)) fail("HANDOVER_UNAVAILABLE");
    return { state, rows, evidence };
  }
  function replay(
    raw: unknown,
    scope: Scope,
    canonical: string,
    r: HandoverCommand,
    replayed: boolean,
  ) {
    const receipt = receiptSchema.parse(raw);
    if (!same(receipt.scope, scope)) fail("HANDOVER_UNAVAILABLE");
    if (receipt.canonical !== canonical) fail("IDEMPOTENCY_CONFLICT");
    if (
      receipt.result.version !== r.expectedVersion + 1 ||
      (r.pickupId && receipt.result.pickupId !== r.pickupId)
    )
      fail("HANDOVER_UNAVAILABLE");
    return { ok: true as const, replayed, pickup: receipt.result };
  }
  return {
    async execute(input: unknown) {
      try {
        const p = policy(),
          parsed = requestSchema.safeParse(input);
        if (!parsed.success) fail("INVALID_INPUT");
        const r = parsed.data,
          now = time.parse(deps.clock.now());
        try {
          r.data = normalizedData(r.action, r.data, p, now);
        } catch {
          fail("INVALID_INPUT");
        }
        r.proofs.sort((a, b) => a.id.localeCompare(b.id));
        const who = await actor();
        const existing = r.pickupId ? await history(r.pickupId, p, now) : null;
        const current = existing?.state ?? null,
          g = await authorize(who, current, r);
        const scope: Scope = {
          actor: who,
          operation: "logistics.handover.v1",
          key: r.idempotencyKey,
        };
        const canonical = JSON.stringify({
          version: "handover-command-v1",
          policy: p.version,
          integration: p.integrationVersion,
          evidence: p.evidenceVersion,
          customerId: g.customerId,
          providerId: g.providerId,
          command: r,
        });
        const receipt = await deps.repository.findReceipt(scope);
        if (receipt) return replay(receipt, scope, canonical, r, true);
        if (current && current.version !== r.expectedVersion) fail("CONFLICT");
        if (r.expectedVersion >= p.maxHistory) fail("NOT_ALLOWED");
        const rule = current
          ? p.rules.find((v) => v.action === r.action && v.from === current.status)
          : null;
        if (current && !rule) fail("NOT_ALLOWED");
        if (
          r.proofs.some((h) => !rule?.allowedProofs.includes(h.mode)) ||
          rule?.requiredProofs.some((k) => !r.proofs.some((h) => h.mode === k))
        )
          fail("NOT_ALLOWED");
        const data = r.action === "create" ? pickupInputSchema.parse(r.data) : current!.pickup;
        const links = linkSchema.parse(
          await deps.integration.resolve({
            bookingId: data.bookingId,
            tripId: data.tripId,
            shipmentId: data.shipmentId,
          }),
        );
        if (
          links.policyVersion !== p.integrationVersion ||
          links.bookingId !== data.bookingId ||
          links.trip.id !== data.tripId ||
          links.trip.createdAt > data.actualAt ||
          (links.shipment?.id ?? null) !== data.shipmentId ||
          links.customerId !== g.customerId ||
          links.providerId !== g.providerId ||
          links.locationId !== data.locationId ||
          links.scheduledAt !== data.scheduledAt ||
          (links.shipment &&
            (links.shipment.customerId !== g.customerId ||
              links.shipment.providerId !== g.providerId))
        )
          fail("NOT_ALLOWED");
        if (links.assignment) {
          const a = validateAssignmentState(links.assignment);
          if (a.shipment.id !== data.shipmentId || a.current?.agentId !== links.agentId)
            fail("NOT_ALLOWED");
        }
        if (
          current &&
          (links.agentId !== current.pickup.agentId || links.agentUserId !== current.agentUserId)
        )
          fail("NOT_ALLOWED");
        if (
          (g.audience === "agent" || g.audience === "driver") &&
          links.agentUserId !== g.subjectId
        )
          fail("NOT_ALLOWED");
        const pickup: PickupRecord = current?.pickup ?? {
          ...pickupInputSchema.parse(r.data),
          id: id.parse(await deps.identifiers.generate("pickup")),
          reference: id.parse(await deps.identifiers.generate("reference")),
          agentId: links.agentId,
          createdAt: now,
        };
        const evidence: PickupEvidence[] = [];
        for (const handle of r.proofs) {
          if (existing?.evidence.has(handle.id)) fail("NOT_ALLOWED");
          if (!["confirm", "inspect", "transfer", "acknowledge"].includes(r.action))
            fail("NOT_ALLOWED");
          evidence.push(
            validatePickupEvidence(
              await deps.proofVerifier.verify({
                handle,
                pickup: structuredClone(pickup),
                action: r.action,
                actor: who,
              }),
              handle,
              pickup,
              r.action as PickupEvidence["purpose"],
              now,
              p.evidenceVersion,
            ),
          );
        }
        const permission = await deps.consumption.authorize({
          evidence: structuredClone(evidence),
          pickup: structuredClone(pickup),
          action: r.action,
          actor: who,
        });
        const consumption = z
          .strictObject({ approved: z.literal(true), evidenceIds: z.array(id), policyVersion: id })
          .parse(permission);
        if (
          consumption.policyVersion !== p.evidenceVersion ||
          !same([...consumption.evidenceIds].sort(), evidence.map((e) => e.id).sort())
        )
          fail("NOT_ALLOWED");
        const evidenceIds = evidence.map((e) => e.id);
        let record: unknown = r.data;
        switch (r.action) {
          case "create":
            record = {
              pickup,
              customerId: links.customerId,
              providerId: links.providerId,
              agentUserId: links.agentUserId,
              initialCustodianId: links.initialCustodianId,
            };
            break;
          case "inspect": {
            const d = warehouseInspectionSchema.parse(r.data);
            if (d.warehouseId && !g.warehouseIds.includes(d.warehouseId)) fail("NOT_ALLOWED");
            record = {
              ...d,
              ...inspectionDifference(d.expectedQuantity, d.receivedQuantity),
              id: id.parse(await deps.identifiers.generate("inspection")),
              pickupId: pickup.id,
              inspector: who,
              evidenceIds,
            };
            break;
          }
          case "receive": {
            const d = receivingInputSchema.parse(r.data);
            if (!g.warehouseIds.includes(d.warehouseId) || !g.decisionRevision) fail("NOT_ALLOWED");
            record = {
              ...d,
              id: id.parse(await deps.identifiers.generate("receiving")),
              pickupId: pickup.id,
              bookingId: pickup.bookingId,
              tripId: pickup.tripId,
              shipmentId: pickup.shipmentId,
              staff: who,
              decisionRevision: g.decisionRevision,
            };
            break;
          }
          case "transfer": {
            const d = custodyTransferInputSchema.parse(r.data);
            if (
              !g.custodianIds.includes(d.previousCustodianId) ||
              !g.custodianIds.includes(d.newCustodianId)
            )
              fail("NOT_ALLOWED");
            record = {
              ...d,
              id: id.parse(await deps.identifiers.generate("transfer")),
              pickupId: pickup.id,
              actor: who,
              evidenceIds,
            };
            break;
          }
          case "acknowledge": {
            const d = z.strictObject({ transferId: id, acknowledgedAt: time }).parse(r.data),
              transfer = current?.transfers.find((t) => t.id === d.transferId);
            if (!transfer || !g.custodianIds.includes(transfer.newCustodianId)) fail("NOT_ALLOWED");
            record = {
              ...d,
              id: id.parse(await deps.identifiers.generate("acknowledgment")),
              pickupId: pickup.id,
              custodianId: transfer.newCustodianId,
              actor: who,
              evidenceIds,
            };
            break;
          }
        }
        const event: HandoverEvent = {
          id: id.parse(await deps.identifiers.generate("event")),
          pickupId: pickup.id,
          sequence: r.expectedVersion + 1,
          action: r.action,
          previousStatus: current?.status ?? null,
          resultingStatus: rule?.to ?? p.initialStatus,
          actor: who,
          recordedAt: now,
          policyVersion: p.version,
          authorizationRevision: g.revision,
          data: record,
          evidenceIds,
        };
        const next = applyHandoverEvent(current, event, p);
        const result = {
          pickupId: pickup.id,
          reference: pickup.reference,
          version: next.version,
          status: next.status,
        };
        const committed = await deps.repository.commit(
          structuredClone({
            previous: current,
            next,
            event,
            receipt: { scope, canonical, result },
            actor: who,
            grant: g,
            links,
            evidence,
            consumption: evidence.map((e) => ({
              id: e.id,
              revision: e.revision,
              expiresAt: e.expiresAt,
              purpose: e.purpose,
            })),
            notificationIntents: (rule?.notificationTemplates ?? p.creationTemplates).map(
              (template) => ({
                pickupId: pickup.id,
                sequence: next.version,
                template,
                policyVersion: p.version,
              }),
            ),
          }),
        );
        if (committed.kind === "conflict") fail("CONFLICT");
        if (committed.kind !== "created" && committed.kind !== "existing")
          fail("HANDOVER_UNAVAILABLE");
        if (committed.kind === "created" && !same(committed.receipt.result, result))
          fail("HANDOVER_UNAVAILABLE");
        return replay(committed.receipt, scope, canonical, r, committed.kind === "existing");
      } catch (e) {
        return {
          ok: false as const,
          code: e instanceof Failure ? e.code : ("HANDOVER_UNAVAILABLE" as Code),
        };
      }
    },
    async get(input: unknown) {
      try {
        const p = policy(),
          pickupId = id.parse(input),
          who = await actor(),
          { state, rows } = await history(pickupId, p, time.parse(deps.clock.now()));
        const grant = await authorize(who, state, null);
        if (
          grant.audience === "warehouse" &&
          !state.receivings.some((r) => grant.warehouseIds.includes(r.warehouseId)) &&
          !state.inspections.some(
            (i) => i.warehouseId && grant.warehouseIds.includes(i.warehouseId),
          )
        )
          fail("HANDOVER_UNAVAILABLE");
        return {
          ok: true as const,
          pickup: {
            id: pickupId,
            reference: state.pickup.reference,
            version: state.version,
            status: state.status,
            confirmed: state.confirmed,
            expectedQuantity: state.pickup.expectedQuantity,
            collectedQuantity: state.pickup.collectedQuantity,
            unit: state.pickup.unit,
            history: rows.map((e) => ({
              sequence: e.sequence,
              action: e.action,
              status: e.resultingStatus,
              recordedAt: e.recordedAt,
            })),
            ...(grant.includeNotes ? { details: structuredClone(state) } : {}),
          },
        };
      } catch {
        return { ok: false as const, code: "HANDOVER_UNAVAILABLE" as const };
      }
    },
  };
}
