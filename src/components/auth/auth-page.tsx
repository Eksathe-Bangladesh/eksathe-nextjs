import type { AuthMode } from "@/components/auth/auth-panel";
import { AuthPanel } from "@/components/auth/auth-panel";

export function AuthPage({ mode, next, token }: { mode: AuthMode; next?: string; token?: string }) {
  return (
    <div className="mx-auto flex min-h-[65vh] w-full max-w-360 items-center justify-center px-4 py-10 sm:px-6">
      <AuthPanel mode={mode} next={next} token={token} />
    </div>
  );
}
