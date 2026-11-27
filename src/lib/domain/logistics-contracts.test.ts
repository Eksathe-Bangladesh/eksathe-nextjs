import { describe, expect, it } from "bun:test";

import { createShipmentInputSchema } from "./logistics";
import {
  validateShipmentActor,
  canonicalizeBookingFingerprint,
  validateShipmentEventAppend,
  validateShipmentEventVisibilityChange,
  evaluateShipmentRetention,
  type ShipmentRetentionPolicy,
  type ShipmentRetentionContext,
  type ShipmentEventIntegrityPolicy,
  type BookingFingerprintPolicy,
} from "./logistics-contracts";
import { createShipmentMeasurementSchema } from "./logistics-measurements";

describe("shipment actor contracts", () => {
  const user = { kind: "USER", authenticatedUserId: "synthetic-user" } as const;
  const system = {
    kind: "SYSTEM" as const,
    executingServiceId: "synthetic-worker",
    allowedServiceIds: ["synthetic-worker"],
  };
  it("accepts a matched authenticated user", () =>
    expect(validateShipmentActor({ kind: "USER", userId: user.authenticatedUserId }, user)).toEqual(
      { kind: "USER", userId: user.authenticatedUserId },
    ));
  it("accepts only the executing allowlisted system actor", () => {
    expect(
      validateShipmentActor({ kind: "SYSTEM", serviceId: system.executingServiceId }, system).kind,
    ).toBe("SYSTEM");
    expect(() =>
      validateShipmentActor(
        { kind: "SYSTEM", serviceId: system.executingServiceId },
        { ...system, allowedServiceIds: ["different"] },
      ),
    ).toThrow();
  });
  for (const [label, claim] of [
    ["missing", undefined],
    ["missing user identity", { kind: "USER" }],
    ["empty identity", { kind: "USER", userId: "" }],
    ["different user", { kind: "USER", userId: "someone-else" }],
    [
      "conflicting identities",
      { kind: "USER", userId: "synthetic-user", serviceId: "synthetic-worker" },
    ],
    ["system impersonation", { kind: "SYSTEM", serviceId: "synthetic-worker" }],
    ["claimed trust", { kind: "USER", userId: "synthetic-user", trusted: true }],
  ] as const)
    it(`rejects ${label}`, () => expect(() => validateShipmentActor(claim, user)).toThrow());
  it("rejects claims without independent trusted context", () =>
    expect(() =>
      validateShipmentActor({ kind: "USER", userId: "synthetic-user" }, undefined as never),
    ).toThrow());
  it("rejects missing or conflicting system identities", () => {
    for (const claim of [
      { kind: "SYSTEM" },
      { kind: "SYSTEM", serviceId: "other" },
      { kind: "SYSTEM", serviceId: "synthetic-worker", userId: "synthetic-user" },
    ])
      expect(() => validateShipmentActor(claim, system)).toThrow();
  });
});

const shipmentPolicy = {
  maxParcelCount: 10,
  maxWeightKg: 50,
  maxVolumeM3: 5,
  phonePattern: /^\+999\d{6}$/,
  districts: ["Area A"],
  parcelCategories: ["Synthetic"],
};
const shipment = {
  pickupDistrict: "Area A",
  destinationDistrict: "Area A",
  pickupAddress: "Test pickup",
  destinationAddress: "Test destination",
  sender: { name: "Sender", phone: "+999000001" },
  receiver: { name: "Receiver", phone: "+999000002" },
  parcelCategory: "Synthetic",
  parcelCount: "1",
  weightKg: "1.500",
};

describe("decimal measurement contracts", () => {
  const schema = createShipmentMeasurementSchema({ maximum: "999999999.999" });
  it("accepts exact storage boundaries without rounding", () => {
    expect(schema.parse("0.001")).toBe(0.001);
    expect(schema.parse("999999999.999")).toBe(999999999.999);
    expect(schema.parse(1.001)).toBe(1.001);
  });
  for (const [label, value] of [
    ["excess string precision", "1.0001"],
    ["trailing excess precision", "1.0000"],
    ["excess number precision", 1.0001],
    ["arithmetic artifact", 0.1 + 0.2],
    ["overflow", "1000000000"],
    ["number overflow", 1000000000],
    ["negative", -1],
    ["zero", 0],
    ["nonfinite", Infinity],
    ["nan", NaN],
    ["exponent", "1e2"],
    ["blank", " "],
    ["null", null],
  ] as const)
    it(`rejects ${label}`, () => expect(schema.safeParse(value).success).toBe(false));
  it("enforces injected lower maximum and rejects invalid configuration", () => {
    expect(createShipmentMeasurementSchema({ maximum: "1.001" }).safeParse("1.002").success).toBe(
      false,
    );
    for (const maximum of [0, -1, 1.0001, Infinity, "1000000000", "bad"])
      expect(() => createShipmentMeasurementSchema({ maximum })).toThrow();
    expect(() => createShipmentMeasurementSchema(undefined as never)).toThrow();
  });
  it("hardens both existing shipment measurements", () => {
    const schema = createShipmentInputSchema(shipmentPolicy);
    expect(schema.safeParse({ ...shipment, weightKg: 1.0001 }).success).toBe(false);
    expect(schema.safeParse({ ...shipment, volumeM3: 0.0001 }).success).toBe(false);
  });
});

