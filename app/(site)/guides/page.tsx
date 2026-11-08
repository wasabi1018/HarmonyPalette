import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ChevronRight } from "lucide-react";
import { getGuideSettings, listGuideCategories, listPublishedGuideArticles } from "@/lib/guides/repository";
import { groupGuideArticles } from "@/lib/guides/model";
import { cache } from "react";

export const dynamic = "force-dynamic";
const settings = cache(() => getGuideSettings());
export async function generateMetadata(): Promise<Metadata> {
  const { preparing } = await settings();
  return { title: "攻略ガイド", description: "ハーモニーランドのイベントや園内での過ごし方を、対象別の攻略ガイドで紹介します。", alternates: { canonical: "/guides" }, robots: preparing ? { index: false, follow: true } : undefined };
}
export default async function GuidesPage() {
  const { preparing } = await settings();
  let groups: ReturnType<typeof groupGuideArticles> = [];
  let failed = false;
  if (!preparing) {
    try {
      const [categories, articles] = await Promise.all([listGuideCategories(), listPublishedGuideArticles()]);
      groups = groupGuideArticles(categories, articles);
    } catch { failed = true; }
  }
  return <div className="mx-auto max-w-[980px] px-4 pb-12 pt-6 sm:px-6 lg:px-8">
    <nav aria-label="パンくずリスト" className="mb-5 flex items-center gap-2 text-[11px] font-bold text-ink/50"><Link href="/">ホーム</Link><ChevronRight size={12} aria-hidden="true" /><span aria-current="page">攻略ガイド</span></nav>
    <h1 className="flex items-center gap-3 font-display text-[28px] font-semibold text-ink sm:text-[38px]"><BookOpen className="text-pink" aria-hidden="true" />攻略ガイド</h1>
    {preparing ? <section aria-label="攻略ガイドの公開状況" className="mt-7 rounded-[24px] border border-pink/15 bg-white px-5 py-16 text-center shadow-soft"><p className="text-[21px] font-black text-ink/65">準備中</p></section>
      : failed ? <p role="alert" className="mt-7 rounded-2xl bg-white p-6 text-ink/65">攻略ガイドを読み込めませんでした。時間をおいて再度お試しください。</p>
      : groups.length ? <div className="mt-7 space-y-6">{groups.map((group) => <section key={group.id} aria-labelledby={`guide-category-${group.id}`}>
        <h2 id={`guide-category-${group.id}`} className="mb-2 px-1 text-[16px] font-black text-ink">{group.name}</h2>
        <ul className="divide-y divide-pink/10 overflow-hidden rounded-2xl border border-pink/15 bg-white">{group.articles.map((article) => <li key={article.id}><Link href={`/articles/${article.slug}`} className="flex min-h-14 items-center gap-3 p-4 transition-colors hover:bg-pink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pink">
          <BookOpen size={19} className="shrink-0 text-lavender" aria-hidden="true" /><span className="min-w-0 flex-1"><span className="block break-words text-[14px] font-black leading-6 text-ink">{article.title}</span>{article.excerpt && <span className="mt-1 block text-[12px] leading-5 text-ink/55">{article.excerpt}</span>}</span><ChevronRight size={18} className="shrink-0 text-ink/40" aria-hidden="true" />
        </Link></li>)}</ul>
      </section>)}</div> : <p className="mt-7 rounded-2xl bg-white p-6 text-ink/65">公開中の攻略ガイドはまだありません。</p>}
    <Link href="/daily-schedule" className="mt-7 inline-flex min-h-11 items-center text-[13px] font-bold text-pink hover:underline">スケジュールを見る<ChevronRight size={15} aria-hidden="true" /></Link>
  </div>;
}
