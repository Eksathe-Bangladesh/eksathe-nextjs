import { describe, expect, it } from "bun:test";

import { createLogisticsQuoteSnapshot } from "../domain/logistics-pricing";
import { createLogisticsBookingService } from "./logistics-booking";
import type {
  AtomicLogisticsBooking,
  AtomicLogisticsBookingCommand,
  AtomicLogisticsBookingResult,
  AuthorizedBookingContext,
  BookingReceiptScope,
  LogisticsBookingDependencies,
  LogisticsBookingPolicy,
  LogisticsBookingReceipt,
  LogisticsBookingRepository,
} from "./logistics-booking-contracts";

const createdAt = "2026-01-01T00:00:00.000Z";
const privateMarker = "PRIVATE_SYNTHETIC_CONTACT";

function shipmentInput() {
  return {
    pickupDistrict: "Synthetic A",
    pickupAddress: "Synthetic pickup address",
    destinationDistrict: "Synthetic B",
    destinationAddress: "Synthetic destination address",
    sender: { name: privateMarker, phone: "+999000001" },
    receiver: { name: "Synthetic receiver", phone: "+999000002" },
    parcelCategory: "Synthetic parcel",
    parcelCount: "1",
    weightKg: "1.500",
    volumeM3: "0.125",
    cargoDescription: "Private synthetic cargo",
    handlingNotes: "Private synthetic handling notes",
  };
}

function calculation() {
  return {
    sourceQuoteId: "synthetic-quote",
    amount: "12.50",
    currency: "BDT" as const,
    calculationBasis: "Synthetic test charge",
    calculationVersion: "synthetic-calculation-v1",
    classification: "ESTIMATE" as const,
    quoteStatus: "PENDING" as const,
    capturedAt: createdAt,
  };
}

function bookingInput() {
  return {
    idempotencyKey: "synthetic-booking-key-0001",
    listingId: "synthetic-listing",
    requestId: "synthetic-request",
    quotation: {
      id: "synthetic-quote",
      version: "synthetic-quote-v1",
      snapshot: createLogisticsQuoteSnapshot(calculation()),
    },
    shipment: shipmentInput(),
  };
}

function bookingPolicy(): LogisticsBookingPolicy {
  return {
    fingerprint: {
      payloadContractVersion: "synthetic-payload-v1",
      operation: "synthetic.booking.create",
      requestMode: "existing",
      quotationMode: "required",
    },
    shipment: {
      maxParcelCount: 10,
      maxWeightKg: 50,
      maxVolumeM3: 5,
      phonePattern: /^\+999\d{6}$/,
      districts: ["Synthetic A", "Synthetic B"],
      parcelCategories: ["Synthetic parcel"],
    },
    initialEvent: {
      integrity: {
        lifecycle: {
          approval: "approved",
          transitions: { syntheticInitial: ["syntheticNext"], syntheticNext: [] },
        },
        initialStatus: "syntheticInitial",
        allowedVisibilities: ["internal"],
        allowUnchangedStatusEvents: false,
      },
      visibility: "internal",
    },
    notifications: {
      approval: "approved",
      version: "synthetic-notifications-v1",
      intents: [
        { audience: "customer", templateKey: "synthetic-customer-template" },
        { audience: "provider", templateKey: "synthetic-provider-template" },
      ],
    },
  };
}

function authorizedContext(): AuthorizedBookingContext {
  return {
    customerId: "synthetic-customer",
    listing: { id: "synthetic-listing", providerId: "synthetic-provider" },
    provider: { id: "synthetic-provider" },
    requestId: "synthetic-request",
    quotation: {
      id: "synthetic-quote",
      version: "synthetic-quote-v1",
      calculation: calculation(),
    },
    revision: "synthetic-context-v1",
  };
}

function sameScope(a: BookingReceiptScope, b: BookingReceiptScope) {
  return a.customerId === b.customerId && a.operation === b.operation && a.key === b.key;
}

