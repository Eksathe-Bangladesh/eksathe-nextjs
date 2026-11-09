import { describe, expect, mock, test } from "bun:test";

void mock.module("server-only", () => ({}));

const { parseAgricultureServiceAnswers, agricultureServiceRequestSchema } =
  await import("@/lib/validations/agriculture");
import { agricultureServiceRegistry } from "./service-registry";

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

  test("accepts every unchanged option value and keeps IDs out of saved snapshots", () => {
    for (const service of agricultureServiceRegistry) {
      const selectFields = service.fields.filter(
        (field): field is Extract<typeof field, { options: readonly unknown[] }> =>
          "options" in field,
      );
      for (const field of selectFields) {
        for (const selectedOption of field.options) {
          const form = new FormData();
          for (const candidate of selectFields) {
            form.set(
              `answer.${candidate.name}`,
              candidate === field ? selectedOption.value : candidate.options[0].value,
            );
          }
          const result = parseAgricultureServiceAnswers(service.slug, form);
          expect(result.errors, `${service.slug}.${field.name}`).toEqual({});
          expect(result.values[field.name]).toBe(selectedOption.value);

          const snapshot = result.snapshot as {
            formVersion: number;
            fields: Array<{ name: string; options: Array<Record<string, unknown>> }>;
          };
          expect(snapshot.formVersion).toBe(service.formVersion);
          const savedField = snapshot.fields.find((item) => item.name === field.name)!;
          expect(savedField.options.map((option) => Object.keys(option).sort())).toEqual(
            field.options.map(() => ["labelBn", "labelEn", "value"]),
          );
          expect(
            savedField.options.find((option) => option.value === selectedOption.value),
          ).toBeDefined();
        }
      }
    }
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
