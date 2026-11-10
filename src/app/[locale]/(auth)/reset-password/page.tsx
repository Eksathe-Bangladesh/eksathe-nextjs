import { Suspense } from "react";

import { AuthPage } from "@/components/auth/auth-page";
import { CardCenteredSkeleton } from "@/components/skeletons/page-skeletons";

async function ResetPasswordContent({
  searchParams,
}: {
  searchParams?: Promise<{ token?: string | string[] }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  return (
    <AuthPage
      mode="reset"
      next="/account"
      token={Array.isArray(params?.token) ? params?.token[0] : params?.token}
    />
  );
}

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams?: Promise<{ token?: string | string[] }>;
}) {
  return (
    <Suspense fallback={<CardCenteredSkeleton />}>
      <ResetPasswordContent searchParams={searchParams} />
    </Suspense>
  );
}
