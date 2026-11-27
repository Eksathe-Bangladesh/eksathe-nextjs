import { describe, expect, it } from "bun:test";

import {
  compareShipmentSubmission,
  createShipmentInputSchema,
  normalizeShipmentPayload,
  projectCustomerTracking,
  projectProviderTracking,
  projectPublicTracking,
  shipmentIdempotencyKeySchema,
  validateShipmentTransition,
  type ShipmentInputPolicy,
  type ShipmentTrackingSource,
  type ShipmentTransitionPolicy,
} from "./logistics";

// Synthetic policies are not production approvals or actual service coverage.
const policy: ShipmentInputPolicy = {
  maxParcelCount: 10,
  maxWeightKg: 50,
  maxVolumeM3: 5,
  phonePattern: /^\+999\d{6}$/,
  districts: ["Area A", "Area B"],
  parcelCategories: ["Synthetic parcel"],
};
const input = {
  pickupDistrict: "Area A",
  pickupAddress: "Test pickup",
  destinationDistrict: "Area B",
  destinationAddress: "Test destination",
  sender: { name: "Test sender", phone: "+999000001" },
  receiver: { name: "Test receiver", phone: "+999000002" },
  parcelCategory: "Synthetic parcel",
  parcelCount: "2",
  weightKg: "1.500",
  volumeM3: "0.100",
  cargoDescription: "Synthetic cargo",
  handlingNotes: "Synthetic instructions",
};
const schema = createShipmentInputSchema(policy);

describe("shipment input validation", () => {
  it("normalizes strings and measurements without mutating input", () => {
    const data = { ...input, pickupAddress: " Test pickup " };
    const result = schema.parse(data);
    expect(result.pickupAddress).toBe("Test pickup");
    expect(result.parcelCount).toBe(2);
    expect(result.weightKg).toBe(1.5);
    expect(result.volumeM3).toBe(0.1);
    expect(data.pickupAddress).toBe(" Test pickup ");
  });
  for (const field of [
    "pickupDistrict",
    "pickupAddress",
    "destinationDistrict",
    "destinationAddress",
    "parcelCategory",
  ] as const) {
    it(`rejects blank ${field}`, () =>
      expect(schema.safeParse({ ...input, [field]: " " }).success).toBe(false));
  }
  for (const [label, change] of [
    ["unsupported coverage", { destinationDistrict: "Other" }],
    ["unsupported category", { parcelCategory: "Other" }],
    ["missing sender", { sender: undefined }],
    ["invalid receiver phone", { receiver: { name: "Receiver", phone: "bad" } }],
    ["blank sender name", { sender: { name: " ", phone: "+999000001" } }],
    ["zero count", { parcelCount: 0 }],
    ["fractional count", { parcelCount: 1.5 }],
    ["excess count", { parcelCount: 11 }],
    ["zero weight", { weightKg: 0 }],
    ["negative weight", { weightKg: -1 }],
    ["excess weight", { weightKg: 51 }],
    ["nonfinite weight", { weightKg: Infinity }],
    ["not a number", { weightKg: NaN }],
    ["exponent string", { weightKg: "1e1" }],
    ["malformed measurement", { weightKg: "1kg" }],
    ["negative volume", { volumeM3: -1 }],
    ["excess volume", { volumeM3: 6 }],
    ["oversized instructions", { handlingNotes: "x".repeat(2001) }],
    ["injected owner", { customerId: "other" }],
    ["unexpected contact property", { sender: { ...input.sender, internal: "private" } }],
  ] as const) {
    it(`rejects ${label}`, () =>
      expect(schema.safeParse({ ...input, ...change }).success).toBe(false));
  }
  it("permits absent optional information and exact policy limits", () => {
    expect(schema.safeParse({ ...input, parcelCount: 10, weightKg: 50, volumeM3: 5 }).success).toBe(
      true,
    );
    const result = schema.parse({
      ...input,
      volumeM3: undefined,
      cargoDescription: " ",
      handlingNotes: undefined,
    });
    expect(result.volumeM3).toBeUndefined();
    expect(result.cargoDescription).toBeUndefined();
  });
  it("rejects invalid policy configuration", () => {
    for (const change of [
      { maxParcelCount: 0 },
      { maxWeightKg: Infinity },
      { maxVolumeM3: -1 },
      { districts: [] },
      { parcelCategories: [] },
      { phonePattern: /abc/ },
    ]) {
      expect(() => createShipmentInputSchema({ ...policy, ...change })).toThrow(
        "Invalid shipment input policy",
      );
    }
  });
  it("handles stateful injected phone expressions deterministically", () => {
    const stateful = createShipmentInputSchema({ ...policy, phonePattern: /^\+999\d{6}$/g });
    expect(stateful.safeParse(input).success).toBe(true);
    expect(stateful.safeParse(input).success).toBe(true);
  });
});

