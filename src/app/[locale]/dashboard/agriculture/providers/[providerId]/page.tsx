import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ProviderProfile } from "@/components/dashboard/provider-profile";
import { ProviderProfileSkeleton } from "@/components/skeletons/page-skeletons";
import { getLocaleOrDefault } from "@/i18n/locales";
import { getPublicProviderProfile } from "@/lib/listings";
import { getSector } from "@/lib/sectors";

async function DashboardAgricultureProviderContent({
  params,
}: {
  params: Promise<{ locale: string; providerId: string }>;
}) {
  const { locale: routeLocale, providerId } = await params;
  const locale = getLocaleOrDefault(routeLocale);
  const sector = getSector("agriculture-labor");
  if (!sector) notFound();
  const result = await getPublicProviderProfile(sector.slug, providerId, locale);
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
  params: Promise<{ locale: string; providerId: string }>;
}) {
  return (
    <Suspense fallback={<ProviderProfileSkeleton />}>
      <DashboardAgricultureProviderContent params={params} />
    </Suspense>
  );
}
