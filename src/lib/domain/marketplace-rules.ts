import {
  deliveryMobilityListingKinds,
  type MarketplaceListingKind,
} from "@/lib/sector-listing-kinds";

export type ListingFulfillment = "finite-stock" | "scheduled" | "quote";

const listingFulfillmentByKind = {
  PRODUCE: "finite-stock",
  WORKER: "scheduled",
  MACHINERY: "scheduled",
  CONSTRUCTION_MATERIAL: "finite-stock",
  CONSTRUCTION_SERVICE: "scheduled",
  DELIVERY_SERVICE: "quote",
  FREIGHT_TRANSPORT: "quote",
  VEHICLE_RENTAL: "scheduled",
  PRIVATE_VEHICLE_CHARTER: "quote",
} as const satisfies Record<MarketplaceListingKind, ListingFulfillment>;

const listingFulfillmentLookup: Readonly<Record<string, ListingFulfillment>> =
  listingFulfillmentByKind;

export function getListingFulfillment(kind: string): ListingFulfillment | null {
  if (!Object.prototype.hasOwnProperty.call(listingFulfillmentLookup, kind)) return null;
  return listingFulfillmentLookup[kind] ?? null;
}

export function getListingKindsForFulfillment(fulfillment: ListingFulfillment) {
  return Object.keys(listingFulfillmentByKind).filter(
    (kind): kind is MarketplaceListingKind => getListingFulfillment(kind) === fulfillment,
  );
}

export function isMobilityListingKind(kind: string) {
  return (
    kind === deliveryMobilityListingKinds.DELIVERY_SERVICE ||
    kind === deliveryMobilityListingKinds.FREIGHT_TRANSPORT ||
    kind === deliveryMobilityListingKinds.VEHICLE_RENTAL ||
    kind === deliveryMobilityListingKinds.PRIVATE_VEHICLE_CHARTER
  );
}

export function isCharterPassengerCountValid(kind: string, passengerCount: unknown) {
  if (kind !== deliveryMobilityListingKinds.PRIVATE_VEHICLE_CHARTER) return true;

  const count =
    typeof passengerCount === "number"
      ? passengerCount
      : typeof passengerCount === "string" && /^[1-9]\d*$/.test(passengerCount)
        ? Number(passengerCount)
        : NaN;

  return Number.isSafeInteger(count) && count > 0 && count <= 2_147_483_647;
}
