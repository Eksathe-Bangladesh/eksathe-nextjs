import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";

import { ProviderProfile } from "@/components/dashboard/provider-profile";
import { ProviderProfileSkeleton } from "@/components/skeletons/page-skeletons";
import { getLocaleOrDefault } from "@/i18n/locales";
import { localizedPath } from "@/i18n/paths";
import { getPublicProviderProfile } from "@/lib/listings";
import { getSector } from "@/lib/sectors";

async function PublicProviderContent({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string; providerId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ locale: routeLocale, slug, providerId }, query] = await Promise.all([
    params,
    searchParams,
  ]);
  const locale = getLocaleOrDefault(routeLocale);
  const sector = getSector(slug);
  if (slug === "agriculture-labor") {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(query))
      for (const item of Array.isArray(value) ? value : value ? [value] : [])
        search.append(key, item);
    permanentRedirect(
      localizedPath(
        locale,
        `/dashboard/agriculture/providers/${encodeURIComponent(providerId)}${search.size ? `?${search.toString()}` : ""}`,
      ),
    );
  }
  if (!sector || sector.status !== "live") notFound();
  const result = await getPublicProviderProfile(slug, providerId, locale);
  if (!result.provider && !result.unavailable) notFound();
  return (
    <ProviderProfile provider={result.provider} sector={sector} unavailable={result.unavailable} />
  );
}

export default function PublicProviderPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string; providerId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<ProviderProfileSkeleton />}>
      <PublicProviderContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
