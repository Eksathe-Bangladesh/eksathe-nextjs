import { Suspense } from "react";

import { ProviderApplicationEntry } from "@/components/provider/provider-application-entry";
import { ProviderWorkspace } from "@/components/provider/provider-workspace";
import { WorkspaceSkeleton } from "@/components/skeletons/page-skeletons";
import { WorkspaceError } from "@/components/workflows/workspace-error";
import { requireUser } from "@/lib/dal";
import { logError } from "@/lib/logging";
import { getProviderWorkspace } from "@/lib/workspaces";
import { getLocale } from "next-intl/server";

async function ProviderPageContent() {
  const user = await requireUser("/provider");
  const locale = await getLocale();
  const workspace = await getProviderWorkspace(user.id, locale).catch((error) => {
    logError("workspace.provider_query_failed", error);
    return undefined;
  });
  if (workspace === undefined) return <WorkspaceError />;
  if (workspace === null) return <ProviderApplicationEntry />;
  return <ProviderWorkspace workspace={workspace} actorId={user.id} />;
}

export default function ProviderPage() {
  return (
    <Suspense fallback={<WorkspaceSkeleton />}>
      <ProviderPageContent />
    </Suspense>
  );
}
