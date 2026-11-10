import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ProviderProfile } from "@/components/dashboard/provider-profile";
import { DetailPageSkeleton } from "@/components/skeletons/page-skeletons";
import { getLocaleOrDefault } from "@/i18n/locales";
import { getPublicProviderProfile } from "@/lib/listings";
import { getSector } from "@/lib/sectors";

async function AgricultureProviderContent({
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
      routeBase="/agriculture"
    />
  );
}

export default function AgricultureProviderPage({
  params,
}: {
  params: Promise<{ locale: string; providerId: string }>;
}) {
  return (
    <Suspense fallback={<DetailPageSkeleton />}>
      <AgricultureProviderContent params={params} />
    </Suspense>
  );
}
