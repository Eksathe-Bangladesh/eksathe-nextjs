import { isListingKindAllowedForSector } from "@/lib/sector-listing-kinds";

type ListingImageCapabilityProfile = {
  status: string;
  capabilities: {
    sectorSlug: string;
    kind: string;
    status: string;
  }[];
};

export function hasApprovedListingImageCapability(
  profile: ListingImageCapabilityProfile | null,
  sectorSlug: string,
  kind: string,
): profile is ListingImageCapabilityProfile {
  return (
    isListingKindAllowedForSector(sectorSlug, kind) &&
    profile?.status === "APPROVED" &&
    profile.capabilities.some(
      (capability) =>
        capability.sectorSlug === sectorSlug &&
        capability.kind === kind &&
        capability.status === "APPROVED",
    )
  );
}
