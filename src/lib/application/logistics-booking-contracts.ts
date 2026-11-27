import type { ShipmentInput, ShipmentInputPolicy } from "../domain/logistics";
import type {
  BookingFingerprintPolicy,
  ShipmentEventIntegrityPolicy,
} from "../domain/logistics-contracts";
import type {
  LogisticsQuoteSnapshot,
  TrustedLogisticsQuoteCalculation,
} from "../domain/logistics-pricing";

export type BookingQuoteReference = { id: string; version: string };

export type LogisticsBookingInput = {
  idempotencyKey: string;
  listingId: string;
  requestId: string | null;
  quotation: (BookingQuoteReference & { snapshot: unknown }) | null;
  shipment: unknown;
};

export type LogisticsBookingPolicy = {
  fingerprint: BookingFingerprintPolicy;
  shipment: ShipmentInputPolicy;
  initialEvent: {
    integrity: ShipmentEventIntegrityPolicy;
    visibility: "public" | "customer" | "provider" | "internal";
  };
  notifications: {
    approval: "approved" | "pending";
    version: string;
    intents: readonly { audience: "customer" | "provider"; templateKey: string }[];
  };
};

export type BookingContextRequest = {
  customerId: string;
  listingId: string;
  requestId: string | null;
  quotation: BookingQuoteReference | null;
};

export type AuthorizedBookingContext = {
  customerId: string;
  listing: { id: string; providerId: string };
  provider: { id: string };
  requestId: string | null;
  quotation: (BookingQuoteReference & { calculation: TrustedLogisticsQuoteCalculation }) | null;
  revision: string;
};

export interface LogisticsBookingIdentity {
  // Bind to the current server-authenticated request. Never read customer identity
  // from the booking body or reuse a request-bound service across customers.
  getCustomer(): Promise<{ customerId: string } | null>;
}

export interface LogisticsBookingContextGateway {
  // Load independent listing/provider/request/quote facts; enforce ownership,
  // Logistics listing eligibility and approved commercial/quote rules. Return
  // null if denied or if those policies are unavailable. No default confirmation
  // rule is supplied by this core. The revision must cover these authorized facts.
  authorize(request: BookingContextRequest): Promise<AuthorizedBookingContext | null>;
}

export interface SecureLogisticsBookingIdentifiers {
  generateShipmentId(): Promise<string>;
  // A server CSPRNG with at least 128 bits of entropy, no PII or sequential IDs.
  // Syntax checks cannot prove entropy. A reference is never an access credential.
  generateTrackingReference(): Promise<string>;
}

export type BookingReceiptScope = { customerId: string; operation: string; key: string };

// Safe booking acknowledgement only. It grants no subsequent tracking access.
export type LogisticsBookingSummary = {
  shipmentId: string;
  trackingReference: string;
  status: string;
  createdAt: string;
};

export type LogisticsBookingReceipt = {
  scope: BookingReceiptScope;
  // Contains normalized private shipment data. Restrict access/retention as PII;
  // never log, publish, or use an unkeyed hash as a privacy substitute.
  canonicalEnvelope: string;
  result: LogisticsBookingSummary;
};

export type InitialLogisticsShipment = {
  id: string;
  customerId: string;
  providerId: string;
  listingId: string;
  requestId: string | null;
  quotation: BookingQuoteReference | null;
  quoteSnapshot: LogisticsQuoteSnapshot | null;
  trackingReference: string;
  status: string;
  version: 1;
  createdAt: string;
};

export type PrivateLogisticsShipmentDetails = { shipmentId: string; details: ShipmentInput };

export type InitialLogisticsShipmentEvent = {
  shipmentId: string;
  sequence: 1;
  previousStatus: null;
  resultingStatus: string;
  visibility: "public" | "customer" | "provider" | "internal";
  actor: { kind: "USER"; userId: string };
  eventAt: string;
  recordedAt: string;
};

export type LogisticsNotificationIntent = {
  shipmentId: string;
  eventSequence: 1;
  recipient: { kind: "customer" | "provider"; id: string };
  templateKey: string;
  policyVersion: string;
};

export type AtomicLogisticsBooking = {
  shipment: InitialLogisticsShipment;
  privateDetails: PrivateLogisticsShipmentDetails;
  initialEvent: InitialLogisticsShipmentEvent;
  receipt: LogisticsBookingReceipt;
  notificationIntents: LogisticsNotificationIntent[];
};

export type AtomicLogisticsBookingCommand = {
  booking: AtomicLogisticsBooking;
  authorization: BookingContextRequest & { providerId: string; revision: string };
};

export type AtomicLogisticsBookingResult =
  | { kind: "created" | "existing"; receipt: LogisticsBookingReceipt }
  | { kind: "tracking-collision" | "shipment-id-collision" | "context-changed" };

export interface LogisticsBookingRepository {
  // Advisory read only. Scope MUST include authenticated customer + operation + key.
  findReceipt(scope: BookingReceiptScope): Promise<LogisticsBookingReceipt | null>;
  // Future adapter obligation: in one transaction, recheck authorized context,
  // enforce unique scope, shipment ID and tracking reference, and persist ALL five
  // parts or none. A raced scope returns its existing receipt without inserting
  // anything. Collision/context-changed outcomes must write nothing. Never send
  // notifications here; commit outbox intents with the booking. Consumers must
  // deduplicate intents by shipment/event/recipient/template/policy version.
  // An exception may mean an unknown commit outcome; retry the SAME key to recover.
  commitBooking(command: AtomicLogisticsBookingCommand): Promise<AtomicLogisticsBookingResult>;
}

export type LogisticsBookingDependencies = {
  identity: LogisticsBookingIdentity;
  contexts: LogisticsBookingContextGateway;
  repository: LogisticsBookingRepository;
  identifiers: SecureLogisticsBookingIdentifiers;
  clock: { now(): string };
  policy: LogisticsBookingPolicy | null;
};

export type LogisticsBookingErrorCode =
  | "INVALID_INPUT"
  | "UNAUTHENTICATED"
  | "BOOKING_NOT_ALLOWED"
  | "POLICY_UNAVAILABLE"
  | "INVALID_QUOTE"
  | "IDEMPOTENCY_CONFLICT"
  | "BOOKING_UNAVAILABLE";

export type LogisticsBookingResult =
  | { ok: true; replayed: boolean; booking: LogisticsBookingSummary }
  | { ok: false; code: LogisticsBookingErrorCode };