describe("shipment idempotency", () => {
  const submission = {
    actorId: "customer-a",
    operation: "synthetic-booking",
    key: "synthetic-key-0001",
    payload: input,
  };
  it("validates bounded keys without silently normalizing them", () => {
    expect(shipmentIdempotencyKeySchema.safeParse(submission.key).success).toBe(true);
    for (const key of [
      undefined,
      "",
      "short",
      " ".repeat(16),
      "x".repeat(129),
      "synthetic-key-0001 ",
      "invalid/key-00001",
    ]) {
      expect(shipmentIdempotencyKeySchema.safeParse(key).success).toBe(false);
    }
  });
  it("identifies a first submission", () =>
    expect(compareShipmentSubmission(null, submission, policy)).toBe("new"));
  it("recognizes retries after normalization and property reordering", () => {
    const reordered = Object.fromEntries(
      Object.entries({
        ...input,
        parcelCount: 2,
        weightKg: 1.5,
        pickupAddress: " Test pickup ",
      }).reverse(),
    );
    expect(
      compareShipmentSubmission(submission, { ...submission, payload: reordered }, policy),
    ).toBe("retry");
  });
  it("detects changed booking data", () => {
    for (const change of [
      { weightKg: 2 },
      { handlingNotes: "Changed" },
      { receiver: { ...input.receiver, phone: "+999000003" } },
    ]) {
      expect(
        compareShipmentSubmission(
          submission,
          { ...submission, payload: { ...input, ...change } },
          policy,
        ),
      ).toBe("conflict");
    }
  });
  it("separates actors, operations and keys", () => {
    for (const change of [
      { actorId: "customer-b" },
      { operation: "another-operation" },
      { key: "synthetic-key-0002" },
    ]) {
      expect(compareShipmentSubmission(submission, { ...submission, ...change }, policy)).toBe(
        "new",
      );
    }
  });
  it("rejects invalid keys and empty identity", () => {
    for (const change of [{ key: "bad" }, { actorId: " " }, { operation: "" }]) {
      expect(() => compareShipmentSubmission(null, { ...submission, ...change }, policy)).toThrow(
        "Invalid submission identity or key",
      );
    }
  });
  it("rejects invalid payload without echoing private data", () => {
    expect(() =>
      normalizeShipmentPayload({ ...input, sender: { name: "Secret", phone: "Secret" } }, policy),
    ).toThrow(/^Invalid shipment input$/);
  });
});

describe("tracking privacy", () => {
  const source: ShipmentTrackingSource = {
    trackingReference: "SYNTHETIC-REF",
    status: "synthetic-state-a",
    customerId: "customer-a",
    providerId: "provider-a",
    shipment: schema.parse(input),
    internalNotes: "PRIVATE",
    events: (["public", "customer", "provider", "internal"] as const).map((visibility) => ({
      status: `synthetic-${visibility}`,
      eventAt: "2026-01-01T00:00:00Z",
      recordedAt: "2026-01-01T00:01:00Z",
      visibility,
      internalNote: "PRIVATE",
    })),
  };
  it("projects only public status and event timestamps", () => {
    expect(projectPublicTracking(source)).toEqual({
      trackingReference: source.trackingReference,
      status: source.status,
      events: [
        {
          status: "synthetic-public",
          eventAt: source.events[0].eventAt,
          recordedAt: source.events[0].recordedAt,
        },
      ],
    });
  });
  it("includes only permitted customer history", () => {
    expect(projectCustomerTracking(source, "customer-a")?.events.map((e) => e.status)).toEqual([
      "synthetic-public",
      "synthetic-customer",
    ]);
  });
  it("includes only permitted provider history", () => {
    expect(projectProviderTracking(source, "provider-a")?.events.map((e) => e.status)).toEqual([
      "synthetic-public",
      "synthetic-provider",
    ]);
  });
  it("denies mismatched and empty identities", () => {
    for (const actor of ["", " ", "other"]) {
      expect(projectCustomerTracking(source, actor)).toBeNull();
      expect(projectProviderTracking(source, actor)).toBeNull();
    }
  });
  it("never leaks contacts, ownership, private notes or newly added fields", () => {
    const extended = { ...source, secretFutureField: "PRIVATE" };
    for (const projection of [
      projectPublicTracking(extended),
      projectCustomerTracking(extended, "customer-a"),
      projectProviderTracking(extended, "provider-a"),
    ]) {
      const serialized = JSON.stringify(projection);
      for (const privateValue of [
        "PRIVATE",
        "+999",
        "Test pickup",
        "customer-a",
        "provider-a",
        "handlingNotes",
        "internalNote",
      ])
        expect(serialized).not.toContain(privateValue);
    }
  });
  it("does not return mutable event references", () => {
    const projected = projectPublicTracking(source);
    projected.events[0].status = "changed";
    expect(source.events[0].status).toBe("synthetic-public");
  });
});

describe("policy-injected shipment transitions", () => {
  const approved: ShipmentTransitionPolicy = {
    approval: "approved",
    transitions: { syntheticA: ["syntheticB"], syntheticB: [] },
  };
  it("fails closed without an approved policy", () => {
    for (const policy of [undefined, null, { ...approved, approval: "pending" as const }]) {
      expect(validateShipmentTransition("syntheticA", "syntheticB", policy)).toEqual({
        allowed: false,
        reason: "policy-required",
      });
    }
  });
  it("accepts only an injected edge", () =>
    expect(validateShipmentTransition("syntheticA", "syntheticB", approved).allowed).toBe(true));
  it("rejects reverse, terminal, unknown, blank and implicit self transitions", () => {
    for (const [from, to] of [
      ["syntheticB", "syntheticA"],
      ["syntheticB", "syntheticB"],
      ["syntheticA", "syntheticA"],
      ["unknown", "syntheticB"],
      ["syntheticA", "unknown"],
      ["", "syntheticB"],
      ["constructor", "syntheticB"],
    ]) {
      expect(validateShipmentTransition(from, to, approved).allowed).toBe(false);
    }
  });
  it("requires destination registration and permits explicitly configured self edges", () => {
    expect(
      validateShipmentTransition("a", "b", { approval: "approved", transitions: { a: ["b"] } })
        .allowed,
    ).toBe(false);
    expect(
      validateShipmentTransition("a", "a", { approval: "approved", transitions: { a: ["a"] } })
        .allowed,
    ).toBe(true);
  });
});
