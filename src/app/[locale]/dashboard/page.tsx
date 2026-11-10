import { DashboardHub } from "@/components/dashboard/dashboard-hub";
import { getPageMetadata } from "@/i18n/metadata";

export function generateMetadata() {
  return getPageMetadata("dashboard");
}

export default function DashboardPage() {
  return <DashboardHub />;
}
