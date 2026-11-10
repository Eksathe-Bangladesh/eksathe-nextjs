import { Suspense } from "react";

import { ConstructionMarketPage } from "@/components/construction/construction-market-page";
import { GridPageSkeleton } from "@/components/skeletons/page-skeletons";
import { getPageMetadata } from "@/i18n/metadata";

export function generateMetadata() {
  return getPageMetadata("constructionMarket", "/construction/market");
}

export default function DashboardMarketPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<GridPageSkeleton />}>
      <ConstructionMarketPage
        params={params}
        routeBase="/dashboard/construction"
        searchParams={searchParams}
      />
    </Suspense>
  );
}
