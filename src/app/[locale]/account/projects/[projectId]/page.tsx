import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ProjectDetail } from "@/components/projects/project-detail";
import { ProjectDetailSkeleton } from "@/components/skeletons/page-skeletons";
import { WorkspaceError } from "@/components/workflows/workspace-error";
import { getLocaleOrDefault } from "@/i18n/locales";
import { requireUser } from "@/lib/dal";
import { getPublicListings } from "@/lib/listings";
import { logError } from "@/lib/logging";
import { getProjectWorkspace } from "@/lib/workspaces";

async function ProjectContent({
  params,
}: {
  params: Promise<{ locale: string; projectId: string }>;
}) {
  const { locale: routeLocale, projectId } = await params;
  const locale = getLocaleOrDefault(routeLocale);
  const user = await requireUser(`/account/projects/${projectId}`);
  const project = await getProjectWorkspace(user.id, projectId).catch((error) => {
    logError("workspace.project_query_failed", error);
    return undefined;
  });
  if (project === undefined) return <WorkspaceError />;
  if (!project) notFound();
  const listingResult = project.isOwner
    ? await getPublicListings("construction", locale)
    : { items: [], unavailable: false };
  return (
    <ProjectDetail
      project={project}
      listings={listingResult.items}
      listingsUnavailable={listingResult.unavailable}
    />
  );
}

export default function ProjectPage({
  params,
}: {
  params: Promise<{ locale: string; projectId: string }>;
}) {
  return (
    <Suspense fallback={<ProjectDetailSkeleton />}>
      <ProjectContent params={params} />
    </Suspense>
  );
}
