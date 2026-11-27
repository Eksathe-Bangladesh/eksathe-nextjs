import { describe, expect, test } from "bun:test";

import { hasApprovedListingImageCapability } from "@/lib/domain/upload-authorization";

describe("listing image upload authorization", () => {
  test.each([
    ["agriculture-labor", "PRODUCE"],
    ["construction", "CONSTRUCTION_SERVICE"],
    ["logistics-delivery", "DELIVERY_SERVICE"],
    ["logistics-delivery", "FREIGHT_TRANSPORT"],
    ["transport-vehicle-services", "VEHICLE_RENTAL"],
    ["transport-vehicle-services", "PRIVATE_VEHICLE_CHARTER"],
  ] as const)("authorizes an approved %s / %s capability", (sectorSlug, kind) => {
    expect(
      hasApprovedListingImageCapability(
        {
          status: "APPROVED",
          capabilities: [{ sectorSlug, kind, status: "APPROVED" }],
        },
        sectorSlug,
        kind,
      ),
    ).toBe(true);
  });

  test("rejects unapproved providers, capabilities, and sector-kind pairs", () => {
    const approvedMobilityCapability = {
      status: "APPROVED",
      capabilities: [
        {
          sectorSlug: "logistics-delivery",
          kind: "DELIVERY_SERVICE",
          status: "APPROVED",
        },
      ],
    };

    expect(
      hasApprovedListingImageCapability(
        { ...approvedMobilityCapability, status: "PENDING" },
        "logistics-delivery",
        "DELIVERY_SERVICE",
      ),
    ).toBe(false);
    expect(
      hasApprovedListingImageCapability(
        {
          ...approvedMobilityCapability,
          capabilities: approvedMobilityCapability.capabilities.map((capability) => ({
            ...capability,
            status: "PENDING",
          })),
        },
        "logistics-delivery",
        "DELIVERY_SERVICE",
      ),
    ).toBe(false);
    expect(
      hasApprovedListingImageCapability(
        approvedMobilityCapability,
        "transport-vehicle-services",
        "DELIVERY_SERVICE",
      ),
    ).toBe(false);
    expect(hasApprovedListingImageCapability(null, "logistics-delivery", "DELIVERY_SERVICE")).toBe(
      false,
    );
  });
});
