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
          const optionIds = field.options.map((option) => option.id);
          expect(new Set(optionIds).size).toBe(optionIds.length);
          field.options.forEach((option) => {
            expect(option.id).toMatch(/^[a-z][A-Za-z0-9]*$/);
            const label = resolveCatalogPair(optionLabelKey(service.slug, field.name, option.id));
            expect(label.bn.length).toBeGreaterThan(0);
            expect(label.en.length).toBeGreaterThan(0);
          });
        }
      }
    }
  });

  test("semantic option IDs keep labels and submitted values stable when display order changes", () => {
    for (const service of agricultureServiceRegistry) {
      for (const field of service.fields) {
        if (!("options" in field)) continue;
        const original = new Map(field.options.map((option) => [option.id, option.value]));
        const originalLabels = new Map(
          field.options.map((option) => [
            option.id,
            resolveCatalogPair(optionLabelKey(service.slug, field.name, option.id)),
          ]),
        );
        for (const option of [...field.options].reverse()) {
          expect(original.get(option.id)).toBe(option.value);
          const key = optionLabelKey(service.slug, field.name, option.id);
          expect(resolveCatalogPair(key)).toEqual(originalLabels.get(option.id)!);
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
