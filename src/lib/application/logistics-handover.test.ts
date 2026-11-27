import { describe, expect, it } from "bun:test";

import {
  goodsQuantitySchema,
  pickupEvidenceSchema,
  validatePickup,
  type PickupEvidence,
} from "../domain/logistics-pickup";
import { inspectionDifference } from "../domain/warehouse-receiving";
import {
  applyHandoverEvent,
  createLogisticsHandoverService,
  type HandoverCommand,
  type HandoverCommit,
  type HandoverDependencies,
  type HandoverEvent,
  type HandoverLinks,
  type HandoverPolicy,
  type HandoverReceipt,
  type HandoverState,
} from "./logistics-handover";

const now = "2026-01-01T12:00:00.000Z",
  actual = "2026-01-01T11:00:00.000Z",
  earlier = "2026-01-01T10:00:00.000Z",
  expires = "2026-01-02T00:00:00.000Z";
function policy(): HandoverPolicy {
  return {
    approval: "approved",
    version: "synthetic-v1",
    integrationVersion: "synthetic-link-v1",
    evidenceVersion: "synthetic-proof-v1",
    initialStatus: "synthetic-open",
    statuses: ["synthetic-open", "synthetic-cancelled"],
    conditions: ["intact", "damaged", "missing"],
    packagingConditions: ["intact", "torn"],
    inspectionOutcomes: ["observed", "review-required"],
    maxWeightKg: "1000",
    maxVolumeM3: "100",
    maxHistory: 100,
    notificationsApproved: true,
    creationTemplates: ["synthetic-template"],
    rules: (
      ["inspect", "confirm", "receive", "transfer", "acknowledge", "cancel", "exception"] as const
    ).map((action) => ({
      action,
      from: "synthetic-open",
      to: action === "cancel" ? "synthetic-cancelled" : "synthetic-open",
      requiredProofs: action === "confirm" ? ["PHOTO"] : [],
      allowedProofs: ["inspect", "confirm", "transfer", "acknowledge"].includes(action)
        ? ["OTP", "SIGNATURE", "PHOTO", "WITNESS", "MANUAL"]
        : [],
      notificationTemplates: ["synthetic-template"],
    })),
  };
}
function pickup() {
  return {
    bookingId: "booking-1",
    tripId: "trip-1",
    shipmentId: null,
    locationId: "location-1",
    scheduledAt: actual,
    actualAt: actual,
    goodsDescription: "PRIVATE goods",
    unit: "synthetic-item",
    expectedQuantity: "10",
    collectedQuantity: "10",
    weightKg: "1.000",
    volumeM3: "1.000",
    condition: "intact",
    notes: "PRIVATE pickup note",
  };
}
function createCommand(): HandoverCommand {
  return {
    pickupId: null,
    action: "create",
    expectedVersion: 0,
    idempotencyKey: "synthetic-create-00001",
    data: pickup(),
    proofs: [],
  };
}
function harness() {
  let serial = 0,
    who = "agent-user",
    denied = false,
    failure = false,
    lost = false;
  let audience: "operations" | "agent" | "warehouse" | "customer" | "provider" | "driver" =
    "operations";
  let warehouses = ["warehouse-1"],
    custodians = ["custodian-1", "custodian-2"],
    decision: string | null = "decision-v1";
  const records = new Map<string, HandoverState>(),
    events = new Map<string, HandoverEvent[]>(),
    receipts = new Map<string, HandoverReceipt>(),
    used = new Set<string>(),
    commits: HandoverCommit[] = [];
  const links: HandoverLinks = {
    bookingId: "booking-1",
    trip: {
      id: "trip-1",
      status: "synthetic",
      version: 1,
      reservationId: "reservation-1",
      vehicleId: "vehicle-1",
      driverId: "driver-1",
      createdAt: earlier,
    },
    shipment: null,
    assignment: null,
    customerId: "customer-1",
    providerId: "provider-1",
    agentId: "agent-1",
    agentUserId: "agent-user",
    locationId: "location-1",
    scheduledAt: actual,
    initialCustodianId: "custodian-1",
    revision: "link-v1",
    policyVersion: "synthetic-link-v1",
  };
  let proofPatch: Record<string, unknown> = {};
  const deps: HandoverDependencies = {
    policy: policy(),
    clock: { now: () => now },
    identity: {
      async getActor() {
        return { kind: "USER", authenticatedUserId: who };
      },
    },
    identifiers: {
      async generate(kind) {
        return `${kind}-${++serial}`;
      },
    },
    authorization: {
      async authorize({ actor, state, command }) {
        return denied
          ? null
          : {
              action: command?.action ?? "read",
              actor,
              pickupId: state?.pickup.id ?? null,
              customerId: "customer-1",
              providerId: "provider-1",
              revision: "auth-v1",
              audience,
              subjectId: who,
              warehouseIds: warehouses,
              custodianIds: custodians,
              includeNotes: audience === "operations",
              decisionRevision: decision,
            };
      },
    },
    integration: {
      async resolve() {
        return structuredClone(links);
      },
    },
    proofVerifier: {
      async verify({ handle, pickup: p, action }) {
        return {
          id: handle.id,
          mode: handle.mode,
          kind:
            handle.mode === "WITNESS" || handle.mode === "MANUAL" ? "CONFIRMATION" : handle.mode,
          bookingId: p.bookingId,
          tripId: p.tripId,
          pickupId: p.id,
          shipmentId: p.shipmentId,
          agentId: p.agentId,
          purpose: action,
          verified: true,
          authorized: true,
          used: used.has(handle.id),
          capturedAt: actual,
          verifiedAt: actual,
          expiresAt: expires,
          integrityDigest: "a".repeat(64),
          revision: "proof-v1",
          confirmationActorId: "witness-user",
          deliveryAttemptId: null,
          policyVersion: "synthetic-proof-v1",
          ...proofPatch,
        } as PickupEvidence;
      },
    },
    consumption: {
      async authorize({ evidence }) {
        return {
          approved: true,
          evidenceIds: evidence.map((e) => e.id),
          policyVersion: "synthetic-proof-v1",
        };
      },
    },
    repository: {
      async resolve(id) {
        return structuredClone(records.get(id) ?? null);
      },
      async history(id) {
        return structuredClone(events.get(id) ?? []);
      },
      async findReceipt(scope) {
        return structuredClone(receipts.get(JSON.stringify(scope)) ?? null);
      },
      async commit(c) {
        const key = JSON.stringify(c.receipt.scope),
          old = receipts.get(key);
        if (old) return { kind: "existing", receipt: structuredClone(old) };
        if (failure) throw new Error("PRIVATE failure");
        if (denied) return { kind: "denied" };
        if (
          (records.get(c.next.pickup.id)?.version ?? 0) !== (c.previous?.version ?? 0) ||
          c.consumption.some((e) => used.has(e.id))
        )
          return { kind: "conflict" };
        if (
          !c.previous &&
          Array.from(records.values()).some((s) => s.pickup.reference === c.next.pickup.reference)
        )
          return { kind: "conflict" };
        records.set(c.next.pickup.id, structuredClone(c.next));
        events.set(c.next.pickup.id, [
          ...(events.get(c.next.pickup.id) ?? []),
          structuredClone(c.event),
        ]);
        c.consumption.forEach((e) => used.add(e.id));
        receipts.set(key, structuredClone(c.receipt));
        commits.push(structuredClone(c));
        if (lost) {
          lost = false;
          throw new Error("Lost response");
        }
        return { kind: "created", receipt: structuredClone(c.receipt) };
      },
    },
  };
  const service = createLogisticsHandoverService(deps);
  async function create(data: unknown = pickup()) {
    const r = await service.execute({ ...createCommand(), data });
    if (!r.ok) throw new Error(r.code);
    return r.pickup.pickupId;
  }
  function command(
    id: string,
    action: HandoverCommand["action"],
    data: unknown,
    proofs: HandoverCommand["proofs"] = [],
  ): HandoverCommand {
    return {
      pickupId: id,
      action,
      expectedVersion: records.get(id)!.version,
      idempotencyKey: `synthetic-command-${++serial}`,
      data,
      proofs,
    };
  }
  async function confirm(id: string) {
    return service.execute(
      command(id, "confirm", { confirmedAt: actual }, [{ id: "proof-photo-1", mode: "PHOTO" }]),
    );
  }
  async function inspect(id: string, patch: Record<string, unknown> = {}) {
    return service.execute(
      command(id, "inspect", {
        warehouseId: "warehouse-1",
        expectedQuantity: "10",
        receivedQuantity: "10",
        visibleDamage: false,
        packagingCondition: "intact",
        condition: "intact",
        outcome: "observed",
        notes: "PRIVATE inspection",
        inspectedAt: actual,
        ...patch,
      }),
    );
  }
  function receiving(id: string, patch: Record<string, unknown> = {}) {
    const inspection = records.get(id)!.inspections.at(-1)!;
    return command(id, "receive", {
      warehouseId: "warehouse-1",
      storageLocationId: "storage-1",
      inspectionId: inspection.id,
      arrivedAt: actual,
      receivedQuantity: inspection.receivedQuantity,
      acceptedQuantity: inspection.receivedQuantity,
      rejectedQuantity: "0",
      condition: inspection.condition,
      notes: "PRIVATE receiving",
      ...patch,
    });
  }
  function transfer(id: string, patch: Record<string, unknown> = {}) {
    return command(id, "transfer", {
      previousCustodianId: "custodian-1",
      newCustodianId: "custodian-2",
      quantity: "10",
      condition: "intact",
      transferredAt: actual,
      reason: "PRIVATE transfer",
      receivingId: null,
      ...patch,
    });
  }
  return {
    deps,
    service,
    create,
    command,
    confirm,
    inspect,
    receiving,
    transfer,
    records,
    events,
    receipts,
    used,
    commits,
    links,
    deny: () => {
      denied = true;
    },
    setWho: (value: string) => {
      who = value;
    },
    setAudience: (v: typeof audience) => {
      audience = v;
    },
    setWarehouses: (v: string[]) => {
      warehouses = v;
    },
    setCustodians: (v: string[]) => {
      custodians = v;
    },
    setDecision: (v: string | null) => {
      decision = v;
    },
    setProof: (v: Record<string, unknown>) => {
      proofPatch = v;
    },
    setFailure: (v: boolean) => {
      failure = v;
    },
    lose: () => {
      lost = true;
    },
  };
}

