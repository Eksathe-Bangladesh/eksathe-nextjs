import { Suspense } from "react";

import { AuthPage } from "@/components/auth/auth-page";
import { CardCenteredSkeleton } from "@/components/skeletons/page-skeletons";
import { safeNextPath } from "@/i18n/paths";

async function LoginContent({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string | string[] }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  return <AuthPage mode="login" next={safeNextPath(params?.next, "/account")} />;
}

export default function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string | string[] }>;
}) {
  return (
    <Suspense fallback={<CardCenteredSkeleton />}>
      <LoginContent searchParams={searchParams} />
    </Suspense>
  );
}
