import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";

import { ListingDetail } from "@/components/dashboard/listing-detail";
import { DetailPageSkeleton } from "@/components/skeletons/page-skeletons";
import { getLocaleOrDefault } from "@/i18n/locales";
import { localizedPath } from "@/i18n/paths";
import { getCurrentUser } from "@/lib/dal";
import { getPublicListing, getPublicProviderProfile } from "@/lib/listings";
import { getSector } from "@/lib/sectors";

async function ListingContent({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string; listingId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ locale: routeLocale, slug, listingId }, query] = await Promise.all([
    params,
    searchParams,
  ]);
  const locale = getLocaleOrDefault(routeLocale);
  const sector = getSector(slug);
  if (slug === "agriculture-labor") {
    const queryString = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      for (const item of Array.isArray(value) ? value : value ? [value] : [])
        queryString.append(key, item);
    }
    permanentRedirect(
      localizedPath(
        locale,
        `/dashboard/agriculture/listings/${encodeURIComponent(listingId)}${queryString.size ? `?${queryString.toString()}` : ""}`,
      ),
    );
  }
  if (!sector || sector.status !== "live") notFound();

  const [result, user] = await Promise.all([
    getPublicListing(listingId, locale),
    getCurrentUser(),
  ]);
  if (result.listing && result.listing.sectorSlug !== slug) notFound();
  if (!result.listing && !result.unavailable) notFound();
  const providerResult = result.listing
    ? await getPublicProviderProfile(sector.slug, result.listing.providerId, locale)
    : null;

  return (
    <ListingDetail
      sector={sector}
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

export default function ListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string; listingId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<DetailPageSkeleton />}>
      <ListingContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