// Synthetic orchestration adapter only. These tests do not establish database
// concurrency, transaction isolation, durability, or notification delivery.
class MemoryBookingRepository implements LogisticsBookingRepository {
  bookings: AtomicLogisticsBooking[] = [];
  commands: AtomicLogisticsBookingCommand[] = [];
  lookups: BookingReceiptScope[] = [];
  hideReceipts = false;
  lookupOverride: LogisticsBookingReceipt | undefined;
  commitOverride: AtomicLogisticsBookingResult | undefined;
  failAt: keyof AtomicLogisticsBooking | null = null;
  failLookup = false;
  throwAfterCommit = false;
  currentContextRevision = "synthetic-context-v1";

  async findReceipt(scope: BookingReceiptScope) {
    this.lookups.push(structuredClone(scope));
    if (this.failLookup) throw new Error(privateMarker);
    if (this.lookupOverride) return structuredClone(this.lookupOverride);
    if (this.hideReceipts) return null;
    const existing = this.bookings.find((booking) => sameScope(booking.receipt.scope, scope));
    return existing ? structuredClone(existing.receipt) : null;
  }

  async commitBooking(
    command: AtomicLogisticsBookingCommand,
  ): Promise<AtomicLogisticsBookingResult> {
    this.commands.push(structuredClone(command));
    if (this.commitOverride) return structuredClone(this.commitOverride);
    const existing = this.bookings.find((booking) =>
      sameScope(booking.receipt.scope, command.booking.receipt.scope),
    );
    if (existing) return { kind: "existing", receipt: structuredClone(existing.receipt) };
    if (command.authorization.revision !== this.currentContextRevision)
      return { kind: "context-changed" };
    if (this.bookings.some((booking) => booking.shipment.id === command.booking.shipment.id))
      return { kind: "shipment-id-collision" };
    if (
      this.bookings.some(
        (booking) =>
          booking.shipment.trackingReference === command.booking.shipment.trackingReference,
      )
    )
      return { kind: "tracking-collision" };
    const staged = structuredClone(command.booking);
    for (const part of [
      "shipment",
      "privateDetails",
      "initialEvent",
      "receipt",
      "notificationIntents",
    ] as const) {
      if (this.failAt === part) throw new Error(privateMarker);
    }
    this.bookings.push(staged);
    if (this.throwAfterCommit) {
      this.throwAfterCommit = false;
      throw new Error(privateMarker);
    }
    return { kind: "created", receipt: structuredClone(staged.receipt) };
  }
}

function fixture() {
  const repository = new MemoryBookingRepository();
  const state: {
    customer: { customerId: string } | null;
    context: AuthorizedBookingContext | null;
    failure: "identity" | "context" | "generation" | "clock" | null;
    generated: number;
    trackingGenerated: number;
    shipmentIdOverride?: string;
    trackingOverride?: string;
    now: string;
  } = {
    customer: { customerId: "synthetic-customer" },
    context: authorizedContext(),
    failure: null,
    generated: 0,
    trackingGenerated: 0,
    now: createdAt,
  };
  const policy = bookingPolicy();
  const dependencies: LogisticsBookingDependencies = {
    identity: {
      async getCustomer() {
        if (state.failure === "identity") throw new Error(privateMarker);
        return state.customer;
      },
    },
    contexts: {
      async authorize() {
        if (state.failure === "context") throw new Error(privateMarker);
        return state.context;
      },
    },
    repository,
    identifiers: {
      async generateShipmentId() {
        if (state.failure === "generation") throw new Error(privateMarker);
        state.generated++;
        return state.shipmentIdOverride ?? `synthetic-shipment-${state.generated}`;
      },
      async generateTrackingReference() {
        state.trackingGenerated++;
        return state.trackingOverride ?? `synthetic_tracking_0000000${state.trackingGenerated}`;
      },
    },
    clock: {
      now() {
        if (state.failure === "clock") throw new Error(privateMarker);
        return state.now;
      },
    },
    policy,
  };
  return {
    repository,
    state,
    policy,
    dependencies,
    service: createLogisticsBookingService(dependencies),
  };
}

function firstBooking(repository: MemoryBookingRepository) {
  const booking = repository.bookings[0];
  if (!booking) throw new Error("Expected a synthetic booking");
  return booking;
}

