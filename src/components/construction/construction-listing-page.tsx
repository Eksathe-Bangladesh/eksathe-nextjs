import { notFound } from "next/navigation";

import { ListingDetail } from "@/components/dashboard/listing-detail";
import { ProviderProfile } from "@/components/dashboard/provider-profile";
import { resolveCatalogPair } from "@/i18n/catalog";
import { getConstructionService } from "@/lib/construction/service-registry";
import { getCurrentUser } from "@/lib/dal";
import type { Locale } from "@/i18n/locales";
import { getPublicListing, getPublicProviderProfile } from "@/lib/listings";
import { getSector } from "@/lib/sectors";
import { getProjectPackageContext } from "@/lib/workspaces";

export async function ConstructionListingPage({
  locale,
  listingId,
  routeBase,
  searchParams,
}: {
  locale: Locale;
  listingId: string;
  routeBase: string;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const sector = getSector("construction");
  if (!sector || sector.status !== "live") notFound();
  const [result, user] = await Promise.all([
    getPublicListing(listingId, locale),
    getCurrentUser(),
  ]);
  if (result.listing && result.listing.sectorSlug !== "construction") notFound();
  if (!result.listing && !result.unavailable) notFound();
  const providerResult = result.listing
    ? await getPublicProviderProfile("construction", result.listing.providerId, locale)
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
  const localizedServiceTitle = contextService
    ? resolveCatalogPair(`constructionServices.${contextService.slug}.title`)[locale]
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
      packageLabel={localizedServiceTitle ?? compatiblePackage?.label}
    />
  );
}

export async function ConstructionProviderPage({
  locale,
  providerId,
  routeBase,
}: {
  locale: Locale;
  providerId: string;
  routeBase: string;
}) {
  const sector = getSector("construction");
  if (!sector || sector.status !== "live") notFound();
  const result = await getPublicProviderProfile("construction", providerId, locale);
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
