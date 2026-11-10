import { Suspense } from "react";

import { AccountWorkspace } from "@/components/account/account-workspace";
import { WorkspaceSkeleton } from "@/components/skeletons/page-skeletons";
import { WorkspaceError } from "@/components/workflows/workspace-error";
import { requireUser } from "@/lib/dal";
import { logError } from "@/lib/logging";
import { getCustomerWorkspace } from "@/lib/workspaces";
import { getLocale } from "next-intl/server";

async function AccountPageContent() {
  const user = await requireUser("/account");
  const locale = await getLocale();
  const workspace = await getCustomerWorkspace(user.id, locale).catch((error) => {
    logError("workspace.customer_query_failed", error);
    return null;
  });
  if (!workspace) return <WorkspaceError />;
  return (
    <AccountWorkspace
      workspace={workspace}
      user={{ id: user.id, name: user.name, email: user.email, phone: user.phone }}
    />
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<WorkspaceSkeleton />}>
      <AccountPageContent />
    </Suspense>
  );
}
