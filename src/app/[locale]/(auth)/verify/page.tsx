import { Suspense } from "react";

import { AuthPage } from "@/components/auth/auth-page";
import { CardCenteredSkeleton } from "@/components/skeletons/page-skeletons";
import { safeNextPath } from "@/i18n/paths";

async function VerifyContent({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string | string[] }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  return <AuthPage mode="verify" next={safeNextPath(params?.next, "/account")} />;
}

export default function VerifyPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string | string[] }>;
}) {
  return (
    <Suspense fallback={<CardCenteredSkeleton />}>
      <VerifyContent searchParams={searchParams} />
    </Suspense>
  );
}
