import { Suspense } from "react";

import { CreateProjectEntry } from "@/components/projects/create-project-entry";
import { DetailPageSkeleton } from "@/components/skeletons/page-skeletons";
import { resolveCatalogPair } from "@/i18n/catalog";
import { getLocaleOrDefault } from "@/i18n/locales";
import { getConstructionService } from "@/lib/construction/service-registry";
import { requireUser } from "@/lib/dal";
import { getPublicListing } from "@/lib/listings";

async function CreateProjectContent({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ locale: routeLocale }, query] = await Promise.all([params, searchParams]);
  const locale = getLocaleOrDefault(routeLocale);
  const serviceSlug =
    typeof query.service === "string" && getConstructionService(query.service)
      ? query.service
      : undefined;
  const listingId =
    typeof query.listing === "string" && query.listing.length <= 64 ? query.listing : undefined;
  const intent = new URLSearchParams();
  if (listingId) intent.set("listing", listingId);
  else if (serviceSlug) intent.set("service", serviceSlug);
  await requireUser(`/account/projects/new${intent.size ? `?${intent.toString()}` : ""}`);

  const service = serviceSlug ? getConstructionService(serviceSlug) : undefined;
  const listingResult = listingId ? await getPublicListing(listingId, locale) : null;
  const listing =
    listingResult?.listing?.sectorSlug === "construction" ? listingResult.listing : null;
  return (
    <CreateProjectEntry
      context={{
        ...(service && !listing
          ? {
              serviceSlug: service.slug,
              labelBn: resolveCatalogPair(`constructionServices.${service.slug}.title`).bn,
              labelEn: resolveCatalogPair(`constructionServices.${service.slug}.title`).en,
            }
          : {}),
        ...(listing
          ? { listingId: listing.id, labelBn: listing.title, labelEn: listing.title }
          : {}),
      }}
    />
  );
}

export default function CreateProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<DetailPageSkeleton />}>
      <CreateProjectContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
