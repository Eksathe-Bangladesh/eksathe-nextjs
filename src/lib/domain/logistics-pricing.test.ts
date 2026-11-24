import { describe, expect, it } from "bun:test";

import {
  validateBdtMoney,
  addBdtMoney,
  compareBdtMoney,
  formatBdtMoney,
  createLogisticsQuoteSnapshot,
  validateLogisticsQuoteSnapshot,
  LOGISTICS_QUOTE_SNAPSHOT_VERSION,
  type TrustedLogisticsQuoteCalculation,
} from "./logistics-pricing";

const bdt = (amount: string) => ({ amount, currency: "BDT" as const });

describe("BDT monetary contract", () => {
  it("accepts and normalizes exact BDT decimal strings", () => {
    for (const [input, expected] of [
      ["0", "0.00"],
      ["0.1", "0.10"],
      [" 12.50 ", "12.50"],
      ["9999999999.99", "9999999999.99"],
    ])
      expect(validateBdtMoney(bdt(input))).toEqual(bdt(expected));
  });
  for (const currency of ["USD", "EUR", "INR", "bdt", "৳", "", undefined]) {
    it(`rejects unsupported currency ${String(currency)}`, () =>
      expect(() => validateBdtMoney({ amount: "1", currency })).toThrow(
        "Invalid BDT monetary amount",
      ));
  }
  for (const [label, amount] of [
    ["number", 1],
    ["float", 0.1 + 0.2],
    ["negative", "-1"],
    ["negative zero", "-0.00"],
    ["empty", ""],
    ["whitespace", " "],
    ["null", null],
    ["missing", undefined],
    ["nonfinite", Infinity],
    ["nan", NaN],
    ["exponent", "1e2"],
    ["grouped", "1,000"],
    ["leading zero", "01.00"],
    ["precision", "1.001"],
    ["excess zeros", "1.000"],
    ["overflow", "10000000000"],
    ["plus", "+1"],
    ["symbol", "৳1"],
    ["partial decimal", ".50"],
    ["trailing dot", "1."],
  ] as const)
    it(`rejects ${label}`, () =>
      expect(() => validateBdtMoney({ amount, currency: "BDT" })).toThrow());
  it("rejects extra properties and returns immutable independent values", () => {
    expect(() => validateBdtMoney({ ...bdt("1"), trusted: true })).toThrow();
    const source = bdt("1");
    const money = validateBdtMoney(source);
    source.amount = "2";
    expect(money.amount).toBe("1.00");
    expect(Object.isFrozen(money)).toBe(true);
  });
  it("adds decimal values exactly", () => {
    expect(addBdtMoney(bdt("0.1"), bdt("0.2"))).toEqual(bdt("0.30"));
    expect(addBdtMoney(bdt("9999999999.98"), bdt("0.01"))).toEqual(bdt("9999999999.99"));
    expect(addBdtMoney(bdt("99.99"), bdt("0.01"))).toEqual(bdt("100.00"));
    let total = bdt("0");
    for (let i = 0; i < 100; i++) total = addBdtMoney(total, bdt("0.01"));
    expect(total).toEqual(bdt("1.00"));
  });
  it("rejects arithmetic overflow and foreign-currency operands", () => {
    expect(() => addBdtMoney(bdt("9999999999.99"), bdt("0.01"))).toThrow();
    expect(() => addBdtMoney(bdt("1"), { amount: "1", currency: "USD" })).toThrow();
    expect(() => compareBdtMoney(bdt("1"), { amount: "1", currency: "USD" })).toThrow();
  });
  it("compares exact monetary values instead of lexical strings", () => {
    expect(compareBdtMoney(bdt("2"), bdt("10"))).toBe(-1);
    expect(compareBdtMoney(bdt("1.0"), bdt("1.00"))).toBe(0);
    expect(compareBdtMoney(bdt("9999999999.99"), bdt("9999999999.98"))).toBe(1);
  });
  it("displays Taka with exact English and Bangla amounts", () => {
    expect(formatBdtMoney(bdt("0"))).toBe("৳0.00");
    expect(formatBdtMoney(bdt("1234567.89"))).toBe("৳12,34,567.89");
    expect(formatBdtMoney(bdt("1234567.89"), "bn")).toBe("৳১২,৩৪,৫৬৭.৮৯");
    expect(formatBdtMoney(bdt("9999999999.99"))).toBe("৳9,99,99,99,999.99");
    expect(() => formatBdtMoney(bdt("1"), "unsupported" as never)).toThrow();
  });
});

