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

/** Landing page skeleton with the hero, sector cards, and category grid. */
export function LandingPageSkeleton() {
  return (
    <div
      className="mx-auto flex w-full max-w-360 flex-col gap-12 px-4 py-10 sm:px-6 sm:py-14"
      aria-busy="true"
    >
      <section className="grid gap-8 rounded-[2rem] border p-6 sm:p-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-12 w-full max-w-xl" />
          <Skeleton className="h-5 w-full max-w-lg" />
          <Skeleton className="mt-3 h-11 w-40 rounded-lg" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="flex min-h-44 flex-col gap-4 rounded-2xl border p-5">
              <Skeleton className="size-9 rounded-lg" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      </section>
      <section className="flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="flex flex-col gap-3 rounded-2xl border p-5">
              <Skeleton className="size-10 rounded-xl" />
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

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

/** Marketplace detail skeleton: listing content beside its request form. */
export function ListingDetailSkeleton() {
  return (
    <div
      className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]"
      aria-busy="true"
    >
      <div className="flex flex-col gap-6">
        <Skeleton className="h-5 w-28" />
        <div className="overflow-hidden rounded-2xl border">
          <Skeleton className="aspect-video w-full rounded-none" />
          <div className="flex flex-col gap-4 p-6">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-52" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-9 w-40 rounded-lg" />
          </div>
        </div>
        <div className="flex flex-col gap-3 rounded-2xl border p-6">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
      <div className="h-fit rounded-2xl border p-6 lg:sticky lg:top-24">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="mt-3 h-4 w-full" />
        <div className="mt-6 flex flex-col gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex flex-col gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ))}
          <Skeleton className="h-11 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

/** Provider storefront skeleton with a cover, profile header, and listing cards. */
export function ProviderProfileSkeleton() {
  return (
    <div
      className="mx-auto flex w-full max-w-6xl flex-col gap-7 px-4 py-8 sm:px-6"
      aria-busy="true"
    >
      <Skeleton className="h-5 w-28" />
      <div className="overflow-hidden rounded-2xl border">
        <Skeleton className="h-40 w-full rounded-none sm:h-56" />
        <div className="flex flex-col gap-5 p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="size-20 shrink-0 rounded-full" />
            <Skeleton className="h-9 w-56 max-w-full" />
          </div>
          <Skeleton className="h-4 w-64 max-w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
      <section className="flex flex-col gap-4">
        <Skeleton className="h-6 w-52" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex flex-col gap-3 overflow-hidden rounded-2xl border p-4">
              <Skeleton className="-mx-4 -mt-4 aspect-video rounded-none" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      </section>
      <section className="flex flex-col gap-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </section>
    </div>
  );
}

/** Form-oriented loading state for creating a project. */
export function ProjectFormSkeleton() {
  return (
    <div
      className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6"
      aria-busy="true"
    >
      <Skeleton className="h-5 w-32" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-9 w-60" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <div className="flex flex-col gap-5 rounded-2xl border p-5 sm:p-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex flex-col gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton
              className={index === 3 ? "h-24 w-full rounded-lg" : "h-10 w-full rounded-lg"}
            />
          </div>
        ))}
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>
    </div>
  );
}

/** Project workspace loading state with its summary and stacked workflow sections. */
export function ProjectDetailSkeleton() {
  return (
    <div
      className="mx-auto flex w-full max-w-6xl flex-col gap-7 px-4 py-8 sm:px-6"
      aria-busy="true"
    >
      <Skeleton className="h-5 w-32" />
      <div className="flex flex-col gap-4 rounded-2xl border p-6">
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
      {[2, 2, 3, 2].map((count, section) => (
        <section key={section} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full max-w-lg" />
          </div>
          {Array.from({ length: count }).map((_, index) => (
            <div key={index} className="flex flex-col gap-3 rounded-2xl border p-5">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

/** Customer agriculture request loading state. */
export function AgricultureRequestSkeleton() {
  return (
    <div
      className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6"
      aria-busy="true"
    >
      <Skeleton className="h-5 w-40" />
      <div className="flex flex-col gap-5 rounded-2xl border p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-4">
          <Skeleton className="size-12 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-7 w-24 rounded-full" />
        </div>
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-5 w-40" />
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-16 w-full rounded-lg" />
          ))}
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

/** Grid page skeleton with filter bar for marketplaces and catalog discovery */
export function GridPageSkeleton() {
  return (
    <div
      className="mx-auto flex w-full max-w-360 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10"
      aria-busy="true"
    >
      <Skeleton className="h-5 w-36" />
      <header className="flex flex-col gap-3 rounded-3xl border p-6 sm:p-9">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-9 w-64 max-w-full rounded-lg" />
        <Skeleton className="h-4 w-full max-w-3xl" />
      </header>
      <div className="grid gap-3 rounded-2xl border p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-10 rounded-lg lg:col-span-2" />
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-10 rounded-lg" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex flex-col gap-3 overflow-hidden rounded-2xl border p-4">
            <Skeleton className="-mx-4 -mt-4 aspect-video rounded-none" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <div className="mt-1 flex items-center justify-between gap-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-8 w-20 rounded-lg" />
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

/** Agriculture landing skeleton follows its hero, marketplace, and service sections. */
export function AgricultureHomeSkeleton() {
  return (
    <div
      className="mx-auto flex w-full max-w-360 flex-col gap-14 px-4 py-8 sm:px-6 sm:py-12"
      aria-busy="true"
    >
      <section className="grid gap-8 rounded-[2rem] border p-6 sm:p-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-10 w-36 rounded-xl" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-11 w-full max-w-2xl" />
          <Skeleton className="h-5 w-full max-w-xl" />
          <Skeleton className="mt-3 h-11 w-44 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={index}
              className="flex min-h-36 flex-col justify-between rounded-2xl border p-5"
            >
              <Skeleton className="size-10 rounded-full" />
              <div className="flex flex-col gap-2">
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-4 w-28" />
              </div>
            </div>
          ))}
        </div>
      </section>
      {[3, 6].map((count, sectionIndex) => (
        <section key={sectionIndex} className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-full max-w-2xl" />
          </div>
          {sectionIndex === 1 && (
            <div className="grid gap-3 rounded-2xl border p-4 sm:grid-cols-[minmax(0,1fr)_240px]">
              <Skeleton className="h-10 rounded-lg" />
              <Skeleton className="h-10 rounded-lg" />
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: count }).map((_, index) => (
              <div key={index} className="flex flex-col gap-3 rounded-2xl border p-4">
                <Skeleton className="aspect-video w-full rounded-xl" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        </section>
      ))}
      <div className="grid gap-4 rounded-3xl border p-6 sm:grid-cols-2">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
    </div>
  );
}
