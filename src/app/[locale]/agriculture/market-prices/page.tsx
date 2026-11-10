import { AgriculturePublicInformationPage } from "@/components/agriculture/agriculture-public-information-page";
import { getPageMetadata } from "@/i18n/metadata";
import { getAgriculturePublicInfo } from "@/lib/agriculture/publishing";

export function generateMetadata() {
  return getPageMetadata("agriculturePrices", "/agriculture/market-prices");
}

export default async function AgricultureMarketPricesPage() {
  const info = await getAgriculturePublicInfo();
  return <AgriculturePublicInformationPage info={info} routeBase="/agriculture" section="prices" />;
}
