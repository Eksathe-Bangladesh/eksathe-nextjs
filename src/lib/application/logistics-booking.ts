import { z } from "zod";

import { createShipmentInputSchema, shipmentIdempotencyKeySchema } from "../domain/logistics";
import {
  canonicalizeBookingFingerprint,
  validateShipmentActor,
  validateShipmentEventAppend,
} from "../domain/logistics-contracts";
import { validateLogisticsQuoteSnapshot } from "../domain/logistics-pricing";
import type {
  AtomicLogisticsBookingCommand,
  BookingContextRequest,
  BookingReceiptScope,
  LogisticsBookingDependencies,
  LogisticsBookingErrorCode,
  LogisticsBookingResult,
  LogisticsBookingSummary,
} from "./logistics-booking-contracts";

// Server application core, deliberately not wired to a route or Server Action.
// Composition must supply request-bound identity and trusted policy/adapters.
// No database, authentication implementation, clock, randomness or notification
// transport is selected here. In particular, there are no lifecycle defaults.
export const LOGISTICS_BOOKING_ENVELOPE_VERSION = "logistics-booking-envelope-v1";

const identifier = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9][A-Za-z0-9_.:-]*$/);
const trackingReference = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{21,127}$/);
const timestamp = z.iso
  .datetime({ offset: true })
  .transform((value) => new Date(value).toISOString());
const quoteReference = z.strictObject({ id: identifier, version: identifier });
const inputSchema = z.strictObject({
  idempotencyKey: shipmentIdempotencyKeySchema,
  listingId: identifier,
  requestId: identifier.nullable(),
  quotation: quoteReference.extend({ snapshot: z.unknown() }).nullable(),
  shipment: z.unknown(),
});
const identitySchema = z.strictObject({ customerId: identifier });
const contextSchema = z.strictObject({
  customerId: identifier,
  listing: z.strictObject({ id: identifier, providerId: identifier }),
  provider: z.strictObject({ id: identifier }),
  requestId: identifier.nullable(),
  quotation: quoteReference.extend({ calculation: z.unknown() }).nullable(),
  revision: identifier,
});
const visibility = z.enum(["public", "customer", "provider", "internal"]);
const policySchema = z.strictObject({
  fingerprint: z.strictObject({
    payloadContractVersion: identifier,
    operation: identifier,
    requestMode: z.enum(["new", "existing"]),
    quotationMode: z.enum(["required", "absent"]),
  }),
  shipment: z.strictObject({
    maxParcelCount: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    maxWeightKg: z.number().positive(),
    maxVolumeM3: z.number().positive(),
    phonePattern: z.instanceof(RegExp),
    districts: z.array(z.string().min(1)).min(1),
    parcelCategories: z.array(z.string().min(1)).min(1),
  }),
  initialEvent: z.strictObject({
    integrity: z.strictObject({
      lifecycle: z.strictObject({
        approval: z.literal("approved"),
        transitions: z.record(identifier, z.array(identifier)),
      }),
      initialStatus: identifier,
      allowedVisibilities: z.array(visibility).min(1),
      allowUnchangedStatusEvents: z.boolean(),
    }),
    visibility,
  }),
  notifications: z.strictObject({
    approval: z.literal("approved"),
    version: identifier,
    // An explicitly empty list is allowed; missing policy is not.
    intents: z.array(
      z.strictObject({ audience: z.enum(["customer", "provider"]), templateKey: identifier }),
    ),
  }),
});
const summarySchema = z.strictObject({
  shipmentId: identifier,
  trackingReference,
  status: identifier,
  createdAt: timestamp,
});
const receiptSchema = z.strictObject({
  scope: z.strictObject({
    customerId: identifier,
    operation: identifier,
    key: shipmentIdempotencyKeySchema,
  }),
  canonicalEnvelope: z.string().min(1),
  result: summarySchema,
});
const commitResultSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("created"), receipt: receiptSchema }),
  z.strictObject({ kind: z.literal("existing"), receipt: receiptSchema }),
  z.strictObject({ kind: z.literal("tracking-collision") }),
  z.strictObject({ kind: z.literal("shipment-id-collision") }),
  z.strictObject({ kind: z.literal("context-changed") }),
]);

class BookingFailure extends Error {
  constructor(readonly code: LogisticsBookingErrorCode) {
    super(code);
  }
}

function fail(code: LogisticsBookingErrorCode): never {
  throw new BookingFailure(code);
}

function sameQuote(
  left: { id: string; version: string } | null,
  right: { id: string; version: string } | null,
) {
  return left === null || right === null
    ? left === right
    : left.id === right.id && left.version === right.version;
}

