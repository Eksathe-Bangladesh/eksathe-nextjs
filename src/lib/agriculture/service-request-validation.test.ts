import { describe, expect, mock, test } from "bun:test";

void mock.module("server-only", () => ({}));

const { parseAgricultureServiceAnswers, agricultureServiceRequestSchema } =
  await import("@/lib/validations/agriculture");

describe("agriculture request validation", () => {
  test("accepts numeric worker counts without using prototype digit limits as quantity limits", () => {
    const form = new FormData();
    form.set("answer.labour_count", "10000");
    const result = parseAgricultureServiceAnswers("farm-labour", form);
    expect(result.errors).toEqual({});
    expect(result.values.labour_count).toBe("10000");
  });

  test("validates count, date, and select fields by their declared type", () => {
    const count = new FormData();
    count.set("answer.labour_count", "2.5");
    expect(parseAgricultureServiceAnswers("farm-labour", count).errors.labour_count).toBeDefined();

    const date = new FormData();
    date.set("answer.machine_date", "not-a-date");
    expect(
      parseAgricultureServiceAnswers("farm-machinery", date).errors.machine_date,
    ).toBeDefined();

    const option = new FormData();
    option.set("answer.seed_kind", "anything");
    expect(
      parseAgricultureServiceAnswers("seeds-seedlings", option).errors.seed_kind,
    ).toBeDefined();
  });

  test("requires contact details and accepts an optional decimal budget", () => {
    expect(
      agricultureServiceRequestSchema.safeParse({
        serviceSlug: "crop-farming",
        customerName: "",
        phone: "",
        district: "",
        details: "short",
      }).success,
    ).toBe(false);
    expect(
      agricultureServiceRequestSchema.safeParse({
        serviceSlug: "crop-farming",
        customerName: "A farmer",
        phone: "01712345678",
        district: "Dhaka",
        details: "Need help planning my crop this season.",
        budget: "1500.50",
      }).success,
    ).toBe(true);
  });
});
