import { z } from "zod";

export const LOGISTICS_CURRENCY = "BDT" as const;
export const LOGISTICS_CURRENCY_SYMBOL = "৳" as const;
export const LOGISTICS_QUOTE_SNAPSHOT_VERSION = "logistics-quote-v1" as const;

// Compatible with shared Decimal(12,2). Never coerce JS numbers into money.
// Canonicalization pads decimals only; excess precision (even zeros) is rejected.
const amountSchema = z
  .string()
  .trim()
  .regex(/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/)
  .transform((value) => {
    const [whole, fraction = ""] = value.split(".");
    return `${whole}.${fraction.padEnd(2, "0")}`;
  });
const moneySchema = z.strictObject({
  amount: amountSchema,
  currency: z.literal(LOGISTICS_CURRENCY),
});
export type BdtMoney = Readonly<z.output<typeof moneySchema>>;

export function validateBdtMoney(input: unknown): BdtMoney {
  const parsed = moneySchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid BDT monetary amount");
  return Object.freeze(parsed.data);
}

function poisha(money: BdtMoney): bigint {
  return BigInt(money.amount.replace(".", ""));
}

export function addBdtMoney(left: unknown, right: unknown): BdtMoney {
  const total = poisha(validateBdtMoney(left)) + poisha(validateBdtMoney(right));
  const digits = total.toString().padStart(3, "0");
  // Revalidation rejects sums outside Decimal(12,2), never truncates/clamps.
  return validateBdtMoney({
    amount: `${digits.slice(0, -2)}.${digits.slice(-2)}`,
    currency: LOGISTICS_CURRENCY,
  });
}

export function compareBdtMoney(left: unknown, right: unknown): -1 | 0 | 1 {
  const a = poisha(validateBdtMoney(left));
  const b = poisha(validateBdtMoney(right));
  return a < b ? -1 : a > b ? 1 : 0;
}

// String-only display with Bangladesh digit grouping; no numeric conversion.
export function formatBdtMoney(input: unknown, locale: "en" | "bn" = "en"): string {
  if (locale !== "en" && locale !== "bn") throw new Error("Unsupported BDT display locale");
  const [whole, fraction] = validateBdtMoney(input).amount.split(".");
  const grouped =
    whole.length <= 3
      ? whole
      : `${whole.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${whole.slice(-3)}`;
  const display = `${LOGISTICS_CURRENCY_SYMBOL}${grouped}.${fraction}`;
  return locale === "bn"
    ? display.replace(/\d/g, (digit) => "০১২৩৪৫৬৭৮৯"["0123456789".indexOf(digit)])
    : display;
}

const identifier = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9][A-Za-z0-9_.:-]*$/);
const calculationSchema = z.strictObject({
  sourceQuoteId: identifier.nullable(),
  amount: amountSchema,
  currency: z.literal(LOGISTICS_CURRENCY),
  calculationBasis: z.string().trim().min(1).max(1000),
  calculationVersion: identifier,
  classification: z.enum(["ESTIMATE", "FIXED"]),
  // Mirrors existing QuoteStatus without importing Prisma or changing its model.
  quoteStatus: z.enum(["PENDING", "ACCEPTED", "REJECTED", "EXPIRED"]),
  capturedAt: z.iso.datetime({ offset: true }).transform((value) => new Date(value).toISOString()),
});
const snapshotSchema = calculationSchema.extend({
  snapshotVersion: z.literal(LOGISTICS_QUOTE_SNAPSHOT_VERSION),
});

export type TrustedLogisticsQuoteCalculation = z.input<typeof calculationSchema>;
export type LogisticsQuoteSnapshot = Readonly<z.output<typeof snapshotSchema>>;

// Trust is a server-adapter responsibility, not a client-supplied flag. Supply
// authenticated/authorized Quote data or a server pricing result and a server
// timestamp. Never pass a request-body snapshot as this argument. This pure
// module cannot establish provenance, approval, quote ownership or expiry.
export function createLogisticsQuoteSnapshot(
  trustedCalculation: TrustedLogisticsQuoteCalculation,
): LogisticsQuoteSnapshot {
  const parsed = calculationSchema.safeParse(trustedCalculation);
  if (!parsed.success) throw new Error("Invalid trusted Logistics quote calculation");
  return Object.freeze({ snapshotVersion: LOGISTICS_QUOTE_SNAPSHOT_VERSION, ...parsed.data });
}

// Shape validation alone is insufficient: compare every field with independently
// obtained trusted facts. Useful for validating retrieved snapshots, not granting
// a client authority to set prices. Returns a fresh server-built snapshot.
export function validateLogisticsQuoteSnapshot(
  input: unknown,
  trustedCalculation: TrustedLogisticsQuoteCalculation,
): LogisticsQuoteSnapshot {
  const expected = createLogisticsQuoteSnapshot(trustedCalculation);
  const parsed = snapshotSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid Logistics quote snapshot");
  for (const key of Object.keys(expected) as (keyof LogisticsQuoteSnapshot)[]) {
    if (parsed.data[key] !== expected[key])
      throw new Error("Logistics quote snapshot does not match trusted calculation");
  }
  return expected;
}
