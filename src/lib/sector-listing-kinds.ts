import { ListingKind as PrismaListingKind } from "@/generated/prisma/enums";
import { agricultureListings, constructionListings, deliveryMobilityListings } from "@/lib/sectors";

export const deliveryMobilityListingKinds = {
  DELIVERY_SERVICE: "DELIVERY_SERVICE",
  FREIGHT_TRANSPORT: "FREIGHT_TRANSPORT",
  VEHICLE_RENTAL: "VEHICLE_RENTAL",
  PRIVATE_VEHICLE_CHARTER: "PRIVATE_VEHICLE_CHARTER",
} as const;

export const marketplaceListingSectors = [
  "agriculture-labor",
  "construction",
  "logistics-delivery",
  "transport-vehicle-services",
] as const;

type DeliveryMobilityListingKind =
  (typeof deliveryMobilityListingKinds)[keyof typeof deliveryMobilityListingKinds];

export const marketplaceListingKindValues = {
  ...PrismaListingKind,
  ...deliveryMobilityListingKinds,
} as const;

export type MarketplaceListingKind =
  (typeof marketplaceListingKindValues)[keyof typeof marketplaceListingKindValues];
export type MarketplaceListingSector = (typeof marketplaceListingSectors)[number];

export const listingKindsBySector = {
  "agriculture-labor": agricultureListings.map(({ kind }) => kind),
  construction: constructionListings.map(({ kind }) => kind),
  "logistics-delivery": [
    deliveryMobilityListingKinds.DELIVERY_SERVICE,
    deliveryMobilityListingKinds.FREIGHT_TRANSPORT,
  ],
  "transport-vehicle-services": [
    deliveryMobilityListingKinds.VEHICLE_RENTAL,
    deliveryMobilityListingKinds.PRIVATE_VEHICLE_CHARTER,
  ],
} as const satisfies Record<
  MarketplaceListingSector,
  readonly (PrismaListingKind | DeliveryMobilityListingKind)[]
>;

export type MarketplaceListingService =
  | (typeof agricultureListings)[number]
  | (typeof constructionListings)[number]
  | (typeof deliveryMobilityListings)[number];

const marketplaceListingServices: readonly MarketplaceListingService[] = [
  ...agricultureListings,
  ...constructionListings,
  ...deliveryMobilityListings,
];

const listingKindsBySectorLookup: Readonly<Record<string, readonly string[]>> =
  listingKindsBySector;

export function isMarketplaceListingSector(
  sectorSlug: string,
): sectorSlug is MarketplaceListingSector {
  return Object.prototype.hasOwnProperty.call(listingKindsBySectorLookup, sectorSlug);
}

export function getMarketplaceDiscoveryForSector(sectorSlug: string) {
  if (!isMarketplaceListingSector(sectorSlug)) return null;

  const listingKinds = listingKindsBySector[sectorSlug];
  return {
    listingKinds,
    services: marketplaceListingServices.filter((service) =>
      listingKinds.some((kind) => kind === service.kind),
    ),
  };
}

export function isListingKindAllowedForSector(sectorSlug: string, kind: string) {
  return listingKindsBySectorLookup[sectorSlug]?.includes(kind) ?? false;
}

export function isVehicleListingKind(kind: string) {
  return (
    kind === deliveryMobilityListingKinds.VEHICLE_RENTAL ||
    kind === deliveryMobilityListingKinds.PRIVATE_VEHICLE_CHARTER
  );
}
