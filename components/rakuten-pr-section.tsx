import Image from "next/image";
import type { RakutenPrDisplay } from "@/lib/rakuten-pr";

export function RakutenPrSection({ placement, compact = false, twoColumns = false, className = "mx-auto max-w-[1200px] px-4 pt-10 sm:px-6 lg:px-8" }: {
  placement: RakutenPrDisplay | null;
  compact?: boolean;
  twoColumns?: boolean;
  className?: string;
}) {
  if (!placement?.items.length) return null;
  const headingId = `${placement.placementId}-heading`;
  return (
    <section aria-labelledby={headingId} className={className} data-rakuten-placement={placement.placementId}>
      <div className="mb-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h2 id={headingId} className={`max-w-full break-words font-display text-[23px] font-semibold leading-tight tracking-[-0.02em] text-ink [overflow-wrap:anywhere] ${compact ? "" : "sm:text-[27px]"}`}>{placement.title}</h2>
          <span className="rounded-full border border-lavender/35 bg-lavender/[0.04] px-2.5 py-1 text-[11px] font-medium leading-none text-ink/70">広告／PR</span>
        </div>
        {placement.description && <p className={`mt-2 break-words text-[13px] leading-6 text-ink/65 [overflow-wrap:anywhere] ${compact ? "" : "sm:text-sm"}`}>{placement.description}</p>}
      </div>
      <div className={`grid grid-cols-2 gap-2.5 ${compact ? "" : twoColumns ? "sm:gap-4" : "lg:grid-cols-4 lg:gap-4"}`}>
        {placement.items.map((item) => (
          <article key={item.itemCode} className="min-w-0 overflow-hidden rounded-2xl border border-pink/15 bg-white">
            <a href={item.affiliateUrl} target="_blank" rel="nofollow sponsored noopener noreferrer"
              aria-label={`${item.itemName}を楽天市場で見る（新しいタブで開きます）`}
              className="group flex h-full flex-col rounded-2xl p-2.5 outline-none transition-colors hover:bg-pink/[0.025] active:bg-pink/[0.06] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#c94372]">
              <div className="aspect-square w-full overflow-hidden rounded-lg bg-[#faf8f9]">
                <Image src={item.imageUrl} alt={item.itemName} width={128} height={128} unoptimized loading="lazy"
                  className="h-full w-full object-contain" />
              </div>
              <div className="flex flex-1 flex-col pt-2.5">
                <h3 className="line-clamp-2 min-h-[40px] break-words text-[14px] font-bold leading-5 text-ink group-hover:text-[#b43e68]">{item.itemName}</h3>
                <p className={`mt-1 line-clamp-2 min-h-[40px] break-words text-[12px] leading-5 text-ink/65 ${compact ? "" : "sm:text-[13px]"}`}>{item.description}</p>
              </div>
            </a>
          </article>
        ))}
      </div>
      <p className="mt-3 text-[11px] leading-5 text-ink/55"><a href="https://developers.rakuten.com/" target="_blank">Supported by Rakuten Developers</a></p>
    </section>
  );
}
