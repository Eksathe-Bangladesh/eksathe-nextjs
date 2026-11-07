import type { Metadata } from "next";
import { Suspense } from "react";

import { ConstructionProviderPage } from "@/components/construction/construction-listing-page";
import { DetailPageSkeleton } from "@/components/skeletons/page-skeletons";
import { localizedCanonical } from "@/i18n/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ providerId: string }>;
}): Promise<Metadata> {
  const { providerId } = await params;
  return {
    alternates: {
      canonical: await localizedCanonical(
        `/construction/providers/${encodeURIComponent(providerId)}`,
      ),
    },
  };
}

async function DashboardProviderContent({ params }: { params: Promise<{ providerId: string }> }) {
  const { providerId } = await params;
  return <ConstructionProviderPage providerId={providerId} routeBase="/dashboard/construction" />;
}

export default function DashboardProviderPage({
  params,
}: {
  params: Promise<{ providerId: string }>;
}) {
  return (
    <Suspense fallback={<DetailPageSkeleton />}>
      <DashboardProviderContent params={params} />
    </Suspense>
  );
}
