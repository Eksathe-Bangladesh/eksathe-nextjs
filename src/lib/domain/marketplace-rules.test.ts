import { describe, expect, it } from "bun:test";

import {
  getListingFulfillment,
  getListingKindsForFulfillment,
  isCharterPassengerCountValid,
  isMobilityListingKind,
} from "@/lib/domain/marketplace-rules";
import {
  getMarketplaceDiscoveryForSector,
  isListingKindAllowedForSector,
  listingKindsBySector,
} from "@/lib/sector-listing-kinds";

describe("marketplace listing domain rules", () => {
  it("allows all declared sector and listing-kind pairs", () => {
    for (const [sectorSlug, kinds] of Object.entries(listingKindsBySector)) {
      for (const kind of kinds) {
        expect(isListingKindAllowedForSector(sectorSlug, kind)).toBe(true);
      }
    }
  });

  it("maps delivery and transport sectors to their approved kinds", () => {
    expect(listingKindsBySector["logistics-delivery"]).toEqual([
      "DELIVERY_SERVICE",
      "FREIGHT_TRANSPORT",
    ]);
    expect(listingKindsBySector["transport-vehicle-services"]).toEqual([
      "VEHICLE_RENTAL",
      "PRIVATE_VEHICLE_CHARTER",
    ]);
  });

  it("rejects mismatched and unknown sector-kind pairs", () => {
    expect(isListingKindAllowedForSector("logistics-delivery", "VEHICLE_RENTAL")).toBe(false);
    expect(isListingKindAllowedForSector("transport-vehicle-services", "DELIVERY_SERVICE")).toBe(
      false,
    );
    expect(isListingKindAllowedForSector("agriculture-labor", "UNKNOWN_KIND")).toBe(false);
    expect(isListingKindAllowedForSector("unknown-sector", "PRODUCE")).toBe(false);
  });

  it("classifies existing listing kinds and rental booking explicitly", () => {
    expect(getListingFulfillment("PRODUCE")).toBe("finite-stock");
    expect(getListingFulfillment("CONSTRUCTION_MATERIAL")).toBe("finite-stock");
    expect(getListingFulfillment("WORKER")).toBe("scheduled");
    expect(getListingFulfillment("MACHINERY")).toBe("scheduled");
    expect(getListingFulfillment("CONSTRUCTION_SERVICE")).toBe("scheduled");
    expect(getListingFulfillment("VEHICLE_RENTAL")).toBe("scheduled");
    expect(getListingFulfillment("DELIVERY_SERVICE")).toBe("quote");
    expect(getListingFulfillment("FREIGHT_TRANSPORT")).toBe("quote");
    expect(getListingFulfillment("PRIVATE_VEHICLE_CHARTER")).toBe("quote");
    expect(getListingFulfillment("UNKNOWN_KIND")).toBeNull();
  });

  it("groups every public listing kind by fulfillment availability", () => {
    expect(getListingKindsForFulfillment("finite-stock")).toEqual([
      "PRODUCE",
      "CONSTRUCTION_MATERIAL",
    ]);
    expect(getListingKindsForFulfillment("scheduled")).toEqual([
      "WORKER",
      "MACHINERY",
      "CONSTRUCTION_SERVICE",
      "VEHICLE_RENTAL",
    ]);
    expect(getListingKindsForFulfillment("quote")).toEqual([
      "DELIVERY_SERVICE",
      "FREIGHT_TRANSPORT",
      "PRIVATE_VEHICLE_CHARTER",
    ]);
  });

  it("builds discovery catalogs for only the sector's allowed listing kinds", () => {
    expect(getMarketplaceDiscoveryForSector("agriculture-labor")).toMatchObject({
      listingKinds: ["PRODUCE", "WORKER", "MACHINERY"],
      services: [{ slug: "produce-market" }, { slug: "farm-labour" }, { slug: "farm-machinery" }],
    });
    expect(getMarketplaceDiscoveryForSector("construction")).toMatchObject({
      listingKinds: ["CONSTRUCTION_MATERIAL", "CONSTRUCTION_SERVICE"],
      services: [{ slug: "construction-material" }, { slug: "construction-service" }],
    });
    expect(getMarketplaceDiscoveryForSector("logistics-delivery")).toMatchObject({
      listingKinds: ["DELIVERY_SERVICE", "FREIGHT_TRANSPORT"],
      services: [{ slug: "delivery-service" }, { slug: "freight-transport" }],
    });
    expect(getMarketplaceDiscoveryForSector("transport-vehicle-services")).toMatchObject({
      listingKinds: ["VEHICLE_RENTAL", "PRIVATE_VEHICLE_CHARTER"],
      services: [{ slug: "vehicle-rental" }, { slug: "private-vehicle-charter" }],
    });
    expect(getMarketplaceDiscoveryForSector("ecommerce-b2b")).toBeNull();
  });

  it("rejects inherited object keys as unknown listing kinds", () => {
    for (const kind of ["toString", "constructor", "hasOwnProperty", "__proto__"]) {
      expect(getListingFulfillment(kind)).toBeNull();
    }
  });

  it("requires a positive integer passenger count for private vehicle charters only", () => {
    expect(isCharterPassengerCountValid("PRIVATE_VEHICLE_CHARTER", 1)).toBe(true);
    expect(isCharterPassengerCountValid("PRIVATE_VEHICLE_CHARTER", "4")).toBe(true);
    expect(isCharterPassengerCountValid("PRIVATE_VEHICLE_CHARTER", undefined)).toBe(false);
    expect(isCharterPassengerCountValid("PRIVATE_VEHICLE_CHARTER", 0)).toBe(false);
    expect(isCharterPassengerCountValid("PRIVATE_VEHICLE_CHARTER", 1.5)).toBe(false);
    expect(isCharterPassengerCountValid("PRIVATE_VEHICLE_CHARTER", 2_147_483_648)).toBe(false);
    expect(isCharterPassengerCountValid("VEHICLE_RENTAL", undefined)).toBe(true);
  });

  it("rejects invalid charter passenger count strings and null", () => {
    for (const passengerCount of ["0", "-1", "1.5", " 2 ", "2.0", null]) {
      expect(isCharterPassengerCountValid("PRIVATE_VEHICLE_CHARTER", passengerCount)).toBe(false);
    }
  });

  it("identifies only the four delivery and mobility listing kinds", () => {
    expect(isMobilityListingKind("DELIVERY_SERVICE")).toBe(true);
    expect(isMobilityListingKind("FREIGHT_TRANSPORT")).toBe(true);
    expect(isMobilityListingKind("VEHICLE_RENTAL")).toBe(true);
    expect(isMobilityListingKind("PRIVATE_VEHICLE_CHARTER")).toBe(true);
    expect(isMobilityListingKind("PRODUCE")).toBe(false);
    expect(isMobilityListingKind("UNKNOWN_KIND")).toBe(false);
  });
});
