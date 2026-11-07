import { describe, expect, test, mock } from "bun:test";
void mock.module("server-only", () => ({}));

const { priceSchema, supportSchema, updateSchema } = await import("@/lib/agriculture/publishing");

describe("agriculture publishing validation", () => {
  test("requires a source, unit, observation date, and decimal market price", () => {
    const valid = {
      productBn: "ধান",
      productEn: "Rice",
      market: "Town market",
      district: "Bogura",
      unit: "kg",
      price: "52.50",
      observedAt: "2026-11-02",
      source: "District market survey",
      status: "PUBLISHED",
    };
    expect(priceSchema.safeParse(valid).success).toBe(true);
    expect(priceSchema.safeParse({ ...valid, price: "52.555" }).success).toBe(false);
    expect(priceSchema.safeParse({ ...valid, price: "0" }).success).toBe(false);
    expect(priceSchema.safeParse({ ...valid, source: "" }).success).toBe(false);
  });

  test("requires weather alert expiry and rejects expiry before publication", () => {
    const base = {
      kind: "WEATHER_ALERT",
      titleBn: "সতর্কতা",
      titleEn: "Alert",
      bodyBn: "বিবরণ",
      bodyEn: "Details",
      source: "BMD",
      status: "PUBLISHED",
      publishedAt: "2026-11-01",
    };
    expect(updateSchema.safeParse(base).success).toBe(false);
    expect(updateSchema.safeParse({ ...base, expiresAt: "2026-11-03" }).success).toBe(true);
    expect(updateSchema.safeParse({ ...base, expiresAt: "2026-10-30" }).success).toBe(false);
  });

  test("validates configured support contacts while permitting removed fields", () => {
    expect(
      supportSchema.safeParse({ phone: "", email: "", messageBn: "", messageEn: "" }).success,
    ).toBe(true);
    expect(
      supportSchema.safeParse({ phone: "123", email: "not-an-email", messageBn: "", messageEn: "" })
        .success,
    ).toBe(false);
  });
});
