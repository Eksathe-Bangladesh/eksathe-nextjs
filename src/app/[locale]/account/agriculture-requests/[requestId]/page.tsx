import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AgricultureRequestDetail } from "@/components/account/agriculture-request-detail";
import { AgricultureRequestSkeleton } from "@/components/skeletons/page-skeletons";
import { requireUser } from "@/lib/dal";
import { getCustomerAgricultureRequest } from "@/lib/workspaces";

async function CustomerAgricultureRequestContent({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId: rawId } = await params;
  if (!/^\d+$/.test(rawId) || !Number.isSafeInteger(Number(rawId))) notFound();
  const user = await requireUser(`/account/agriculture-requests/${rawId}`);
  const request = await getCustomerAgricultureRequest(user.id, Number(rawId));
  if (!request) notFound();
  return <AgricultureRequestDetail request={request} />;
}

export default function CustomerAgricultureRequestPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  return (
    <Suspense fallback={<AgricultureRequestSkeleton />}>
      <CustomerAgricultureRequestContent params={params} />
    </Suspense>
  );
}