describe("versioned Logistics quote snapshots", () => {
  const trusted: TrustedLogisticsQuoteCalculation = {
    sourceQuoteId: "synthetic-quote",
    amount: "12.50",
    currency: "BDT",
    calculationBasis: "Synthetic flat charge including known fees",
    calculationVersion: "synthetic-pricing-v1",
    classification: "ESTIMATE",
    quoteStatus: "PENDING",
    capturedAt: "2026-01-01T06:00:00+06:00",
  };
  it("creates a canonical BDT snapshot from trusted calculation facts", () => {
    expect(createLogisticsQuoteSnapshot(trusted)).toEqual({
      ...trusted,
      snapshotVersion: LOGISTICS_QUOTE_SNAPSHOT_VERSION,
      capturedAt: "2026-01-01T00:00:00.000Z",
    });
  });
  it("supports optional source Quote and fixed classification", () => {
    const snapshot = createLogisticsQuoteSnapshot({
      ...trusted,
      sourceQuoteId: null,
      classification: "FIXED",
    });
    expect(snapshot.sourceQuoteId).toBeNull();
    expect(snapshot.classification).toBe("FIXED");
  });
  it("accepts equivalent decimal and timestamp representations", () => {
    const snapshot = {
      ...createLogisticsQuoteSnapshot(trusted),
      amount: "12.5",
      capturedAt: trusted.capturedAt,
    };
    expect(validateLogisticsQuoteSnapshot(snapshot, trusted)).toEqual(
      createLogisticsQuoteSnapshot(trusted),
    );
  });
  for (const [label, change] of [
    ["amount", { amount: "0.01" }],
    ["currency", { currency: "USD" }],
    ["source", { sourceQuoteId: "other" }],
    ["classification", { classification: "FIXED" }],
    ["status", { quoteStatus: "ACCEPTED" }],
    ["capture time", { capturedAt: "2026-01-02T00:00:00Z" }],
    ["basis", { calculationBasis: "Different" }],
    ["pricing version", { calculationVersion: "other" }],
    ["snapshot version", { snapshotVersion: "unknown" }],
    ["extra field", { actorId: "injected" }],
  ] as const)
    it(`rejects tampered ${label}`, () =>
      expect(() =>
        validateLogisticsQuoteSnapshot(
          { ...createLogisticsQuoteSnapshot(trusted), ...change },
          trusted,
        ),
      ).toThrow());
  it("rejects missing and invalid trusted calculations", () => {
    for (const change of [
      { currency: "USD" },
      { amount: "1.001" },
      { amount: "-1" },
      { calculationVersion: "" },
      { calculationBasis: " " },
      { classification: "UNKNOWN" },
      { quoteStatus: "UNKNOWN" },
      { capturedAt: "2026-02-30T00:00:00Z" },
      { capturedAt: "2026-01-01" },
      { sourceQuoteId: undefined },
    ])
      expect(() => createLogisticsQuoteSnapshot({ ...trusted, ...change } as never)).toThrow(
        "Invalid trusted Logistics quote calculation",
      );
    expect(() =>
      validateLogisticsQuoteSnapshot(createLogisticsQuoteSnapshot(trusted), undefined as never),
    ).toThrow();
    expect(() => createLogisticsQuoteSnapshot({ ...trusted, trusted: true } as never)).toThrow();
  });
  it("rejects incomplete snapshots and keeps inputs unchanged", () => {
    const before = JSON.stringify(trusted);
    const snapshot = createLogisticsQuoteSnapshot(trusted);
    for (const key of Object.keys(snapshot)) {
      const incomplete = { ...snapshot } as Record<string, unknown>;
      delete incomplete[key];
      expect(() => validateLogisticsQuoteSnapshot(incomplete, trusted)).toThrow();
    }
    expect(JSON.stringify(trusted)).toBe(before);
    expect(Object.isFrozen(snapshot)).toBe(true);
  });
});
