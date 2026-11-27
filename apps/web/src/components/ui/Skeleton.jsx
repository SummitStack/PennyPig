/** Grey placeholder shapes shown while a page's data is still loading. */
export function SkeletonBlock({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-surface-container ${className}`} aria-hidden="true" />
}

/**
 * A page-shaped placeholder: a title, a hero card, a row of stats and a list.
 * Close enough to every page that the layout doesn't jump when data lands.
 */
export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-5" role="status" aria-label="Loading your data" data-testid="page-skeleton">
      <div className="flex flex-col gap-2">
        <SkeletonBlock className="h-3 w-24" />
        <SkeletonBlock className="h-8 w-56" />
      </div>
      <SkeletonBlock className="h-28 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <SkeletonBlock key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <div className="card flex flex-col gap-4 p-5 sm:p-6">
        <SkeletonBlock className="h-5 w-40" />
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <SkeletonBlock className="h-4 w-1/3" />
            <SkeletonBlock className="h-4 w-20" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading your data</span>
    </div>
  )
}

/** Full-screen splash while we find out who is signed in. */
export function SplashScreen() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-surface" role="status" data-testid="splash">
      <div className="animate-pulse">
        <span
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-secondary to-secondary/70 text-[32px] text-white shadow-card"
          aria-hidden="true"
        >
          <span className="material-symbols-rounded" style={{ fontVariationSettings: "'FILL' 1, 'wght' 600" }}>
            savings
          </span>
        </span>
      </div>
      <span className="sr-only">Loading</span>
    </div>
  )
}
