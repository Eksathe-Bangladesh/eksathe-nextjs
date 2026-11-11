import { connection } from "next/server";

import { AdminSectionNavigation } from "@/components/admin/admin-section-navigation";
import { AdminWorkspace } from "@/components/admin/admin-workspace";
import { WorkspaceError } from "@/components/workflows/workspace-error";
import { agricultureServiceRegistry } from "@/lib/agriculture/service-registry";
import { requireAdmin } from "@/lib/dal";
import { logError } from "@/lib/logging";
import { getAdminWorkspace } from "@/lib/workspaces";
import type { AgricultureAdminFilters } from "@/lib/workspaces";

// Deliberate block: Admin workspace performs a request-time auth gate (requireAdmin) and reads searchParams for filtering.
export const instant = false;

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const { access } = await requireAdmin();
  const showCommerce =
    access.isSuperAdmin ||
    access.operationSectors.includes("ecommerce-b2b") ||
    access.panelManagementSectors.includes("ecommerce-b2b") ||
    access.financeSectors.includes("ecommerce-b2b");
  const params = await searchParams;
  const value = (key: string) => {
    const raw = params[key];
    return (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? "";
  };
  const statusValue = value("agStatus");
  const allowedStatus = [
    "NEW",
    "REVIEWING",
    "ASSIGNED",
    "COMPLETED",
    "REJECTED",
    "CANCELLED",
  ] as const;
  const validDate = (input: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(input) && !Number.isNaN(Date.parse(`${input}T00:00:00.000Z`));
  const serviceSlug = value("agService");
  const filters: AgricultureAdminFilters = {
    ...(agricultureServiceRegistry.some((service) => service.slug === serviceSlug)
      ? { serviceSlug }
      : {}),
    ...(value("agDistrict").length <= 80 && value("agDistrict")
      ? { district: value("agDistrict") }
      : {}),
    ...(allowedStatus.includes(statusValue as (typeof allowedStatus)[number])
      ? { status: statusValue as (typeof allowedStatus)[number] }
      : {}),
    ...(value("agAssignee").length <= 64 && value("agAssignee")
      ? { assigneeId: value("agAssignee") }
      : {}),
    ...(validDate(value("agFrom")) ? { dateFrom: value("agFrom") } : {}),
    ...(validDate(value("agTo")) ? { dateTo: value("agTo") } : {}),
  };
  const data = await getAdminWorkspace(access, filters).catch((error) => {
    logError("workspace.admin_query_failed", error);
    return null;
  });
  if (!data) return <WorkspaceError />;
  return (
    <>
      <AdminSectionNavigation showCommerce={showCommerce} />
      <AdminWorkspace data={data} />
    </>
  );
}
