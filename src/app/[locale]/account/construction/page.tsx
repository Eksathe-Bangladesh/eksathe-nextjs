import { getLocale } from "next-intl/server";
import { connection } from "next/server";
import { Suspense } from "react";

import { ConstructionWorkspace } from "@/components/construction/construction-workspace";
import { WorkspaceSkeleton } from "@/components/skeletons/page-skeletons";
import { WorkspaceError } from "@/components/workflows/workspace-error";
import { requireUser } from "@/lib/dal";
import { logError } from "@/lib/logging";
import { getCustomerWorkspace } from "@/lib/workspaces";

async function ConstructionWorkspaceContent() {
  await connection();
  const user = await requireUser("/account/construction");
  const locale = await getLocale();
  const workspace = await getCustomerWorkspace(user.id, locale).catch((error) => {
    logError("workspace.construction_customer_query_failed", error);
    return null;
  });
  if (!workspace) return <WorkspaceError />;
  return <ConstructionWorkspace workspace={workspace} userId={user.id} />;
}

export default function ConstructionAccountPage() {
  return (
    <Suspense fallback={<WorkspaceSkeleton />}>
      <ConstructionWorkspaceContent />
    </Suspense>
  );
}
