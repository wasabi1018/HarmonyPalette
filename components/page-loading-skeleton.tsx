function SkeletonBlock({ className }: { className: string }) {
  return <div aria-hidden="true" className={`motion-safe:animate-pulse bg-pink/[0.08] ${className}`} />;
}

export function PageLoadingSkeleton() {
  return (
    <div
      className="mx-auto min-h-[calc(100dvh-4rem)] max-w-[1360px] px-4 pb-14 pt-5 sm:px-6 lg:px-8 lg:pt-8"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">ページを読み込んでいます</span>

      <SkeletonBlock className="h-3 w-28 rounded-full" />

      <section className="mt-3 overflow-hidden rounded-[26px] border border-pink/10 bg-white px-5 py-6 sm:px-8 sm:py-8">
        <SkeletonBlock className="h-3 w-40 rounded-full" />
        <SkeletonBlock className="mt-4 h-9 w-full max-w-xl rounded-xl sm:h-11" />
        <SkeletonBlock className="mt-4 h-3 w-full max-w-2xl rounded-full" />
        <SkeletonBlock className="mt-2 h-3 w-4/5 max-w-xl rounded-full" />
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <section className="rounded-[24px] border border-pink/10 bg-white p-5 shadow-soft lg:col-span-2 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <SkeletonBlock className="h-5 w-36 rounded-lg" />
            <SkeletonBlock className="h-9 w-24 rounded-full" />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="rounded-2xl border border-ink/5 bg-[#fffafd] p-4">
                <SkeletonBlock className="h-3 w-20 rounded-full" />
                <SkeletonBlock className="mt-3 h-5 w-4/5 rounded-lg" />
                <SkeletonBlock className="mt-3 h-3 w-full rounded-full" />
                <SkeletonBlock className="mt-2 h-3 w-2/3 rounded-full" />
              </div>
            ))}
          </div>
        </section>

        <aside className="rounded-[24px] border border-pink/10 bg-white p-5 shadow-soft sm:p-6">
          <SkeletonBlock className="h-5 w-32 rounded-lg" />
          <SkeletonBlock className="mt-5 h-12 w-full rounded-xl" />
          <SkeletonBlock className="mt-3 h-12 w-full rounded-xl" />
          <SkeletonBlock className="mt-3 h-12 w-full rounded-xl" />
        </aside>
      </div>
    </div>
  );
}
