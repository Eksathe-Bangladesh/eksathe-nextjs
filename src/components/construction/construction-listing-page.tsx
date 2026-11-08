import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { ListingDetail } from "@/components/dashboard/listing-detail";
import { ProviderProfile } from "@/components/dashboard/provider-profile";
import { getConstructionService } from "@/lib/construction/service-registry";
import { getCurrentUser } from "@/lib/dal";
import { getPublicListing, getPublicProviderProfile } from "@/lib/listings";
import { getSector } from "@/lib/sectors";
import { getProjectPackageContext } from "@/lib/workspaces";

export async function ConstructionListingPage({
  listingId,
  routeBase,
  searchParams,
}: {
  listingId: string;
  routeBase: string;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = (await cookies()).get("NEXT_LOCALE")?.value === "en" ? "en" : "bn";
  const query = await searchParams;
  const sector = getSector("construction");
  if (!sector || sector.status !== "live") notFound();
  const [result, user] = await Promise.all([getPublicListing(listingId), getCurrentUser()]);
  if (result.listing && result.listing.sectorSlug !== "construction") notFound();
  if (!result.listing && !result.unavailable) notFound();
  const providerResult = result.listing
    ? await getPublicProviderProfile("construction", result.listing.providerId)
    : null;
  const projectId =
    typeof query?.projectId === "string" && query.projectId.length <= 64
      ? query.projectId
      : undefined;
  const packageId =
    typeof query?.packageId === "string" && query.packageId.length <= 64
      ? query.packageId
      : undefined;
  const projectPackage =
    projectId && packageId && user
      ? await getProjectPackageContext(user.id, projectId, packageId)
      : null;
  const compatiblePackage =
    projectPackage && (!projectPackage.kind || projectPackage.kind === result.listing?.kind)
      ? projectPackage
      : null;
  const contextService = compatiblePackage?.serviceSlug
    ? getConstructionService(compatiblePackage.serviceSlug)
    : undefined;

  return (
    <ListingDetail
      sector={sector}
      routeBase={routeBase}
      listing={result.listing}
      provider={providerResult?.provider}
      unavailable={result.unavailable}
      signedIn={Boolean(user && user.status === "active")}
      projectId={compatiblePackage ? projectId : undefined}
      packageId={compatiblePackage?.id}
      packageLabel={
        contextService
          ? locale === "bn" ? contextService.titleBn : contextService.titleEn
          : compatiblePackage?.label
      }
    />
  );
}

export async function ConstructionProviderPage({
  providerId,
  routeBase,
}: {
  providerId: string;
  routeBase: string;
}) {
  const sector = getSector("construction");
  if (!sector || sector.status !== "live") notFound();
  const result = await getPublicProviderProfile("construction", providerId);
  if (!result.provider && !result.unavailable) notFound();
  return (
    <ProviderProfile
      provider={result.provider}
      sector={sector}
      unavailable={result.unavailable}
      routeBase={routeBase}
    />
  );
}
