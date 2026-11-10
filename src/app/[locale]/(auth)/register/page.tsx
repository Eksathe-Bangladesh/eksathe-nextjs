import { Suspense } from "react";

import { AuthPage } from "@/components/auth/auth-page";
import { CardCenteredSkeleton } from "@/components/skeletons/page-skeletons";
import { safeNextPath } from "@/i18n/paths";

async function RegisterContent({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string | string[] }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  return <AuthPage mode="register" next={safeNextPath(params?.next, "/account")} />;
}

export default function RegisterPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string | string[] }>;
}) {
  return (
    <Suspense fallback={<CardCenteredSkeleton />}>
      <RegisterContent searchParams={searchParams} />
    </Suspense>
  );
}