function expectNoWrite(f: ReturnType<typeof fixture>) {
  expect(f.repository.bookings).toHaveLength(0);
  expect(f.repository.commands).toHaveLength(0);
}

describe("isolated Logistics booking orchestration", () => {
  it("submits all five parts with trusted identity, exact BDT snapshot, and injected initial event", async () => {
    const f = fixture();
    const result = await f.service.book(bookingInput());
    expect(result).toEqual({
      ok: true,
      replayed: false,
      booking: {
        shipmentId: "synthetic-shipment-1",
        trackingReference: "synthetic_tracking_00000001",
        status: "syntheticInitial",
        createdAt,
      },
    });
    const saved = firstBooking(f.repository);
    expect(Object.keys(saved).sort()).toEqual([
      "initialEvent",
      "notificationIntents",
      "privateDetails",
      "receipt",
      "shipment",
    ]);
    expect(saved.shipment.customerId).toBe("synthetic-customer");
    expect(saved.shipment.providerId).toBe("synthetic-provider");
    expect(saved.shipment.quoteSnapshot).toEqual(createLogisticsQuoteSnapshot(calculation()));
    expect(saved.shipment.quotation).toEqual({
      id: "synthetic-quote",
      version: "synthetic-quote-v1",
    });
    expect(saved.privateDetails.details).toEqual({
      ...shipmentInput(),
      parcelCount: 1,
      weightKg: 1.5,
      volumeM3: 0.125,
    });
    expect(saved.privateDetails.shipmentId).toBe(saved.shipment.id);
    expect(saved.initialEvent).toEqual({
      shipmentId: saved.shipment.id,
      sequence: 1,
      previousStatus: null,
      resultingStatus: saved.shipment.status,
      visibility: "internal",
      actor: { kind: "USER", userId: "synthetic-customer" },
      eventAt: createdAt,
      recordedAt: createdAt,
    });
    expect(saved.notificationIntents).toHaveLength(2);
    expect(saved.notificationIntents.map((intent) => intent.recipient)).toEqual([
      { kind: "customer", id: "synthetic-customer" },
      { kind: "provider", id: "synthetic-provider" },
    ]);
    for (const intent of saved.notificationIntents) {
      expect(intent.shipmentId).toBe(saved.shipment.id);
      expect(intent.eventSequence).toBe(1);
      expect(intent.policyVersion).toBe("synthetic-notifications-v1");
      expect(Object.keys(intent).sort()).toEqual([
        "eventSequence",
        "policyVersion",
        "recipient",
        "shipmentId",
        "templateKey",
      ]);
    }
    expect(f.repository.commands[0]?.authorization).toEqual({
      customerId: "synthetic-customer",
      listingId: "synthetic-listing",
      providerId: "synthetic-provider",
      requestId: "synthetic-request",
      quotation: { id: "synthetic-quote", version: "synthetic-quote-v1" },
      revision: "synthetic-context-v1",
    });
  });

  it("supports only explicitly configured new unquoted bookings and notification opt-out", async () => {
    const f = fixture();
    f.policy.fingerprint.requestMode = "new";
    f.policy.fingerprint.quotationMode = "absent";
    f.policy.notifications.intents = [];
    f.state.context = { ...authorizedContext(), requestId: null, quotation: null };
    const result = await f.service.book({ ...bookingInput(), requestId: null, quotation: null });
    expect(result.ok).toBe(true);
    const saved = firstBooking(f.repository);
    expect(saved.shipment.requestId).toBeNull();
    expect(saved.shipment.quotation).toBeNull();
    expect(saved.shipment.quoteSnapshot).toBeNull();
    expect(saved.notificationIntents).toEqual([]);
  });

  it("uses a different explicit initial status without inferring commercial confirmation", async () => {
    const f = fixture();
    f.policy.initialEvent.integrity.initialStatus = "syntheticNext";
    expect((await f.service.book(bookingInput())).ok).toBe(true);
    const saved = firstBooking(f.repository);
    expect(saved.shipment.status).toBe("syntheticNext");
    expect(saved.initialEvent.resultingStatus).toBe("syntheticNext");
    expect(saved.shipment.quoteSnapshot?.quoteStatus).toBe("PENDING");
    expect(saved.shipment.quoteSnapshot?.classification).toBe("ESTIMATE");
  });
});

