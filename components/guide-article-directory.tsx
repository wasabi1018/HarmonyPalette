import Link from "next/link";
import { BookOpen, ChevronRight } from "lucide-react";
import type { ParkGuideCatalog } from "@/lib/park-guides";

export function GuideArticleDirectory({ data }: { data: ParkGuideCatalog }) {
  if (data.preparing) return <p className="rounded-2xl border border-pink/15 bg-white px-4 py-12 text-center font-bold text-ink/65">準備中</p>;
  if (!data.groups.length) return <p className="rounded-2xl border border-pink/15 bg-white px-4 py-10 text-center text-[13px] leading-7 text-ink/65">公開中の攻略ガイドはまだありません。</p>;
  return <div className="space-y-7">{data.groups.map((group) => <section key={group.id} aria-labelledby={`guide-category-${group.id}`}>
    <h2 id={`guide-category-${group.id}`} className="mb-3 text-[17px] font-black text-ink">{group.name}</h2>
    <ul className="divide-y divide-pink/10 overflow-hidden rounded-2xl border border-pink/15 bg-white">{group.guides.map((guide) => guide.articleUrl ? <li key={guide.id}>
      <Link href={guide.articleUrl} className="flex min-h-20 items-center gap-3 p-4 transition-colors hover:bg-[#fff7fa] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pink sm:p-5">
        <BookOpen size={21} className="shrink-0 text-pink" aria-hidden="true" />
        <span className="min-w-0 flex-1"><span className="block break-words text-[15px] font-black leading-6 text-ink [overflow-wrap:anywhere]">{guide.title}</span>{guide.summary && <span className="mt-1 block break-words text-[12px] leading-6 text-ink/65 [overflow-wrap:anywhere]">{guide.summary}</span>}</span>
        <ChevronRight size={18} className="shrink-0 text-pink" aria-hidden="true" />
      </Link>
    </li> : null)}</ul>
  </section>)}</div>;
}
