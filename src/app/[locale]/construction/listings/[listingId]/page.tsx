import type { Metadata } from "next";
import { Suspense } from "react";

import { ConstructionListingPage } from "@/components/construction/construction-listing-page";
import { ListingDetailSkeleton } from "@/components/skeletons/page-skeletons";
import { getLocaleOrDefault } from "@/i18n/locales";
import { localizedCanonical } from "@/i18n/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; listingId: string }>;
}): Promise<Metadata> {
  const { listingId } = await params;
  return {
    title: "Construction listing | EKsathe Bangladesh",
    alternates: {
      canonical: await localizedCanonical(
        `/construction/listings/${encodeURIComponent(listingId)}`,
      ),
    },
  };
}

function ConstructionListingContent({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; listingId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <ConstructionListingInner params={params} searchParams={searchParams} />;
}

async function ConstructionListingInner({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; listingId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: routeLocale, listingId } = await params;
  return (
    <ConstructionListingPage
      locale={getLocaleOrDefault(routeLocale)}
      listingId={listingId}
      routeBase="/construction"
      searchParams={searchParams}
    />
  );
}

export default function DirectListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; listingId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<ListingDetailSkeleton />}>
      <ConstructionListingContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