describe("booking trust boundaries", () => {
  for (const customer of [null, { customerId: "" }])
    it(`requires a valid server customer: ${JSON.stringify(customer)}`, async () => {
      const f = fixture();
      f.state.customer = customer;
      expect(await f.service.book(bookingInput())).toEqual({ ok: false, code: "UNAUTHENTICATED" });
      expectNoWrite(f);
      expect(f.repository.lookups).toHaveLength(0);
    });

  for (const field of ["customerId", "providerId", "trusted", "actorId"])
    it(`rejects client identity/authority field ${field}`, async () => {
      const f = fixture();
      expect(await f.service.book({ ...bookingInput(), [field]: "injected" })).toEqual({
        ok: false,
        code: "INVALID_INPUT",
      });
      expectNoWrite(f);
    });

  const contexts: [string, AuthorizedBookingContext | null][] = [
    ["denied", null],
    ["customer mismatch", { ...authorizedContext(), customerId: "other-customer" }],
    [
      "listing mismatch",
      { ...authorizedContext(), listing: { id: "other", providerId: "synthetic-provider" } },
    ],
    ["provider mismatch", { ...authorizedContext(), provider: { id: "other-provider" } }],
    ["request mismatch", { ...authorizedContext(), requestId: "other-request" }],
    ["quote absent", { ...authorizedContext(), quotation: null }],
    [
      "quote mismatch",
      {
        ...authorizedContext(),
        quotation: { id: "other-quote", version: "synthetic-quote-v1", calculation: calculation() },
      },
    ],
    [
      "quote version mismatch",
      {
        ...authorizedContext(),
        quotation: { id: "synthetic-quote", version: "other-version", calculation: calculation() },
      },
    ],
    [
      "source quote mismatch",
      {
        ...authorizedContext(),
        quotation: {
          id: "synthetic-quote",
          version: "synthetic-quote-v1",
          calculation: { ...calculation(), sourceQuoteId: "other-source" },
        },
      },
    ],
  ];
  for (const [label, context] of contexts)
    it(`rejects unauthorized context: ${label}`, async () => {
      const f = fixture();
      f.state.context = context;
      const input = bookingInput();
      if (label === "source quote mismatch" && context?.quotation)
        input.quotation.snapshot = createLogisticsQuoteSnapshot(context.quotation.calculation);
      expect(await f.service.book(input)).toEqual({ ok: false, code: "BOOKING_NOT_ALLOWED" });
      expectNoWrite(f);
      expect(f.repository.lookups).toHaveLength(0);
      expect(f.state.generated).toBe(0);
    });

  for (const change of [
    { weightKg: "1.0001" },
    { weightKg: 0.1 + 0.2 },
    { weightKg: 0 },
    { volumeM3: "0.0001" },
    { parcelCount: "0" },
    { destinationDistrict: "Unsupported" },
    { sender: { name: privateMarker, phone: "invalid" } },
    { receiver: { name: "", phone: "+999000002" } },
    { providerId: "injected" },
  ])
    it(`rejects invalid shipment ${JSON.stringify(change)}`, async () => {
      const f = fixture();
      const result = await f.service.book({
        ...bookingInput(),
        shipment: { ...shipmentInput(), ...change },
      });
      expect(result).toEqual({ ok: false, code: "INVALID_INPUT" });
      expect(JSON.stringify(result)).not.toContain(privateMarker);
      expectNoWrite(f);
    });

  for (const key of ["short", " invalid-key-00000000", "synthetic/key/000000"])
    it(`rejects invalid idempotency key ${key}`, async () => {
      const f = fixture();
      expect(await f.service.book({ ...bookingInput(), idempotencyKey: key })).toEqual({
        ok: false,
        code: "INVALID_INPUT",
      });
      expectNoWrite(f);
    });

  for (const change of [
    { currency: "USD" },
    { amount: "1.000" },
    { amount: 12.5 },
    { amount: "0.01" },
    { snapshotVersion: "unknown" },
    { calculationVersion: "other" },
    { quoteStatus: "ACCEPTED" },
    { capturedAt: "2026-01-02T00:00:00.000Z" },
    { sourceQuoteId: "other-quote" },
  ])
    it(`rejects invalid or tampered BDT quote ${JSON.stringify(change)}`, async () => {
      const f = fixture();
      const input = bookingInput();
      const result = await f.service.book({
        ...input,
        quotation: { ...input.quotation, snapshot: { ...input.quotation.snapshot, ...change } },
      });
      expect(result).toEqual({ ok: false, code: "INVALID_QUOTE" });
      expectNoWrite(f);
    });

  it("does not permit omission of a required quote", async () => {
    const f = fixture();
    expect((await f.service.book({ ...bookingInput(), quotation: null })).ok).toBe(false);
    expectNoWrite(f);
  });

  it("fails closed with no policy", async () => {
    const f = fixture();
    f.dependencies.policy = null;
    expect(await f.service.book(bookingInput())).toEqual({ ok: false, code: "POLICY_UNAVAILABLE" });
    expectNoWrite(f);
    expect(f.repository.lookups).toHaveLength(0);
  });

  for (const kind of [
    "lifecycle-pending",
    "initial-unregistered",
    "visibility",
    "notifications-pending",
    "measurements",
  ] as const)
    it(`fails closed for invalid policy ${kind}`, async () => {
      const f = fixture();
      if (kind === "lifecycle-pending")
        f.policy.initialEvent.integrity.lifecycle.approval = "pending";
      if (kind === "initial-unregistered")
        f.policy.initialEvent.integrity.initialStatus = "unregistered";
      if (kind === "visibility") f.policy.initialEvent.visibility = "public";
      if (kind === "notifications-pending") f.policy.notifications.approval = "pending";
      if (kind === "measurements") f.policy.shipment.maxWeightKg = 1.0001;
      expect(await f.service.book(bookingInput())).toEqual({
        ok: false,
        code: "POLICY_UNAVAILABLE",
      });
      expectNoWrite(f);
      expect(f.repository.lookups).toHaveLength(0);
    });
});

