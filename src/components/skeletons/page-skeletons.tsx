import { Skeleton } from "@/components/ui/skeleton";

/** Centered card skeleton for auth flows (login, register, verify, password reset) */
export function CardCenteredSkeleton() {
  return (
    <div className="mx-auto flex min-h-[65vh] w-full max-w-360 items-center justify-center px-4 py-10 sm:px-6">
      <div className="border-border/70 bg-card w-full max-w-md rounded-2xl border p-6 shadow-sm sm:p-8">
        <Skeleton className="mx-auto size-12 rounded-xl" />
        <Skeleton className="mx-auto mt-4 h-7 w-36 rounded-md" />
        <Skeleton className="mx-auto mt-2 h-4 w-52 rounded" />
        <div className="mt-8 space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <Skeleton className="bg-primary/20 h-10 w-full rounded-lg" />
        </div>
        <Skeleton className="mx-auto mt-6 h-4 w-44" />
      </div>
    </div>
  );
}

/** Alias for CardCenteredSkeleton */
export const AuthPageSkeleton = CardCenteredSkeleton;

/** Two-column detail page skeleton for listings, providers, services, and detail entries */
export function DetailPageSkeleton() {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
      <div className="flex flex-col gap-6">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="aspect-16/10 w-full rounded-3xl" />
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-5 w-32" />
          </div>
          <Skeleton className="h-9 w-3/4 rounded-lg" />
          <Skeleton className="h-8 w-44 rounded-lg" />
          <Skeleton className="h-5 w-64" />
        </div>
        <div className="border-border/70 bg-card space-y-3 rounded-2xl border p-6">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
        <div className="border-border/70 bg-card flex items-center gap-4 rounded-2xl border p-6">
          <Skeleton className="size-14 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-60" />
          </div>
        </div>
      </div>
      <div>
        <div className="border-border/70 bg-card sticky top-20 space-y-5 rounded-2xl border p-6 shadow-sm">
          <Skeleton className="h-6 w-44" />
          <div className="space-y-3">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="bg-muted/60 h-14 w-full rounded-xl" />
          </div>
          <Skeleton className="bg-primary/20 h-11 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/** Grid page skeleton with filter bar for marketplaces and catalog discovery */
export function GridPageSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-360 flex-col gap-7 px-4 py-8 sm:px-6">
      <Skeleton className="h-5 w-36" />
      <header className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-64 rounded-lg" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </header>
      <div className="border-border/70 bg-card grid gap-3 rounded-2xl border p-4 sm:grid-cols-2 lg:grid-cols-7">
        <Skeleton className="h-9 rounded-lg lg:col-span-2" />
        <Skeleton className="h-9 rounded-lg" />
        <Skeleton className="h-9 rounded-lg" />
        <Skeleton className="h-9 rounded-lg" />
        <Skeleton className="h-9 rounded-lg" />
        <Skeleton className="h-9 rounded-lg" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="border-border/70 bg-card space-y-3 overflow-hidden rounded-2xl border p-4"
          >
            <Skeleton className="aspect-4/3 w-full rounded-xl" />
            <Skeleton className="h-4 w-20 rounded-full" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="border-border/50 flex items-center justify-between border-t pt-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Workspace skeleton with side navigation and main content sections */
export function WorkspaceSkeleton() {
  return (
    <div className="mx-auto grid w-full max-w-[1600px] gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start lg:gap-8">
      <div className="border-border/70 bg-card hidden flex-col gap-2 rounded-2xl border p-3 lg:flex">
        <Skeleton className="bg-muted/80 h-9 w-full rounded-lg" />
        <Skeleton className="h-9 w-full rounded-lg" />
        <Skeleton className="h-9 w-full rounded-lg" />
        <Skeleton className="h-9 w-full rounded-lg" />
        <Skeleton className="h-9 w-full rounded-lg" />
      </div>
      <main className="flex min-w-0 flex-col gap-7">
        <div className="border-border/70 bg-card space-y-4 rounded-2xl border p-6">
          <Skeleton className="h-7 w-48 rounded-lg" />
          <Skeleton className="h-4 w-80 max-w-full" />
          <div className="grid gap-3 pt-2 sm:grid-cols-3">
            <Skeleton className="bg-muted/60 h-20 rounded-xl" />
            <Skeleton className="bg-muted/60 h-20 rounded-xl" />
            <Skeleton className="bg-muted/60 h-20 rounded-xl" />
          </div>
        </div>
        <div className="border-border/70 bg-card space-y-4 rounded-2xl border p-6">
          <Skeleton className="h-6 w-36" />
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        </div>
      </main>
    </div>
  );
}
