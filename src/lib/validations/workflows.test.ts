import { describe, expect, test } from "bun:test";

import {
  createListingSchema,
  createRequestSchema,
  staffGrantSchema,
  updateListingSchema,
} from "@/lib/validations/workflows";

describe("staffGrantSchema", () => {
  test("accepts ecommerce as a scoped staff grant", () => {
    expect(
      staffGrantSchema.safeParse({
        email: "commerce-ops@example.com",
        permission: "OPERATIONS",
        scope: "ecommerce-b2b",
      }).success,
    ).toBe(true);
  });

  test("continues to reject unknown sector scopes", () => {
    expect(
      staffGrantSchema.safeParse({
        email: "commerce-ops@example.com",
        permission: "OPERATIONS",
        scope: "unknown-sector",
      }).success,
    ).toBe(false);
  });
});

const listingInput = {
  titleBn: "পরীক্ষার সেবা",
  titleEn: "Test service",
  descriptionBn: "",
  descriptionEn: "",
  category: "Service",
  district: "Dhaka",
  unit: "job",
  unitPrice: "100",
  stock: "0",
};

const requestInput = {
  listingId: "listing-1",
  quantity: "1",
  district: "Dhaka",
  details: "",
};

describe("Delivery and mobility listing validation", () => {
  test.each([
    ["logistics-delivery", "DELIVERY_SERVICE"],
    ["logistics-delivery", "FREIGHT_TRANSPORT"],
    ["transport-vehicle-services", "VEHICLE_RENTAL"],
    ["transport-vehicle-services", "PRIVATE_VEHICLE_CHARTER"],
  ] as const)("accepts %s / %s", (sectorSlug, kind) => {
    const vehicleDetails =
      kind === "VEHICLE_RENTAL" || kind === "PRIVATE_VEHICLE_CHARTER"
        ? { vehicleClass: "Sedan" }
        : {};
    expect(
      createListingSchema.safeParse({
        ...listingInput,
        sectorSlug,
        kind,
        ...("vehicleClass" in vehicleDetails ? { vehicleDetails } : {}),
      }).success,
    ).toBe(true);
  });

  test.each([
    ["logistics-delivery", "VEHICLE_RENTAL"],
    ["transport-vehicle-services", "DELIVERY_SERVICE"],
    ["agriculture-labor", "FREIGHT_TRANSPORT"],
  ] as const)("rejects %s / %s", (sectorSlug, kind) => {
    expect(createListingSchema.safeParse({ ...listingInput, sectorSlug, kind }).success).toBe(
      false,
    );
  });

  test("requires vehicle details for vehicle listings", () => {
    expect(
      createListingSchema.safeParse({
        ...listingInput,
        sectorSlug: "transport-vehicle-services",
        kind: "VEHICLE_RENTAL",
      }).success,
    ).toBe(false);
  });

  test("rejects vehicle details for non-vehicle listings", () => {
    expect(
      createListingSchema.safeParse({
        ...listingInput,
        sectorSlug: "agriculture-labor",
        kind: "PRODUCE",
        stock: "5",
        vehicleDetails: { vehicleClass: "Van" },
      }).success,
    ).toBe(false);
  });

  test("requires nonblank vehicle class and positive capacities", () => {
    const base = {
      ...listingInput,
      sectorSlug: "transport-vehicle-services",
      kind: "VEHICLE_RENTAL",
    };
    expect(
      createListingSchema.safeParse({
        ...base,
        vehicleDetails: { vehicleClass: "   " },
      }).success,
    ).toBe(false);
    expect(
      createListingSchema.safeParse({
        ...base,
        vehicleDetails: { vehicleClass: "Van", passengerCapacity: "0" },
      }).success,
    ).toBe(false);
    expect(
      createListingSchema.safeParse({
        ...base,
        vehicleDetails: { vehicleClass: "Van", passengerCapacity: "1.5" },
      }).success,
    ).toBe(false);
    expect(
      createListingSchema.safeParse({
        ...base,
        vehicleDetails: { vehicleClass: "Van", cargoCapacityKg: "0" },
      }).success,
    ).toBe(false);
    expect(
      createListingSchema.safeParse({
        ...base,
        vehicleDetails: {
          vehicleClass: "Van",
          passengerCapacity: "8",
          cargoCapacityKg: "1200.5",
        },
      }).success,
    ).toBe(true);
  });

  test("accepts vehicle details on listing update", () => {
    expect(
      updateListingSchema.safeParse({
        ...listingInput,
        listingId: "listing-1",
        sectorSlug: "transport-vehicle-services",
        kind: "PRIVATE_VEHICLE_CHARTER",
        vehicleDetails: { vehicleClass: "Minibus", passengerCapacity: "12" },
      }).success,
    ).toBe(true);
  });
});

describe("Delivery and mobility request details validation", () => {
  const validMobilityDetails = {
    pickupDistrict: "Dhaka",
    destinationDistrict: "Chattogram",
  };

  test("rejects blank pickup or destination districts", () => {
    expect(
      createRequestSchema.safeParse({
        ...requestInput,
        mobilityDetails: { ...validMobilityDetails, pickupDistrict: "   " },
      }).success,
    ).toBe(false);
    expect(
      createRequestSchema.safeParse({
        ...requestInput,
        mobilityDetails: { ...validMobilityDetails, destinationDistrict: "" },
      }).success,
    ).toBe(false);
  });

  test("requires positive integer counts and positive measurements when provided", () => {
    for (const [field, value] of [
      ["parcelCount", "0"],
      ["parcelCount", "1.2"],
      ["passengerCount", "0"],
      ["passengerCount", "-1"],
      ["weightKg", "0"],
      ["volumeM3", "-0.1"],
    ] as const) {
      expect(
        createRequestSchema.safeParse({
          ...requestInput,
          mobilityDetails: { ...validMobilityDetails, [field]: value },
        }).success,
      ).toBe(false);
    }
    expect(
      createRequestSchema.safeParse({
        ...requestInput,
        mobilityDetails: {
          ...validMobilityDetails,
          parcelCount: "2",
          passengerCount: "4",
          weightKg: "12.5",
          volumeM3: "1.25",
          pickupAddress: "1 Main Street",
          destinationAddress: "Port",
          cargoDescription: "Boxes",
          handlingNotes: "Keep dry",
        },
      }).success,
    ).toBe(true);
  });

  test("keeps existing agriculture and construction inputs valid", () => {
    expect(
      createListingSchema.safeParse({
        ...listingInput,
        sectorSlug: "agriculture-labor",
        kind: "PRODUCE",
        stock: "5",
      }).success,
    ).toBe(true);
    expect(
      createListingSchema.safeParse({
        ...listingInput,
        sectorSlug: "construction",
        kind: "CONSTRUCTION_SERVICE",
      }).success,
    ).toBe(true);
    expect(createRequestSchema.safeParse(requestInput).success).toBe(true);
  });
});