describe("booking idempotency and persistence contract", () => {
  it("returns normalized retries without generating or submitting anything again", async () => {
    const f = fixture();
    const first = await f.service.book(bookingInput());
    if (!first.ok) throw new Error("Expected successful booking");
    const input = bookingInput();
    const result = await f.service.book(
      Object.fromEntries(
        Object.entries({
          ...input,
          shipment: {
            ...shipmentInput(),
            pickupAddress: " Synthetic pickup address ",
            parcelCount: 1,
            weightKg: 1.5,
            volumeM3: 0.125,
          },
          quotation: {
            ...input.quotation,
            snapshot: {
              ...input.quotation.snapshot,
              amount: "12.5",
              capturedAt: "2026-01-01T06:00:00+06:00",
            },
          },
        }).reverse(),
      ),
    );
    expect(result).toEqual({ ...first, replayed: true });
    expect(f.repository.bookings).toHaveLength(1);
    expect(f.repository.commands).toHaveLength(1);
    expect(f.state.generated).toBe(1);
    expect(f.state.trackingGenerated).toBe(1);
  });

  for (const changed of [
    "shipment",
    "listing",
    "request",
    "provider",
    "quote-id",
    "quote-version",
    "snapshot",
  ] as const)
    it(`distinguishes conflicting ${changed} under the same receipt scope`, async () => {
      const f = fixture();
      expect((await f.service.book(bookingInput())).ok).toBe(true);
      const input = bookingInput();
      const context = authorizedContext();
      if (changed === "shipment") input.shipment.handlingNotes = "Different private note";
      if (changed === "listing") {
        input.listingId = "other-listing";
        context.listing.id = input.listingId;
      }
      if (changed === "request") {
        input.requestId = "other-request";
        context.requestId = input.requestId;
      }
      if (changed === "provider") {
        context.provider.id = "other-provider";
        context.listing.providerId = context.provider.id;
      }
      if (changed === "quote-id") {
        input.quotation.id = "other-quote";
        input.quotation.snapshot = createLogisticsQuoteSnapshot({
          ...calculation(),
          sourceQuoteId: input.quotation.id,
        });
        context.quotation = {
          id: input.quotation.id,
          version: input.quotation.version,
          calculation: { ...calculation(), sourceQuoteId: input.quotation.id },
        };
      }
      if (changed === "quote-version") {
        input.quotation.version = "other-version";
        context.quotation = {
          id: input.quotation.id,
          version: input.quotation.version,
          calculation: calculation(),
        };
      }
      if (changed === "snapshot") {
        input.quotation.snapshot = createLogisticsQuoteSnapshot({
          ...calculation(),
          amount: "13.50",
        });
        context.quotation = {
          id: input.quotation.id,
          version: input.quotation.version,
          calculation: { ...calculation(), amount: "13.50" },
        };
      }
      f.state.context = context;
      expect(await f.service.book(input)).toEqual({ ok: false, code: "IDEMPOTENCY_CONFLICT" });
      expect(f.repository.bookings).toHaveLength(1);
      expect(f.repository.commands).toHaveLength(1);
      expect(f.state.generated).toBe(1);
    });

  for (const scope of ["customer", "operation", "key"] as const)
    it(`separates receipt ${scope} scope`, async () => {
      const f = fixture();
      expect((await f.service.book(bookingInput())).ok).toBe(true);
      const input = bookingInput();
      if (scope === "customer") {
        f.state.customer = { customerId: "other-customer" };
        f.state.context = { ...authorizedContext(), customerId: "other-customer" };
      }
      if (scope === "operation") f.policy.fingerprint.operation = "synthetic.other-booking";
      if (scope === "key") input.idempotencyKey = "synthetic-booking-key-0002";
      expect((await f.service.book(input)).ok).toBe(true);
      expect(f.repository.bookings).toHaveLength(2);
    });

  for (const conflict of [false, true])
    it(`handles an atomic existing receipt after a stale pre-read, conflict=${conflict}`, async () => {
      const f = fixture();
      const first = await f.service.book(bookingInput());
      if (!first.ok) throw new Error("Expected successful booking");
      f.repository.hideReceipts = true;
      const input = bookingInput();
      if (conflict) input.shipment.handlingNotes = "Changed";
      const result = await f.service.book(input);
      expect(result).toEqual(
        conflict ? { ok: false, code: "IDEMPOTENCY_CONFLICT" } : { ...first, replayed: true },
      );
      expect(f.repository.bookings).toHaveLength(1);
      expect(f.repository.commands).toHaveLength(2);
      expect(firstBooking(f.repository).notificationIntents).toHaveLength(2);
    });

  for (const location of ["lookup", "atomic-existing"] as const)
    it(`rejects a foreign customer receipt from ${location}`, async () => {
      const f = fixture();
      await f.service.book(bookingInput());
      const foreign = structuredClone(firstBooking(f.repository).receipt);
      foreign.scope.customerId = "other-customer";
      if (location === "lookup") f.repository.lookupOverride = foreign;
      else {
        f.repository.hideReceipts = true;
        f.repository.commitOverride = { kind: "existing", receipt: foreign };
      }
      expect(await f.service.book(bookingInput())).toEqual({
        ok: false,
        code: "BOOKING_UNAVAILABLE",
      });
    });

  it("rejects a created receipt that does not identify the submitted shipment", async () => {
    const f = fixture();
    await f.service.book(bookingInput());
    const receipt = structuredClone(firstBooking(f.repository).receipt);
    receipt.result.shipmentId = "different-shipment";
    f.repository.bookings = [];
    f.repository.commitOverride = { kind: "created", receipt };
    expect(await f.service.book(bookingInput())).toEqual({
      ok: false,
      code: "BOOKING_UNAVAILABLE",
    });
  });

  for (const part of [
    "shipment",
    "privateDetails",
    "initialEvent",
    "receipt",
    "notificationIntents",
  ] as const)
    it(`publishes no bundle when synthetic staging fails at ${part}`, async () => {
      const f = fixture();
      f.repository.failAt = part;
      expect(await f.service.book(bookingInput())).toEqual({
        ok: false,
        code: "BOOKING_UNAVAILABLE",
      });
      expect(f.repository.commands).toHaveLength(1);
      expect(f.repository.bookings).toHaveLength(0);
    });

  it("recovers with the same key after synthetic persistence fails before commit", async () => {
    const f = fixture();
    const input = bookingInput();
    f.repository.failAt = "notificationIntents";
    expect(await f.service.book(input)).toEqual({
      ok: false,
      code: "BOOKING_UNAVAILABLE",
    });
    expect(f.repository.bookings).toHaveLength(0);

    f.repository.failAt = null;
    const recovered = await f.service.book(input);
    if (!recovered.ok) throw new Error("Expected recovered booking");
    expect(recovered.replayed).toBe(false);
    expect(recovered.booking.shipmentId).toBe("synthetic-shipment-2");
    expect(f.repository.bookings).toHaveLength(1);
    const saved = firstBooking(f.repository);
    expect(saved.receipt.scope.key).toBe(input.idempotencyKey);
    expect(saved.receipt.result).toEqual(recovered.booking);
    expect(saved.privateDetails.shipmentId).toBe(recovered.booking.shipmentId);
    expect(saved.initialEvent.shipmentId).toBe(recovered.booking.shipmentId);
    expect(saved.notificationIntents).toHaveLength(2);
    for (const intent of saved.notificationIntents)
      expect(intent.shipmentId).toBe(recovered.booking.shipmentId);

    expect(await f.service.book(input)).toEqual({ ...recovered, replayed: true });
    expect(f.repository.commands).toHaveLength(2);
    expect(f.repository.bookings).toHaveLength(1);
    expect(f.state.generated).toBe(2);
    expect(f.state.trackingGenerated).toBe(2);
  });

  it("recovers the original receipt after a synthetic commit with a lost response", async () => {
    const f = fixture();
    f.repository.throwAfterCommit = true;
    expect(await f.service.book(bookingInput())).toEqual({
      ok: false,
      code: "BOOKING_UNAVAILABLE",
    });
    const result = await f.service.book(bookingInput());
    expect(result.ok && result.replayed).toBe(true);
    expect(f.repository.bookings).toHaveLength(1);
    expect(f.repository.commands).toHaveLength(1);
  });

  it("rejects context changed between authorization and atomic persistence", async () => {
    const f = fixture();
    f.repository.currentContextRevision = "different-context-version";
    expect(await f.service.book(bookingInput())).toEqual({
      ok: false,
      code: "BOOKING_NOT_ALLOWED",
    });
    expect(f.repository.bookings).toHaveLength(0);
  });

  for (const collision of ["shipment", "tracking"] as const)
    it(`fails safely on a synthetic ${collision} collision`, async () => {
      const f = fixture();
      await f.service.book(bookingInput());
      const saved = firstBooking(f.repository);
      if (collision === "shipment") f.state.shipmentIdOverride = saved.shipment.id;
      else f.state.trackingOverride = saved.shipment.trackingReference;
      expect(
        await f.service.book({ ...bookingInput(), idempotencyKey: "synthetic-booking-key-0002" }),
      ).toEqual({ ok: false, code: "BOOKING_UNAVAILABLE" });
      expect(f.repository.bookings).toHaveLength(1);
    });
});

