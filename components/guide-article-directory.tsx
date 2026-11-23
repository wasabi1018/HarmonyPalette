import { ParkGuideContents } from "@/components/park-guide";
import type { ParkGuideCatalog } from "@/lib/park-guides";

export function GuideArticleDirectory({ data }: { data: ParkGuideCatalog }) {
  if (data.preparing) return <p className="rounded-2xl border border-pink/15 bg-white px-4 py-12 text-center font-bold text-ink/65">準備中</p>;
  if (!data.groups.length) return <p className="rounded-2xl border border-pink/15 bg-white px-4 py-10 text-center text-[13px] leading-7 text-ink/65">公開中の攻略ガイドはまだありません。</p>;
  return <div className="space-y-7">{data.groups.map((group) => <section key={group.id} aria-labelledby={`guide-category-${group.id}`}>
    <h2 id={`guide-category-${group.id}`} className="mb-3 text-[17px] font-black text-ink">{group.name}</h2>
    <ParkGuideContents guides={group.guides} />
  </section>)}</div>;
}
