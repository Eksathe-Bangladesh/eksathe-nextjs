import { describe, expect, mock, test } from "bun:test";

void mock.module("server-only", () => ({}));

import {
  fieldLabelKey,
  optionLabelKey,
  serviceDescriptionKey,
  serviceTitleKey,
} from "@/lib/agriculture/service-messages";
import {
  agricultureServiceCategories,
  agricultureServiceRegistry,
} from "@/lib/agriculture/service-registry";

const { resolveCatalogPair } = await import("@/i18n/catalog");

describe("agriculture service registry", () => {
  test("contains all 30 stable prototype services with versioned structured fields", () => {
    expect(agricultureServiceRegistry).toHaveLength(30);
    expect(new Set(agricultureServiceRegistry.map((service) => service.slug)).size).toBe(30);
    expect(agricultureServiceCategories).toHaveLength(6);
    for (const service of agricultureServiceRegistry) {
      expect(service.formVersion).toBeGreaterThan(0);
      expect(service.fields.length).toBeGreaterThan(0);
      expect(resolveCatalogPair(serviceTitleKey(service.slug)).bn.length).toBeGreaterThan(0);
      expect(resolveCatalogPair(serviceTitleKey(service.slug)).en.length).toBeGreaterThan(0);
      expect(resolveCatalogPair(serviceDescriptionKey(service.slug)).bn.length).toBeGreaterThan(0);
      expect(resolveCatalogPair(serviceDescriptionKey(service.slug)).en.length).toBeGreaterThan(0);
      for (const field of service.fields) {
        expect(
          resolveCatalogPair(fieldLabelKey(service.slug, field.name)).bn.length,
        ).toBeGreaterThan(0);
        expect(
          resolveCatalogPair(fieldLabelKey(service.slug, field.name)).en.length,
        ).toBeGreaterThan(0);
        if ("options" in field && field.options) {
          field.options.forEach((_, index) => {
            const option = resolveCatalogPair(optionLabelKey(service.slug, field.name, index));
            expect(option.bn.length).toBeGreaterThan(0);
            expect(option.en.length).toBeGreaterThan(0);
          });
        }
      }
    }
  });

  test("preserves the prototype's numeric, date, select, and optional disease-photo fields", () => {
    const service = (slug: string) =>
      agricultureServiceRegistry.find((item) => item.slug === slug)!;
    expect(
      service("farm-machinery").fields.find((field) => field.name === "machine_date")?.type,
    ).toBe("date");
    expect(service("farm-labour").fields.find((field) => field.name === "labour_count")?.type).toBe(
      "number",
    );
    expect(
      service("seeds-seedlings").fields.find((field) => field.name === "seed_kind")?.options
        ?.length,
    ).toBe(3);
    expect(
      service("pest-control").fields.find((field) => field.name === "disease_photo"),
    ).toMatchObject({ type: "file", required: false });
  });
});
