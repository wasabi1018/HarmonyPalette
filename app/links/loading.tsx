import Image from "next/image";

function SkeletonBlock({ className }: { className: string }) {
  return <div aria-hidden="true" className={`motion-safe:animate-pulse bg-pink/[0.08] ${className}`} />;
}

export default function LinksLoading() {
  return (
    <div
      className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-[#fff8fb] text-ink"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">リンクページを読み込んでいます</span>

      <header className="flex h-14 shrink-0 items-center border-b border-pink/10 bg-white/95 px-4 sm:h-16 sm:px-6">
        <div className="relative h-10 w-[156px] sm:w-[180px]">
          <Image
            src="/logo-compact.png"
            alt="Harmony Palette"
            fill
            priority
            className="object-contain object-left"
            sizes="(max-width: 639px) 156px, 180px"
          />
        </div>
      </header>

      <main className="mx-auto flex min-h-0 w-full max-w-[540px] flex-1 flex-col px-4 py-[clamp(10px,2.2dvh,20px)] sm:px-6">
        <div className="flex flex-col items-center">
          <SkeletonBlock className="h-3 w-28 rounded-full" />
          <SkeletonBlock className="mt-3 h-8 w-64 max-w-full rounded-xl" />
          <SkeletonBlock className="mt-3 h-3 w-4/5 rounded-full" />
        </div>

        <div className="mt-[clamp(8px,2dvh,16px)] grid gap-[clamp(6px,1.2dvh,10px)]">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="flex min-h-[clamp(58px,9dvh,76px)] items-center gap-3 rounded-[20px] border border-pink/15 bg-white px-3.5 shadow-soft">
              <SkeletonBlock className="h-10 w-10 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1">
                <SkeletonBlock className="h-4 w-2/3 rounded-lg" />
                <SkeletonBlock className="mt-2 h-2.5 w-4/5 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
