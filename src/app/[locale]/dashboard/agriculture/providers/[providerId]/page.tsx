import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ProviderProfile } from "@/components/dashboard/provider-profile";
import { DetailPageSkeleton } from "@/components/skeletons/page-skeletons";
import { getPublicProviderProfile } from "@/lib/listings";
import { getSector } from "@/lib/sectors";

async function DashboardAgricultureProviderContent({
  params,
}: {
  params: Promise<{ providerId: string }>;
}) {
  const { providerId } = await params;
  const sector = getSector("agriculture-labor");
  if (!sector) notFound();
  const result = await getPublicProviderProfile(sector.slug, providerId);
  if (!result.provider && !result.unavailable) notFound();
  return (
    <ProviderProfile
      provider={result.provider}
      sector={sector}
      unavailable={result.unavailable}
      routeBase="/dashboard/agriculture"
    />
  );
}

export default function DashboardAgricultureProviderPage({
  params,
}: {
  params: Promise<{ providerId: string }>;
}) {
  return (
    <Suspense fallback={<DetailPageSkeleton />}>
      <DashboardAgricultureProviderContent params={params} />
    </Suspense>
  );
}
