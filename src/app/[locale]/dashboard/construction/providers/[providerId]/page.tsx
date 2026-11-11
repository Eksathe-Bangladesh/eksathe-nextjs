import type { Metadata } from "next";
import { Suspense } from "react";

import { ConstructionProviderPage } from "@/components/construction/construction-listing-page";
import { ProviderProfileSkeleton } from "@/components/skeletons/page-skeletons";
import { getLocaleOrDefault } from "@/i18n/locales";
import { localizedCanonical } from "@/i18n/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; providerId: string }>;
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

async function DashboardProviderContent({
  params,
}: {
  params: Promise<{ locale: string; providerId: string }>;
}) {
  const { locale: routeLocale, providerId } = await params;
  return (
    <ConstructionProviderPage
      locale={getLocaleOrDefault(routeLocale)}
      providerId={providerId}
      routeBase="/dashboard/construction"
    />
  );
}

export default function DashboardProviderPage({
  params,
}: {
  params: Promise<{ locale: string; providerId: string }>;
}) {
  return (
    <Suspense fallback={<ProviderProfileSkeleton />}>
      <DashboardProviderContent params={params} />
    </Suspense>
  );
}
