import type { Metadata } from "next";
import { Suspense } from "react";

import { ConstructionListingPage } from "@/components/construction/construction-listing-page";
import { DetailPageSkeleton } from "@/components/skeletons/page-skeletons";
import { localizedCanonical } from "@/i18n/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ listingId: string }>;
}): Promise<Metadata> {
  const { listingId } = await params;
  return {
    alternates: {
      canonical: await localizedCanonical(
        `/construction/listings/${encodeURIComponent(listingId)}`,
      ),
    },
  };
}

async function DashboardListingContent({
  params,
  searchParams,
}: {
  params: Promise<{ listingId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { listingId } = await params;
  return (
    <ConstructionListingPage
      listingId={listingId}
      routeBase="/dashboard/construction"
      searchParams={searchParams}
    />
  );
}

export default function DashboardListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ listingId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<DetailPageSkeleton />}>
      <DashboardListingContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
