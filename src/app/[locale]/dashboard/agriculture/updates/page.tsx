import { AgriculturePublicInformationPage } from "@/components/agriculture/agriculture-public-information-page";
import { getPageMetadata } from "@/i18n/metadata";
import { getAgriculturePublicInfo } from "@/lib/agriculture/publishing";

export function generateMetadata() {
  return getPageMetadata("agricultureUpdates", "/agriculture/updates");
}

export default async function DashboardAgricultureUpdatesPage() {
  const info = await getAgriculturePublicInfo();
  return (
    <AgriculturePublicInformationPage
      info={info}
      routeBase="/dashboard/agriculture"
      section="updates"
    />
  );
}