describe("booking privacy and dependency failures", () => {
  for (const failure of ["identity", "context", "generation", "clock", "lookup"] as const)
    it(`does not expose ${failure} exception details`, async () => {
      const f = fixture();
      if (failure === "lookup") f.repository.failLookup = true;
      else f.state.failure = failure;
      const result = await f.service.book(bookingInput());
      expect(result).toEqual({ ok: false, code: "BOOKING_UNAVAILABLE" });
      expect(JSON.stringify(result)).not.toContain(privateMarker);
      expectNoWrite(f);
    });

  for (const invalid of ["shipment-id", "tracking-reference", "clock"] as const)
    it(`rejects invalid injected ${invalid}`, async () => {
      const f = fixture();
      if (invalid === "shipment-id") f.state.shipmentIdOverride = "invalid id";
      if (invalid === "tracking-reference") f.state.trackingOverride = "short";
      if (invalid === "clock") f.state.now = "invalid date";
      expect(await f.service.book(bookingInput())).toEqual({
        ok: false,
        code: "BOOKING_UNAVAILABLE",
      });
      expectNoWrite(f);
    });

  it("acknowledges only safe fields and keeps private details outside shipment/event/intents", async () => {
    const f = fixture();
    const result = await f.service.book(bookingInput());
    if (!result.ok) throw new Error("Expected successful booking");
    expect(Object.keys(result.booking).sort()).toEqual([
      "createdAt",
      "shipmentId",
      "status",
      "trackingReference",
    ]);
    const saved = firstBooking(f.repository);
    for (const projection of [
      result,
      saved.shipment,
      saved.initialEvent,
      saved.notificationIntents,
    ]) {
      const text = JSON.stringify(projection);
      for (const secret of [
        privateMarker,
        "+999000001",
        "+999000002",
        "Synthetic pickup address",
        "Synthetic destination address",
        "Private synthetic handling notes",
      ])
        expect(text).not.toContain(secret);
    }
    expect(saved.receipt.canonicalEnvelope).toContain(privateMarker);
    expect(JSON.stringify(result)).not.toContain("synthetic-customer");
    expect(JSON.stringify(result)).not.toContain("synthetic-provider");
  });

  it("does not authorize replay from a tracking reference without the current customer", async () => {
    const f = fixture();
    const result = await f.service.book(bookingInput());
    f.state.customer = null;
    expect(await f.service.book(bookingInput())).toEqual({ ok: false, code: "UNAUTHENTICATED" });
    if (!result.ok) throw new Error("Expected successful booking");
    expect((await f.service.book({ trackingReference: result.booking.trackingReference })).ok).toBe(
      false,
    );
    expect(f.repository.bookings).toHaveLength(1);
  });

  it("does not mutate input or retain mutable request/result aliases", async () => {
    const f = fixture();
    const input = bookingInput();
    const original = structuredClone(input);
    const result = await f.service.book(input);
    expect(input).toEqual(original);
    input.shipment.sender.name = "Changed after submission";
    expect(firstBooking(f.repository).privateDetails.details.sender.name).toBe(privateMarker);
    if (!result.ok) throw new Error("Expected successful booking");
    result.booking.status = "Changed acknowledgement";
    const replay = await f.service.book(original);
    expect(replay.ok && replay.booking.status).toBe("syntheticInitial");
  });

  it("captures request and policy before awaiting server identity", async () => {
    const f = fixture();
    let resolveIdentity: ((customer: { customerId: string }) => void) | undefined;
    f.dependencies.identity.getCustomer = () =>
      new Promise((resolve) => {
        resolveIdentity = resolve;
      });
    const input = bookingInput();
    const pending = f.service.book(input);
    input.shipment.sender.name = "Mutated during identity lookup";
    input.quotation.snapshot = createLogisticsQuoteSnapshot({ ...calculation(), amount: "99.00" });
    f.policy.initialEvent.integrity.initialStatus = "syntheticNext";
    f.policy.notifications.intents = [];
    if (!resolveIdentity) throw new Error("Expected identity lookup");
    resolveIdentity({ customerId: "synthetic-customer" });
    expect((await pending).ok).toBe(true);
    const saved = firstBooking(f.repository);
    expect(saved.privateDetails.details.sender.name).toBe(privateMarker);
    expect(saved.shipment.quoteSnapshot?.amount).toBe("12.50");
    expect(saved.shipment.status).toBe("syntheticInitial");
    expect(saved.notificationIntents).toHaveLength(2);
  });
});
