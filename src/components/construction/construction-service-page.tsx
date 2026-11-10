import { notFound } from "next/navigation";

import { ConstructionServiceDetail } from "@/components/construction/construction-service-detail";
import { getConstructionService } from "@/lib/construction/service-registry";
import type { Locale } from "@/i18n/locales";
import { getConstructionMarketListings } from "@/lib/listings";

export async function ConstructionServicePage({
  locale,
  slug,
  routeBase,
}: {
  locale: Locale;
  slug: string;
  routeBase: string;
}) {
  const service = getConstructionService(slug);
  if (!service) notFound();
  const result = await getConstructionMarketListings({
    kind: service.kind,
    searchTerms: [...service.searchTerms],
  }, locale);
  return <ConstructionServiceDetail service={service} routeBase={routeBase} result={result} />;
}
