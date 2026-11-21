import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import { BookOpen } from "lucide-react";
import { GuideArticleDirectory } from "@/components/guide-article-directory";
import { getPublicGuideCatalog } from "@/lib/guides/repository";
import { PARK_GUIDE_NOTE } from "@/lib/park-guides";

const directoryMetadata: Metadata = {
  title: "攻略ガイド",
  description: "グリーティングやアトラクション、園内の回り方を紹介するハーモニーランドの攻略ガイドです。",
  alternates: { canonical: "/guides" },
};

const loadGuideCatalog = cache(getPublicGuideCatalog);

export async function generateMetadata(): Promise<Metadata> {
  try {
    const data = await loadGuideCatalog();
    return { ...directoryMetadata, robots: { index: !data.preparing && data.groups.some((group) => group.guides.length > 0), follow: true } };
  } catch {
    return { ...directoryMetadata, robots: { index: false, follow: true } };
  }
}

export const dynamic = "force-dynamic";

export default async function GuidesPage() {
  let data;
  try { data = await loadGuideCatalog(); }
  catch { return <div role="alert" className="mx-auto max-w-[860px] px-4 py-12"><h1 className="text-2xl font-black">攻略ガイド</h1><p className="mt-4 text-sm leading-7">攻略ガイドを読み込めませんでした。時間をおいてもう一度お試しください。</p></div>; }
  return (
    <div className="mx-auto max-w-[860px] px-4 py-8 sm:px-6 sm:py-12">
      <nav aria-label="パンくずリスト" className="mb-5 text-[12px] text-ink/60"><Link href="/" className="hover:text-pink">ホーム</Link><span aria-hidden="true" className="mx-2">›</span><span aria-current="page">攻略ガイド</span></nav>
      <h1 className="flex items-center gap-3 font-display text-[28px] font-semibold text-ink sm:text-[36px]"><BookOpen className="text-pink" aria-hidden="true" />攻略ガイド</h1>
      <p className="mb-6 mt-3 text-[13px] leading-7 text-ink/65">気になるガイドを選んで、詳しい回り方や注意点を確認できます。</p>
      <GuideArticleDirectory data={data} />
      <p className="mt-6 text-[11px] leading-6 text-ink/60">{PARK_GUIDE_NOTE}</p>
    </div>
  );
}
