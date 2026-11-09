import { AgricultureHome } from "@/components/agriculture/agriculture-home";
import { getLocaleOrDefault } from "@/i18n/locales";
import { getPageMetadata } from "@/i18n/metadata";
import { getActiveAgricultureServiceCatalog } from "@/lib/agriculture/admin";
import { getAgriculturePublicInfo } from "@/lib/agriculture/publishing";
import { getPublicListings } from "@/lib/listings";

export function generateMetadata() {
  return getPageMetadata("agriculture", "/agriculture");
}

export default async function DashboardAgriculturePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: routeLocale } = await params;
  const locale = getLocaleOrDefault(routeLocale);
  const [result, publicInfo, serviceCatalog] = await Promise.all([
    getPublicListings("agriculture-labor", locale),
    getAgriculturePublicInfo(),
    getActiveAgricultureServiceCatalog(),
  ]);
  return (
    <AgricultureHome
      routeBase="/dashboard/agriculture"
      showDashboardBackLink
      listings={result.items}
      unavailable={result.unavailable}
      publicInfo={publicInfo}
      serviceCatalog={serviceCatalog}
    />
  );
}
