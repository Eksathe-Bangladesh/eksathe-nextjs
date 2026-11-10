import { ConstructionHome } from "@/components/construction/construction-home";
import { getLocaleOrDefault } from "@/i18n/locales";
import { getPageMetadata } from "@/i18n/metadata";
import { getConstructionCommissionRate } from "@/lib/construction/public-data";
import { getPublicListings } from "@/lib/listings";

export function generateMetadata() {
  return getPageMetadata("construction", "/construction");
}

export default async function DashboardConstructionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: routeLocale } = await params;
  const locale = getLocaleOrDefault(routeLocale);
  const [result, commissionRate] = await Promise.all([
    getPublicListings("construction", locale),
    getConstructionCommissionRate(),
  ]);
  return (
    <ConstructionHome
      routeBase="/dashboard/construction"
      showDashboardBackLink
      listings={result.items}
      unavailable={result.unavailable}
      commissionRate={commissionRate}
    />
  );
}