describe("canonical booking fingerprint envelope", () => {
  const policy: BookingFingerprintPolicy = {
    payloadContractVersion: "synthetic-v1",
    operation: "booking.create",
    requestMode: "existing",
    quotationMode: "required",
  };
  const envelope = {
    payloadContractVersion: policy.payloadContractVersion,
    operation: policy.operation,
    listingId: "listing-a",
    requestId: "request-a",
    quotation: { id: "quote-a", version: "1" },
    shipment,
  };
  const canonical = (input: unknown) =>
    canonicalizeBookingFingerprint(input, policy, shipmentPolicy);
  it("normalizes equivalent input independent of property order", () => {
    const changed = {
      ...envelope,
      quotation: { version: "1", id: "quote-a" },
      shipment: { ...shipment, weightKg: 1.5, parcelCount: 1, pickupAddress: " Test pickup " },
    };
    expect(canonical(Object.fromEntries(Object.entries(changed).reverse()))).toBe(
      canonical(envelope),
    );
  });
  it("binds listing, request, quotation identity and version", () => {
    for (const change of [
      { listingId: "listing-b" },
      { requestId: "request-b" },
      { quotation: { id: "quote-b", version: "1" } },
      { quotation: { id: "quote-a", version: "2" } },
    ])
      expect(canonical({ ...envelope, ...change })).not.toBe(canonical(envelope));
  });
  it("rejects unsupported contract versions and incomplete identifiers", () => {
    for (const change of [
      { payloadContractVersion: "unknown" },
      { operation: "different" },
      { requestId: null },
      { listingId: " " },
      { quotation: null },
      { quotation: { id: "quote-a" } },
      { actorId: "injected" },
    ])
      expect(() => canonical({ ...envelope, ...change })).toThrow();
  });
  it("supports explicitly configured new unquoted bookings", () => {
    const result = canonicalizeBookingFingerprint(
      { ...envelope, requestId: null, quotation: null },
      { ...policy, requestMode: "new", quotationMode: "absent" },
      shipmentPolicy,
    );
    expect(JSON.parse(result).requestId).toBeNull();
    expect(() =>
      canonicalizeBookingFingerprint(
        envelope,
        { ...policy, requestMode: "new", quotationMode: "absent" },
        shipmentPolicy,
      ),
    ).toThrow();
  });
  it("rejects missing policy and invalid payload with generic errors", () => {
    expect(() =>
      canonicalizeBookingFingerprint(envelope, undefined as never, shipmentPolicy),
    ).toThrow("Invalid booking fingerprint contract");
    expect(() =>
      canonical({ ...envelope, shipment: { ...shipment, weightKg: "PRIVATE" } }),
    ).toThrow(/^Invalid booking fingerprint payload$/);
  });
  it("does not mutate input", () => {
    const before = JSON.stringify(envelope);
    canonical(envelope);
    expect(JSON.stringify(envelope)).toBe(before);
  });
});