function receiptResult(
  receipt: unknown,
  scope: BookingReceiptScope,
  canonicalEnvelope: string,
  replayed: boolean,
  expected?: LogisticsBookingSummary,
): LogisticsBookingResult {
  const parsed = receiptSchema.safeParse(receipt);
  if (!parsed.success) fail("BOOKING_UNAVAILABLE");
  const stored = parsed.data;
  if (
    stored.scope.customerId !== scope.customerId ||
    stored.scope.operation !== scope.operation ||
    stored.scope.key !== scope.key
  )
    fail("BOOKING_UNAVAILABLE");
  if (stored.canonicalEnvelope !== canonicalEnvelope) fail("IDEMPOTENCY_CONFLICT");
  const result = stored.result;
  if (
    expected &&
    (result.shipmentId !== expected.shipmentId ||
      result.trackingReference !== expected.trackingReference ||
      result.status !== expected.status ||
      result.createdAt !== expected.createdAt)
  )
    fail("BOOKING_UNAVAILABLE");
  // Explicit allowlist, independent of repository objects and private records.
  return {
    ok: true,
    replayed,
    booking: {
      shipmentId: result.shipmentId,
      trackingReference: result.trackingReference,
      status: result.status,
      createdAt: result.createdAt,
    },
  };
}

export function createLogisticsBookingService(dependencies: LogisticsBookingDependencies) {
  return {
    async book(input: unknown): Promise<LogisticsBookingResult> {
      try {
        const configuration = policySchema.safeParse(dependencies.policy);
        if (!configuration.success) fail("POLICY_UNAVAILABLE");
        const policy = configuration.data;
        // Validate all required policy before invoking adapters. Clone the regexp
        // as well as the parsed policy to prevent async caller mutation.
        policy.shipment.phonePattern = new RegExp(policy.shipment.phonePattern);
        let shipmentSchema;
        try {
          shipmentSchema = createShipmentInputSchema(policy.shipment);
          validateShipmentEventAppend(
            {
              shipmentId: "policy-validation",
              sequence: 1,
              previousStatus: null,
              resultingStatus: policy.initialEvent.integrity.initialStatus,
              visibility: policy.initialEvent.visibility,
            },
            null,
            policy.initialEvent.integrity,
          );
          const notificationKeys = policy.notifications.intents.map(
            (intent) => `${intent.audience}:${intent.templateKey}`,
          );
          if (new Set(notificationKeys).size !== notificationKeys.length)
            fail("POLICY_UNAVAILABLE");
        } catch {
          fail("POLICY_UNAVAILABLE");
        }

        const parsed = inputSchema.safeParse(input);
        if (!parsed.success) fail("INVALID_INPUT");
        // Unknown nested payloads must be copied before the first await as Zod's
        // unknown schema does not clone them. The shipment validator runs below.
        const request = structuredClone(parsed.data);
        if (
          (policy.fingerprint.requestMode === "existing") !== (request.requestId !== null) ||
          (policy.fingerprint.quotationMode === "required") !== (request.quotation !== null)
        )
          fail("INVALID_INPUT");
        const customer = identitySchema.safeParse(await dependencies.identity.getCustomer());
        if (!customer.success) fail("UNAUTHENTICATED");
        const customerId = customer.data.customerId;
        const actor = validateShipmentActor(
          { kind: "USER", userId: customerId },
          { kind: "USER", authenticatedUserId: customerId },
        );
        if (actor.kind !== "USER") fail("UNAUTHENTICATED");
        const quotation =
          request.quotation === null
            ? null
            : {
                id: request.quotation.id,
                version: request.quotation.version,
              };
        const contextRequest: BookingContextRequest = {
          customerId,
          listingId: request.listingId,
          requestId: request.requestId,
          quotation,
        };
        const authorized = await dependencies.contexts.authorize(structuredClone(contextRequest));
        const context = contextSchema.safeParse(authorized);
        if (!context.success || !authorized) fail("BOOKING_NOT_ALLOWED");
        const facts = context.data;
        if (
          facts.customerId !== customerId ||
          facts.listing.id !== request.listingId ||
          facts.listing.providerId !== facts.provider.id ||
          facts.requestId !== request.requestId ||
          !sameQuote(facts.quotation, quotation)
        )
          fail("BOOKING_NOT_ALLOWED");
        const shipment = shipmentSchema.safeParse(request.shipment);
        if (!shipment.success) fail("INVALID_INPUT");
        let quoteSnapshot = null;
        if (request.quotation !== null) {
          if (authorized.quotation === null) fail("BOOKING_NOT_ALLOWED");
          try {
            quoteSnapshot = validateLogisticsQuoteSnapshot(
              request.quotation.snapshot,
              authorized.quotation.calculation,
            );
          } catch {
            fail("INVALID_QUOTE");
          }
          if (quoteSnapshot.sourceQuoteId !== null && quoteSnapshot.sourceQuoteId !== quotation?.id)
            fail("BOOKING_NOT_ALLOWED");
        }

        const canonicalBooking = canonicalizeBookingFingerprint(
          {
            payloadContractVersion: policy.fingerprint.payloadContractVersion,
            operation: policy.fingerprint.operation,
            listingId: request.listingId,
            requestId: request.requestId,
            quotation,
            shipment: shipment.data,
          },
          policy.fingerprint,
          policy.shipment,
        );
        // The original domain canonicalizer stays unchanged. This explicitly
        // versioned outer envelope also binds trusted ownership and every quote
        // snapshot field. Generated IDs, current time and context revision are
        // intentionally absent: they are not part of the customer's request.
        const canonicalEnvelope = JSON.stringify({
          version: LOGISTICS_BOOKING_ENVELOPE_VERSION,
          customerId,
          providerId: facts.provider.id,
          canonicalBooking,
          quoteSnapshot,
        });
        const scope: BookingReceiptScope = {
          customerId,
          operation: policy.fingerprint.operation,
          key: request.idempotencyKey,
        };
        const existing = await dependencies.repository.findReceipt({ ...scope });
        if (existing !== null) return receiptResult(existing, scope, canonicalEnvelope, true);

        const id = identifier.safeParse(await dependencies.identifiers.generateShipmentId());
        const reference = trackingReference.safeParse(
          await dependencies.identifiers.generateTrackingReference(),
        );
        const time = timestamp.safeParse(dependencies.clock.now());
        if (!id.success || !reference.success || !time.success) fail("BOOKING_UNAVAILABLE");
        const initialEvent = validateShipmentEventAppend(
          {
            shipmentId: id.data,
            sequence: 1,
            previousStatus: null,
            resultingStatus: policy.initialEvent.integrity.initialStatus,
            visibility: policy.initialEvent.visibility,
          },
          null,
          policy.initialEvent.integrity,
        );
        const result: LogisticsBookingSummary = {
          shipmentId: id.data,
          trackingReference: reference.data,
          status: initialEvent.resultingStatus,
          createdAt: time.data,
        };
        const command: AtomicLogisticsBookingCommand = {
          authorization: {
            ...contextRequest,
            providerId: facts.provider.id,
            revision: facts.revision,
          },
          booking: {
            shipment: {
              id: id.data,
              customerId,
              providerId: facts.provider.id,
              listingId: request.listingId,
              requestId: request.requestId,
              quotation,
              quoteSnapshot,
              trackingReference: reference.data,
              status: initialEvent.resultingStatus,
              version: 1,
              createdAt: time.data,
            },
            privateDetails: { shipmentId: id.data, details: shipment.data },
            initialEvent: {
              ...initialEvent,
              sequence: 1,
              previousStatus: null,
              actor,
              eventAt: time.data,
              recordedAt: time.data,
            },
            receipt: { scope, canonicalEnvelope, result },
            notificationIntents: policy.notifications.intents.map((intent) => ({
              shipmentId: id.data,
              eventSequence: 1,
              recipient: {
                kind: intent.audience,
                id: intent.audience === "customer" ? customerId : facts.provider.id,
              },
              templateKey: intent.templateKey,
              policyVersion: policy.notifications.version,
            })),
          },
        };
        // Adapters receive their own values, and cannot mutate comparison facts.
        const committed = commitResultSchema.safeParse(
          await dependencies.repository.commitBooking(structuredClone(command)),
        );
        if (!committed.success) fail("BOOKING_UNAVAILABLE");
        if (committed.data.kind === "context-changed") fail("BOOKING_NOT_ALLOWED");
        if (
          committed.data.kind === "tracking-collision" ||
          committed.data.kind === "shipment-id-collision"
        )
          fail("BOOKING_UNAVAILABLE");
        return receiptResult(
          committed.data.receipt,
          scope,
          canonicalEnvelope,
          committed.data.kind === "existing",
          committed.data.kind === "created" ? result : undefined,
        );
      } catch (error) {
        // Never return dependency errors, causes, validation issues, or payloads.
        // No logging of private input, canonical envelopes, or adapter failures.
        return {
          ok: false,
          code: error instanceof BookingFailure ? error.code : "BOOKING_UNAVAILABLE",
        };
      }
    },
  };
}
