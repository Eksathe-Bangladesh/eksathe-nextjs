import { expect, test } from "bun:test";

import { createTranslator } from "next-intl";

import { statusMessageKey } from "@/i18n/message-keys";

import bn from "../../../messages/bn.json";
import en from "../../../messages/en.json";
import { fieldLabelKey, optionLabelKey, serviceTitleKey } from "../agriculture/service-messages";

test("status keys are exhaustive and unknown runtime statuses have an explicit fallback", () => {
  for (const status of Object.keys(en.statuses))
    expect(statusMessageKey(status) === `statuses.${status}`).toBe(true);
  expect(statusMessageKey("FUTURE_STATUS")).toBeNull();
  expect(statusMessageKey("toString")).toBeNull();
});

test("agriculture helpers reject mismatched runtime fields and invalid option IDs", () => {
  expect(fieldLabelKey("seeds-seedlings", "seed_kind")).toBe(
    "agricultureServices.seeds-seedlings.fields.seed_kind.label",
  );
  expect(optionLabelKey("seeds-seedlings", "seed_kind", "seeds")).toBe(
    "agricultureServices.seeds-seedlings.fields.seed_kind.options.seeds",
  );
  expect(() =>
    Reflect.apply(optionLabelKey, undefined, ["seeds-seedlings", "seed_kind", "unknownOption"]),
  ).toThrow("Unknown agriculture option");
  expect(() =>
    Reflect.apply(optionLabelKey, undefined, ["seeds-seedlings", "unknown_field", "seeds"]),
  ).toThrow("Unknown agriculture field");
  expect(() =>
    Reflect.apply(optionLabelKey, undefined, ["crop-farming", "crop_name", "seeds"]),
  ).toThrow("Unknown agriculture option");
  // Deliberately widen to the union to exercise the check used by mixed-service loops.
  const slug: Parameters<typeof serviceTitleKey>[0] = "crop-farming" as Parameters<
    typeof serviceTitleKey
  >[0];
  expect(() => fieldLabelKey(slug, "seed_kind")).toThrow("Unknown agriculture field");
});

test("all count messages format 0, 1, and 2 in English and Bangla", () => {
  const countKeys = [
    "marketplace.listingCount",
    "marketplace.labels.reviews",
    "dashboard.sector.availableListings",
    "dashboard.categoryGrid.resultCount",
    "account.workspace.acceptedQuoteOrders",
    "construction.home.serviceAreaCount",
    "projects.milestones.count",
  ] as const;
  const english = createTranslator({ locale: "en", messages: en });
  const bangla = createTranslator({ locale: "bn", messages: bn });
  for (const key of countKeys) {
    for (const count of [0, 1, 2]) {
      const enText = english(key, { count });
      const bnText = bangla(key, { count });
      expect(enText).not.toContain("{");
      expect(bnText).not.toContain("{");
      expect(enText.match(/[0-9]+/g)).toEqual([String(count)]);
      expect(bnText.match(/[০-৯]+/g)).toEqual([new Intl.NumberFormat("bn").format(count)]);
    }
  }
  expect(english("marketplace.listingCount", { count: 1 })).toBe("1 listing");
  expect(english("marketplace.listingCount", { count: 2 })).toBe("2 listings");
  expect(bangla("marketplace.listingCount", { count: 2 })).toBe("২টি তালিকা");
});

// Compile-time regression checks; these invalid calls are never executed.
const checkKeyTypes = () => {
  // @ts-expect-error Unknown service slugs cannot become message keys.
  serviceTitleKey("unknown-service");
  // @ts-expect-error A field must belong to the selected service.
  fieldLabelKey("crop-farming", "seed_kind");
  // @ts-expect-error Text fields do not have option messages.
  optionLabelKey("crop-farming", "crop_name", 0);
  // @ts-expect-error Option IDs are constrained by the service field.
  optionLabelKey("seeds-seedlings", "seed_kind", "unknownOption");
  // @ts-expect-error A valid ID from another field is not valid for seed_kind.
  optionLabelKey("seeds-seedlings", "seed_kind", "tractor");
};
void checkKeyTypes;
