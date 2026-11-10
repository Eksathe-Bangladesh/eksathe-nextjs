import { z } from "zod";

import { resolveCatalogPair } from "@/i18n/catalog";
import { fieldLabelKey, optionLabelKey, serviceTitleKey } from "@/lib/agriculture/service-messages";
import { agricultureServiceRegistry } from "@/lib/agriculture/service-registry";

const requiredText = (max: number) => z.string().trim().min(1).max(max);
const optionalMoney = z
  .string()
  .trim()
  .max(20)
  .refine((value) => value === "" || /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(value));

export const agricultureServiceRequestSchema = z.strictObject({
  serviceSlug: requiredText(80),
  customerName: requiredText(150),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+ ()-]{7,30}$/),
  district: requiredText(100),
  details: z.string().trim().min(10).max(5000),
  budget: optionalMoney.optional().default(""),
  diseasePhotoKey: z.string().trim().max(240).optional().default(""),
  diseasePhotoContentType: z.enum(["image/jpeg", "image/png", "image/webp"]).optional(),
  diseasePhotoSizeBytes: z
    .string()
    .regex(/^\d{1,8}$/)
    .optional(),
});

export type AgricultureServiceRequestBase = z.infer<typeof agricultureServiceRequestSchema>;

export function parseAgricultureServiceAnswers(
  serviceSlug: string,
  formData: FormData,
): {
  values: Record<string, string>;
  errors: Record<string, string[]>;
  snapshot: object;
} {
  const service = agricultureServiceRegistry.find((item) => item.slug === serviceSlug);
  if (!service) return { values: {}, errors: { serviceSlug: ["Unknown service"] }, snapshot: [] };

  const values: Record<string, string> = {};
  const errors: Record<string, string[]> = {};
  for (const field of service.fields) {
    if (field.type === "file") continue;
    const rawValue = formData.get(`answer.${field.name}`);
    const value = typeof rawValue === "string" ? rawValue.trim() : "";
    if (!value) {
      if (field.required) errors[field.name] = ["This field is required."];
      continue;
    }
    if (
      "maxLength" in field &&
      typeof field.maxLength === "number" &&
      value.length > field.maxLength
    ) {
      errors[field.name] = [`Use ${field.maxLength} characters or fewer.`];
      continue;
    }
    if (field.type === "date" && !z.iso.date().safeParse(value).success) {
      errors[field.name] = ["Enter a valid date."];
      continue;
    }
    if (field.type === "number") {
      const isAmount = field.name.endsWith("_amount");
      const validNumber = isAmount
        ? /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(value) && Number(value) > 0
        : /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) > 0;
      if (!validNumber) {
        errors[field.name] = [
          isAmount
            ? "Enter a positive amount with up to two decimals."
            : "Enter a positive whole number.",
        ];
        continue;
      }
    }
    if (field.type === "select" && !field.options.some((option) => option.value === value)) {
      errors[field.name] = ["Choose one of the listed options."];
      continue;
    }
    values[field.name] = value;
  }

  const snapshot = {
    serviceSlug: service.slug,
    formVersion: service.formVersion,
    titleBn: resolveCatalogPair(serviceTitleKey(service.slug)).bn,
    titleEn: resolveCatalogPair(serviceTitleKey(service.slug)).en,
    fields: service.fields.map((field) => {
      const label = resolveCatalogPair(fieldLabelKey(service.slug, field.name));
      return {
        name: field.name,
        labelBn: label.bn,
        labelEn: label.en,
        type: field.type,
        required: field.required,
        options:
          "options" in field && field.options
            ? field.options.map((option) => {
                const optionLabel = resolveCatalogPair(
                  optionLabelKey(service.slug, field.name, option.id),
                );
                return {
                  value: option.value,
                  labelBn: optionLabel.bn,
                  labelEn: optionLabel.en,
                };
              })
            : [],
      };
    }),
  };

  return { values, errors, snapshot };
}
