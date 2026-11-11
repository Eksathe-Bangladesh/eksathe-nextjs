import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ListingDetail } from "@/components/dashboard/listing-detail";
import { ListingDetailSkeleton } from "@/components/skeletons/page-skeletons";
import { getLocaleOrDefault } from "@/i18n/locales";
import { getCurrentUser } from "@/lib/dal";
import { getPublicListing, getPublicProviderProfile } from "@/lib/listings";
import { getSector } from "@/lib/sectors";

async function DashboardAgricultureListingContent({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; listingId: string }>;
  searchParams: Promise<{ projectId?: string | string[]; packageLabel?: string | string[] }>;
}) {
  const [{ locale: routeLocale, listingId }, query] = await Promise.all([params, searchParams]);
  const locale = getLocaleOrDefault(routeLocale);
  const sector = getSector("agriculture-labor");
  if (!sector) notFound();
  const [result, user] = await Promise.all([getPublicListing(listingId, locale), getCurrentUser()]);
  if (result.listing && result.listing.sectorSlug !== sector.slug) notFound();
  if (!result.listing && !result.unavailable) notFound();
  const providerResult = result.listing
    ? await getPublicProviderProfile(sector.slug, result.listing.providerId, locale)
    : null;
  return (
    <ListingDetail
      sector={sector}
      routeBase="/dashboard/agriculture"
      listing={result.listing}
      provider={providerResult?.provider}
      unavailable={result.unavailable}
      signedIn={Boolean(user && user.status === "active")}
      projectId={
        typeof query.projectId === "string" && query.projectId.length <= 64
          ? query.projectId
          : undefined
      }
      packageLabel={
        typeof query.packageLabel === "string" && query.packageLabel.length <= 80
          ? query.packageLabel
          : undefined
      }
    />
  );
}

export default function DashboardAgricultureListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; listingId: string }>;
  searchParams: Promise<{ projectId?: string | string[]; packageLabel?: string | string[] }>;
}) {
  return (
    <Suspense fallback={<ListingDetailSkeleton />}>
      <DashboardAgricultureListingContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
