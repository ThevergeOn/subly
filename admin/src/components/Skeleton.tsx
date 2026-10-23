/** Placeholder shown while a Suspense boundary waits for the database. */
export function Skeleton() {
  return (
    <div className="mt-6 animate-pulse space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl border border-white/10 bg-white/[0.03]" />
        ))}
      </div>
      <div className="h-40 rounded-xl border border-white/10 bg-white/[0.03]" />
    </div>
  );
}
