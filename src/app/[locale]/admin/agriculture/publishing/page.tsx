import { AgriculturePublishingWorkspace } from "@/components/admin/agriculture-publishing-workspace";
import { getAgriculturePublishingWorkspace } from "@/lib/agriculture/publishing";
import { requireStaff } from "@/lib/dal";

// Deliberate block: Admin publishing workspace performs a request-time staff gate (requireStaff).
export const instant = false;

export default async function AgriculturePublishingPage() {
  const actor = await requireStaff("OPERATIONS", "agriculture-labor");
  const data = await getAgriculturePublishingWorkspace(actor);
  return <AgriculturePublishingWorkspace data={data} isSuperAdmin={actor.role === "super_admin"} />;
}
