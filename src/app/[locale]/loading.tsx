export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-10 sm:px-6 sm:py-14" aria-busy="true">
      <div className="bg-muted h-8 w-56 animate-pulse rounded-lg" />
      <div className="bg-muted mt-3 h-4 w-80 max-w-full animate-pulse rounded" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="border-border bg-card h-40 animate-pulse rounded-2xl border"
          />
        ))}
      </div>
    </div>
  );
}