describe("event integrity", () => {
  const policy: ShipmentEventIntegrityPolicy = {
    lifecycle: {
      approval: "approved",
      transitions: { syntheticA: ["syntheticB"], syntheticB: [] },
    },
    initialStatus: "syntheticA",
    allowedVisibilities: ["internal"],
    allowUnchangedStatusEvents: false,
  };
  const initial = {
    shipmentId: "shipment-a",
    sequence: 1,
    previousStatus: null,
    resultingStatus: "syntheticA",
    visibility: "internal" as const,
  };
  const snapshot = { shipmentId: "shipment-a", version: 1, status: "syntheticA" };
  const next = {
    ...initial,
    sequence: 2,
    previousStatus: "syntheticA",
    resultingStatus: "syntheticB",
  };
  it("accepts the configured initial event", () =>
    expect(validateShipmentEventAppend(initial, null, policy)).toEqual(initial));
  it("rejects invalid initial sequence, previous state and result", () => {
    for (const change of [
      { sequence: 0 },
      { sequence: 2 },
      { previousStatus: "syntheticA" },
      { resultingStatus: "syntheticB" },
    ])
      expect(() => validateShipmentEventAppend({ ...initial, ...change }, null, policy)).toThrow();
  });
  it("accepts the next permitted event", () =>
    expect(validateShipmentEventAppend(next, snapshot, policy)).toEqual(next));
  it("rejects replay, gaps, foreign shipment and inconsistent status", () => {
    for (const change of [
      { sequence: 1 },
      { sequence: 3 },
      { sequence: 1.5 },
      { shipmentId: "shipment-b" },
      { previousStatus: "syntheticB" },
      { previousStatus: null },
      { resultingStatus: "unknown" },
    ])
      expect(() => validateShipmentEventAppend({ ...next, ...change }, snapshot, policy)).toThrow();
  });
  it("rejects missing, pending and malformed policies", () => {
    for (const p of [
      undefined,
      { ...policy, lifecycle: { ...policy.lifecycle, approval: "pending" } },
      { ...policy, initialStatus: "missing" },
    ])
      expect(() => validateShipmentEventAppend(initial, null, p as never)).toThrow();
  });
  it("rejects unapproved publication and any persisted visibility mutation", () => {
    expect(() =>
      validateShipmentEventAppend({ ...next, visibility: "public" }, snapshot, policy),
    ).toThrow();
    expect(validateShipmentEventVisibilityChange("internal", "internal")).toBe("internal");
    for (const visibility of ["public", "provider", "customer", "bad", undefined])
      expect(() => validateShipmentEventVisibilityChange("internal", visibility)).toThrow();
  });
  it("permits publication only through trusted policy for a new event", () =>
    expect(
      validateShipmentEventAppend({ ...next, visibility: "customer" }, snapshot, {
        ...policy,
        allowedVisibilities: ["customer"],
      }).visibility,
    ).toBe("customer"));
  it("requires explicit permission for non-status events", () => {
    const unchanged = { ...next, resultingStatus: "syntheticA" };
    expect(() => validateShipmentEventAppend(unchanged, snapshot, policy)).toThrow();
    expect(
      validateShipmentEventAppend(unchanged, snapshot, {
        ...policy,
        allowUnchangedStatusEvents: true,
      }).sequence,
    ).toBe(2);
  });
  it("rejects sequence overflow", () =>
    expect(() =>
      validateShipmentEventAppend(
        { ...next, sequence: 2_147_483_648 },
        { ...snapshot, version: 2_147_483_647 },
        policy,
      ),
    ).toThrow());
});

describe("retention decisions", () => {
  const policy: ShipmentRetentionPolicy = {
    approval: "approved",
    version: "synthetic-retention-v1",
    anchor: "operational-closure",
    retentionMs: 1000,
  };
  const context: ShipmentRetentionContext = {
    nowMs: 2000,
    closedAtMs: 1000,
    legalHold: false,
    recordedPolicyVersion: policy.version,
  };
  it("allows purge eligibility at exact expiry, not before", () => {
    expect(evaluateShipmentRetention(policy, context)).toEqual({
      eligibleForPurge: true,
      expiresAtMs: 2000,
      reason: "expired",
    });
    expect(evaluateShipmentRetention(policy, { ...context, nowMs: 1999 }).eligibleForPurge).toBe(
      false,
    );
  });
  it("retains legally held data after expiry", () =>
    expect(evaluateShipmentRetention(policy, { ...context, legalHold: true }).reason).toBe(
      "legal-hold",
    ));
  it("does not invent expiry for an open shipment", () =>
    expect(evaluateShipmentRetention(policy, { ...context, closedAtMs: null })).toEqual({
      eligibleForPurge: false,
      expiresAtMs: null,
      reason: "awaiting-closure",
    }));
  it("rejects missing, pending and invalid policy configuration", () => {
    for (const p of [
      undefined,
      {},
      { ...policy, approval: "pending" },
      { ...policy, retentionMs: 0 },
      { ...policy, retentionMs: -1 },
      { ...policy, retentionMs: 1.5 },
      { ...policy, retentionMs: Infinity },
      { ...policy, anchor: "unknown" },
    ])
      expect(() => evaluateShipmentRetention(p as never, context)).toThrow();
  });
  it("rejects mismatched policy version and invalid clock facts", () => {
    for (const change of [
      { recordedPolicyVersion: "other" },
      { nowMs: NaN },
      { closedAtMs: 3000 },
      { legalHold: undefined },
    ])
      expect(() => evaluateShipmentRetention(policy, { ...context, ...change } as never)).toThrow();
  });
  it("rejects expiry overflow and does not change inputs", () => {
    expect(() =>
      evaluateShipmentRetention({ ...policy, retentionMs: Number.MAX_SAFE_INTEGER }, context),
    ).toThrow();
    const before = JSON.stringify({ policy, context });
    evaluateShipmentRetention(policy, context);
    expect(JSON.stringify({ policy, context })).toBe(before);
  });
});