describe("pickup quantities and observations", () => {
  it("normalizes exact quantities", () => {
    expect(goodsQuantitySchema.parse("1.2")).toBe("1.200");
    expect(inspectionDifference("1.201", "1.200").shortage).toBe("0.001");
  });
  for (const value of ["-1", "1.0001", "NaN", "1e3", "1000000000", " 1 ", "01"])
    it(`rejects malformed quantity ${value}`, () => {
      expect(() => goodsQuantitySchema.parse(value)).toThrow();
    });
  for (const [name, patch] of Object.entries({
    blank: { goodsDescription: " " },
    expected: { expectedQuantity: "0" },
    negative: { collectedQuantity: "-1" },
    future: { actualAt: expires },
    identifier: { tripId: "bad/id" },
    weight: { weightKg: "1.0001" },
    volume: { volumeM3: "101" },
    condition: { condition: "unknown" },
    identity: { agentId: "injected" },
  }))
    it(`rejects invalid pickup ${name}`, () => {
      expect(() => validatePickup({ ...pickup(), ...patch }, policy(), now)).toThrow();
    });
  for (const [name, received, shortage, excess] of [
    ["shortage", "8", "2.000", "0.000"],
    ["excess", "12", "0.000", "2.000"],
    ["missing", "0", "10.000", "0.000"],
  ])
    it(`derives ${name} without approval`, () => {
      expect(inspectionDifference("10", received)).toEqual({
        shortage,
        excess,
        missingGoods: shortage !== "0.000",
      });
    });
});
describe("handover service", () => {
  it("creates distinct pickup and immutable first event", async () => {
    const h = harness(),
      id = await h.create();
    expect(h.records.get(id)?.pickup.bookingId).toBe("booking-1");
    expect(h.events.get(id)).toHaveLength(1);
    expect(h.commits[0].notificationIntents).toHaveLength(1);
  });
  it("fails closed without policy", async () => {
    const h = harness();
    h.deps.policy = null;
    expect(await h.service.execute(createCommand())).toEqual({
      ok: false,
      code: "POLICY_UNAVAILABLE",
    });
  });
  it("rejects ambiguous policy", async () => {
    const h = harness();
    h.deps.policy!.rules.push(h.deps.policy!.rules[0]);
    expect((await h.service.execute(createCommand())).ok).toBe(false);
  });
  it("denies unauthorized creation", async () => {
    const h = harness();
    h.deny();
    expect((await h.service.execute(createCommand())).ok).toBe(false);
    expect(h.records.size).toBe(0);
  });
  it("rejects raw proof contents", async () => {
    const h = harness(),
      id = await h.create();
    expect(
      (
        await h.service.execute(
          h.command(id, "confirm", { confirmedAt: actual }, [
            { id: "x", mode: "OTP", otp: "123456" } as never,
          ]),
        )
      ).ok,
    ).toBe(false);
  });
  it("rejects duplicate pickup references in atomic adapter", async () => {
    const h = harness(),
      id = await h.create();
    const reference = h.records.get(id)!.pickup.reference;
    h.deps.identifiers.generate = async (kind) =>
      kind === "reference" ? reference : `new-${kind}`;
    expect(
      (await h.service.execute({ ...createCommand(), idempotencyKey: "second-create-00001" })).ok,
    ).toBe(false);
    expect(h.records.size).toBe(1);
  });
  it("normalizes retries and detects conflicting payload", async () => {
    const h = harness();
    await h.create();
    const retry = await h.service.execute({
      ...createCommand(),
      data: { ...pickup(), collectedQuantity: "10.000" },
    });
    expect(retry.ok && retry.replayed).toBe(true);
    expect(
      await h.service.execute({
        ...createCommand(),
        data: { ...pickup(), collectedQuantity: "9" },
      }),
    ).toEqual({ ok: false, code: "IDEMPOTENCY_CONFLICT" });
    expect(h.commits).toHaveLength(1);
  });
  it("handles concurrent same-key creation", async () => {
    const h = harness();
    const r = await Promise.all([
      h.service.execute(createCommand()),
      h.service.execute(createCommand()),
    ]);
    expect(r.every((x) => x.ok)).toBe(true);
    expect(h.records.size).toBe(1);
  });
  it("recovers lost responses without duplicate events", async () => {
    const h = harness();
    h.lose();
    expect((await h.service.execute(createCommand())).ok).toBe(false);
    const r = await h.service.execute(createCommand());
    expect(r.ok && r.replayed).toBe(true);
    expect(h.commits).toHaveLength(1);
  });
  it("fails atomically and recovers with the same key", async () => {
    const h = harness();
    h.setFailure(true);
    expect(await h.service.execute(createCommand())).toEqual({
      ok: false,
      code: "HANDOVER_UNAVAILABLE",
    });
    expect(h.records.size + h.events.size + h.receipts.size + h.used.size).toBe(0);
    h.setFailure(false);
    expect((await h.service.execute(createCommand())).ok).toBe(true);
  });
  it("reauthorizes idempotent retries", async () => {
    const h = harness();
    await h.create();
    h.deny();
    expect((await h.service.execute(createCommand())).ok).toBe(false);
  });
  it("requires configured proof before confirmation", async () => {
    const h = harness(),
      id = await h.create();
    expect((await h.service.execute(h.command(id, "confirm", { confirmedAt: actual }))).ok).toBe(
      false,
    );
    expect((await h.confirm(id)).ok).toBe(true);
    expect(h.used.has("proof-photo-1")).toBe(true);
  });
  for (const mode of ["OTP", "SIGNATURE", "PHOTO", "WITNESS", "MANUAL"] as const)
    it(`validates ${mode} reference through trusted verifier`, async () => {
      const h = harness(),
        id = await h.create();
      h.deps.policy!.rules.find((r) => r.action === "confirm")!.requiredProofs = [mode];
      expect(
        (
          await h.service.execute(
            h.command(id, "confirm", { confirmedAt: actual }, [{ id: `proof-${mode}`, mode }]),
          )
        ).ok,
      ).toBe(true);
    });
  for (const [name, patch] of Object.entries({
    expired: { expiresAt: now },
    used: { used: true },
    trip: { tripId: "wrong" },
    shipment: { shipmentId: "wrong" },
    pickup: { pickupId: "wrong" },
    agent: { agentId: "wrong" },
    unverified: { verified: false },
    unauthorized: { authorized: false },
    kind: { kind: "OTP" },
    purpose: { purpose: "transfer" },
    future: { verifiedAt: expires },
  }))
    it(`rejects ${name} proof`, async () => {
      const h = harness(),
        id = await h.create();
      h.setProof(patch);
      expect((await h.confirm(id)).ok).toBe(false);
      expect(h.used.size).toBe(0);
    });
  it("rejects confirmation without authorized actor", async () => {
    const h = harness(),
      id = await h.create();
    h.deny();
    expect((await h.confirm(id)).ok).toBe(false);
  });
  it("rejects missing witness identity", async () => {
    const h = harness(),
      id = await h.create();
    h.deps.policy!.rules.find((r) => r.action === "confirm")!.requiredProofs = ["WITNESS"];
    h.setProof({ confirmationActorId: null });
    expect(
      (
        await h.service.execute(
          h.command(id, "confirm", { confirmedAt: actual }, [{ id: "witness", mode: "WITNESS" }]),
        )
      ).ok,
    ).toBe(false);
  });
  it("rejects reuse across subsequent operations", async () => {
    const h = harness(),
      id = await h.create();
    await h.confirm(id);
    const c = h.transfer(id);
    c.proofs = [{ id: "proof-photo-1", mode: "PHOTO" }];
    expect((await h.service.execute(c)).ok).toBe(false);
  });
  it("rejects duplicate evidence within one operation", async () => {
    const h = harness(),
      id = await h.create();
    expect(
      (
        await h.service.execute(
          h.command(id, "confirm", { confirmedAt: actual }, [
            { id: "same", mode: "PHOTO" },
            { id: "same", mode: "PHOTO" },
          ]),
        )
      ).ok,
    ).toBe(false);
  });
  it("fails closed when consumption authorization is unavailable", async () => {
    const h = harness(),
      id = await h.create();
    h.deps.consumption.authorize = async () => null;
    expect((await h.confirm(id)).ok).toBe(false);
    expect(h.used.size).toBe(0);
  });
  it("does not consume evidence when persistence fails", async () => {
    const h = harness(),
      id = await h.create();
    h.setFailure(true);
    expect((await h.confirm(id)).ok).toBe(false);
    expect(h.used.size).toBe(0);
    expect(h.records.get(id)?.confirmed).toBe(false);
  });
  it("records damaged inspection without accepting goods", async () => {
    const h = harness(),
      id = await h.create();
    expect(
      (
        await h.inspect(id, {
          visibleDamage: true,
          condition: "damaged",
          outcome: "review-required",
        })
      ).ok,
    ).toBe(true);
    expect(h.records.get(id)?.inspections[0].visibleDamage).toBe(true);
    expect(h.records.get(id)?.receivings).toHaveLength(0);
  });
  for (const received of ["0", "8", "12"])
    it(`records warehouse observed quantity ${received}`, async () => {
      const h = harness(),
        id = await h.create();
      expect((await h.inspect(id, { receivedQuantity: received })).ok).toBe(true);
      expect(h.records.get(id)?.inspections[0].receivedQuantity).toBe(`${received}.000`);
    });
  it("records collection shortage against expected quantity", async () => {
    const h = harness(),
      id = await h.create({ ...pickup(), collectedQuantity: "8" });
    expect((await h.inspect(id, { warehouseId: null, receivedQuantity: "8" })).ok).toBe(true);
    expect(h.records.get(id)?.inspections[0].shortage).toBe("2.000");
  });
  it("rejects unapproved inspection outcome", async () => {
    const h = harness(),
      id = await h.create();
    expect((await h.inspect(id, { outcome: "auto-approved" })).ok).toBe(false);
  });
  it("receives inspected goods only with explicit disposition authorization", async () => {
    const h = harness(),
      id = await h.create();
    await h.confirm(id);
    await h.inspect(id);
    expect((await h.service.execute(h.receiving(id))).ok).toBe(true);
    expect(h.records.get(id)?.receivings[0].staff).toEqual({ kind: "USER", userId: "agent-user" });
    expect(h.records.get(id)?.custodianId).toBe("custodian-1");
  });
  it("rejects receiving without a disposition decision", async () => {
    const h = harness(),
      id = await h.create();
    await h.confirm(id);
    await h.inspect(id);
    h.setDecision(null);
    expect((await h.service.execute(h.receiving(id))).ok).toBe(false);
  });
  for (const [name, patch] of Object.entries({
    sum: { acceptedQuantity: "9", rejectedQuantity: "0" },
    inspection: { inspectionId: "missing" },
    observed: { receivedQuantity: "9", acceptedQuantity: "9" },
    arrival: { arrivedAt: expires },
    condition: { condition: "damaged" },
  }))
    it(`rejects receiving ${name} mismatch`, async () => {
      const h = harness(),
        id = await h.create();
      await h.confirm(id);
      await h.inspect(id);
      expect((await h.service.execute(h.receiving(id, patch))).ok).toBe(false);
    });
  it("rejects warehouse access outside authorization scope", async () => {
    const h = harness(),
      id = await h.create();
    await h.confirm(id);
    await h.inspect(id);
    h.setWarehouses([]);
    expect((await h.service.execute(h.receiving(id))).ok).toBe(false);
    expect((await h.inspect(id)).ok).toBe(false);
  });
  it("replays receiving and rejects duplicate physical receiving", async () => {
    const h = harness(),
      id = await h.create();
    await h.confirm(id);
    await h.inspect(id);
    const c = h.receiving(id);
    expect((await h.service.execute(c)).ok).toBe(true);
    const r = await h.service.execute(c);
    expect(r.ok && r.replayed).toBe(true);
    expect((await h.service.execute(h.receiving(id))).ok).toBe(false);
    expect(h.records.get(id)?.receivings).toHaveLength(1);
  });
  it("proposes transfer and changes custody only on acknowledgment", async () => {
    const h = harness(),
      id = await h.create();
    await h.confirm(id);
    expect((await h.service.execute(h.transfer(id))).ok).toBe(true);
    expect(h.records.get(id)?.custodianId).toBe("custodian-1");
    const transfer = h.records.get(id)!.pendingTransferId;
    expect(
      (
        await h.service.execute(
          h.command(id, "acknowledge", { transferId: transfer, acknowledgedAt: actual }),
        )
      ).ok,
    ).toBe(true);
    expect(h.records.get(id)?.custodianId).toBe("custodian-2");
    expect(h.records.get(id)?.acknowledgments).toHaveLength(1);
  });
  for (const [name, patch] of Object.entries({
    source: { previousCustodianId: "wrong" },
    same: { newCustodianId: "custodian-1" },
    quantity: { quantity: "9" },
    future: { transferredAt: expires },
    condition: { condition: "unknown" },
    reason: { reason: " " },
  }))
    it(`rejects invalid custody ${name}`, async () => {
      const h = harness(),
        id = await h.create();
      await h.confirm(id);
      expect((await h.service.execute(h.transfer(id, patch))).ok).toBe(false);
    });
  it("denies unauthorized transfer and acknowledgment", async () => {
    const h = harness(),
      id = await h.create();
    await h.confirm(id);
    h.setCustodians([]);
    expect((await h.service.execute(h.transfer(id))).ok).toBe(false);
    h.setCustodians(["custodian-1", "custodian-2"]);
    await h.service.execute(h.transfer(id));
    h.setCustodians([]);
    expect(
      (
        await h.service.execute(
          h.command(id, "acknowledge", {
            transferId: h.records.get(id)!.pendingTransferId,
            acknowledgedAt: actual,
          }),
        )
      ).ok,
    ).toBe(false);
  });
  it("rejects duplicate transfer and conflicting handover payload", async () => {
    const h = harness(),
      id = await h.create();
    await h.confirm(id);
    const c = h.transfer(id);
    await h.service.execute(c);
    expect((await h.service.execute(h.transfer(id))).ok).toBe(false);
    expect(
      await h.service.execute({ ...c, data: { ...(c.data as object), reason: "different" } }),
    ).toEqual({ ok: false, code: "IDEMPOTENCY_CONFLICT" });
  });
  it("rejects second acknowledgment under another key", async () => {
    const h = harness(),
      id = await h.create();
    await h.confirm(id);
    await h.service.execute(h.transfer(id));
    const transferId = h.records.get(id)!.pendingTransferId;
    await h.service.execute(h.command(id, "acknowledge", { transferId, acknowledgedAt: actual }));
    expect(
      (
        await h.service.execute(
          h.command(id, "acknowledge", { transferId, acknowledgedAt: actual }),
        )
      ).ok,
    ).toBe(false);
  });
  it("enforces optimistic concurrency for competing operations", async () => {
    const h = harness(),
      id = await h.create();
    const a = h.command(id, "exception", { reason: "one", eventAt: actual }),
      b = h.command(id, "exception", { reason: "two", eventAt: actual });
    const r = await Promise.all([h.service.execute(a), h.service.execute(b)]);
    expect(r.filter((x) => x.ok)).toHaveLength(1);
    expect(h.events.get(id)).toHaveLength(2);
  });
  it("protects immutable history and detects corrupted custody", async () => {
    const h = harness(),
      id = await h.create();
    const first = structuredClone(h.events.get(id)![0]);
    await h.confirm(id);
    await h.service.execute(h.transfer(id));
    expect(h.events.get(id)![0]).toEqual(first);
    const event = h.events.get(id)!.at(-1)!;
    event.data = { ...(event.data as object), previousCustodianId: "tampered" };
    expect((await h.service.get(id)).ok).toBe(false);
  });
  it("filters private details for customer and denies other customers", async () => {
    const h = harness(),
      id = await h.create();
    await h.inspect(id);
    h.setAudience("customer");
    h.setWho("customer-1");
    const r = await h.service.get(id);
    expect(r.ok).toBe(true);
    expect(JSON.stringify(r)).not.toContain("PRIVATE");
    expect(JSON.stringify(r)).not.toContain("proof-");
    h.setWho("other-customer");
    expect(await h.service.get(id)).toEqual(await h.service.get("missing"));
  });
  it("rejects unassigned agents and warehouse history access", async () => {
    const h = harness(),
      id = await h.create();
    h.setAudience("agent");
    h.setWho("other-agent");
    expect((await h.service.get(id)).ok).toBe(false);
    h.setAudience("warehouse");
    expect((await h.service.get(id)).ok).toBe(false);
  });
  it("rejects forged integration associations", async () => {
    const h = harness();
    h.links.trip.id = "wrong";
    expect((await h.service.execute(createCommand())).ok).toBe(false);
  });
  it("supports approved exceptions and cancellation without changing external records", async () => {
    const h = harness(),
      id = await h.create();
    const links = structuredClone(h.links);
    expect(
      (await h.service.execute(h.command(id, "exception", { reason: "review", eventAt: actual })))
        .ok,
    ).toBe(true);
    expect(
      (
        await h.service.execute(
          h.command(id, "cancel", { reason: "cancel request", eventAt: actual }),
        )
      ).ok,
    ).toBe(true);
    expect(h.links).toEqual(links);
    expect((await h.confirm(id)).ok).toBe(false);
  });
  it("rejects corrupt evidence shape before any external verification", () => {
    expect(() => pickupEvidenceSchema.parse({ otp: "plaintext" })).toThrow();
  });
  it("rejects an invalid initial custody event", () => {
    expect(() => applyHandoverEvent(null, { id: "e" }, policy())).toThrow();
  });
  it("reuses linked Shipment assignment and delivery proof contracts", async () => {
    const h = harness();
    const shipment = {
      id: "shipment-1",
      trackingReference: "synthetic-reference-000001",
      customerId: "customer-1",
      providerId: "provider-1",
      status: "synthetic",
      version: 1,
      createdAt: earlier,
    };
    h.links.shipment = shipment;
    h.links.assignment = {
      shipment,
      assignmentVersion: 1,
      current: {
        id: "assignment-1",
        shipmentId: shipment.id,
        agentId: "agent-1",
        version: 1,
        previousAssignmentId: null,
        action: "assign",
        reason: null,
        assignedAt: earlier,
        actor: { kind: "USER", userId: "operator" },
        policyVersion: "synthetic-assignment-v1",
      },
    };
    const id = await h.create({ ...pickup(), shipmentId: shipment.id });
    h.setProof({ deliveryAttemptId: "actual-linked-attempt" });
    expect((await h.confirm(id)).ok).toBe(true);
    expect(h.commits.at(-1)?.evidence[0].deliveryAttemptId).toBe("actual-linked-attempt");
  });
  it("rejects an invented delivery attempt without Shipment linkage", async () => {
    const h = harness(),
      id = await h.create();
    h.setProof({ deliveryAttemptId: "invalid-attempt" });
    expect((await h.confirm(id)).ok).toBe(false);
  });
  it("recovers a lost confirmation response without consuming proof twice", async () => {
    const h = harness(),
      id = await h.create();
    const c = h.command(id, "confirm", { confirmedAt: actual }, [
      { id: "proof-recovery", mode: "PHOTO" },
    ]);
    h.lose();
    expect((await h.service.execute(c)).ok).toBe(false);
    const r = await h.service.execute(c);
    expect(r.ok && r.replayed).toBe(true);
    expect(h.used.size).toBe(1);
    expect(h.events.get(id)).toHaveLength(2);
  });
  it("records inspection proof references without leaking evidence", async () => {
    const h = harness(),
      id = await h.create();
    const c = h.command(
      id,
      "inspect",
      {
        warehouseId: null,
        expectedQuantity: "10",
        receivedQuantity: "10",
        visibleDamage: false,
        packagingCondition: "intact",
        condition: "intact",
        outcome: "observed",
        notes: null,
        inspectedAt: actual,
      },
      [{ id: "inspection-proof", mode: "PHOTO" }],
    );
    expect((await h.service.execute(c)).ok).toBe(true);
    expect(h.records.get(id)?.inspections[0].evidenceIds).toEqual(["inspection-proof"]);
    h.setAudience("customer");
    h.setWho("customer-1");
    expect(JSON.stringify(await h.service.get(id))).not.toContain("inspection-proof");
  });
  it("rejects cancellation with a pending handover", async () => {
    const h = harness(),
      id = await h.create();
    await h.confirm(id);
    await h.service.execute(h.transfer(id));
    expect(
      (await h.service.execute(h.command(id, "cancel", { reason: "cancel", eventAt: actual }))).ok,
    ).toBe(false);
    expect(h.records.get(id)?.custodianId).toBe("custodian-1");
  });
  it("rejects public access grants", async () => {
    const h = harness(),
      id = await h.create();
    const authorize = h.deps.authorization.authorize.bind(h.deps.authorization);
    h.deps.authorization.authorize = async (args) =>
      ({ ...(await authorize(args)), audience: "public" }) as never;
    expect((await h.service.get(id)).ok).toBe(false);
  });
});
