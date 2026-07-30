import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays, Ticket } from "lucide-react";
import { cache } from "react";
import { OfficialNotice } from "@/components/official-notice";
import { PageIntro } from "@/components/page-intro";
import { listPublishedArticles } from "@/lib/articles/repository";

export const dynamic = "force-dynamic";

const loadPublishedGuides = cache(async () => {
  try {
    return await listPublishedArticles({ destination: "guide" });
  } catch {
    return [];
  }
});

export async function generateMetadata(): Promise<Metadata> {
  const guides = await loadPublishedGuides();
  return {
    title: "初めての方へガイド",
    description: "チケット、アクセス、駐車場、子ども連れの回り方など、初めてのハーモニーランドに役立つ情報です。",
    alternates: { canonical: "/guide" },
    robots: guides.length > 0 ? undefined : { index: false, follow: true },
  };
}

function formatDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export default async function GuidePage() {
  const guides = await loadPublishedGuides();

  return (
    <div className="mx-auto max-w-[1240px] px-4 pt-8 sm:px-6 lg:px-8 lg:pt-12">
      <PageIntro
        eyebrow="FIRST VISIT GUIDE"
        title="初めてでも、迷わない。"
        description="チケット、アクセス、駐車場、子ども連れでの回り方など、来園前に知っておきたい情報をまとめています。"
        tone="pink"
      />

      {guides.length > 0 ? (
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {guides.map((article) => (
            <article
              key={article.id}
              className="group overflow-hidden rounded-[26px] border border-[#f4dfae] bg-white shadow-soft transition-all hover:-translate-y-0.5 hover:border-[#e8c979] hover:shadow-card"
            >
              <Link href={`/articles/${article.slug}`} className="block h-full">
                <div className="aspect-[16/8] overflow-hidden bg-[#fffaf0]">
                  {article.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={article.coverImageUrl}
                      alt={`${article.title}のアイキャッチ画像`}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]"
                    />
                  ) : (
                    <span className="grid h-full place-items-center text-[#c58b22]/45">
                      <Ticket size={32} aria-hidden="true" />
                    </span>
                  )}
                </div>
                <div className="p-5 sm:p-6">
                  <div className="flex min-h-5 flex-wrap gap-2">
                    {article.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag.id}
                        className="rounded-full px-2.5 py-1 text-[9px] font-black"
                        style={{ color: tag.color, backgroundColor: `${tag.color}14` }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                  <h2 className="mt-4 font-display text-[21px] font-semibold leading-8 text-ink transition group-hover:text-pink">
                    {article.title}
                  </h2>
                  {article.excerpt && (
                    <p className="mt-3 line-clamp-2 text-[13px] font-bold leading-6 text-ink/55">
                      {article.excerpt}
                    </p>
                  )}
                  <div className="mt-5 flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 text-[10px] font-bold text-ink/35">
                      <CalendarDays size={13} aria-hidden="true" />
                      {formatDate(article.publishedAt)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-pink">
                      続きを読む
                      <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </div>
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-[26px] border border-[#f4dfae] bg-white px-6 py-16 text-center shadow-soft">
          <BookOpen size={30} className="mx-auto text-[#c58b22]/40" aria-hidden="true" />
          <h2 className="mt-4 text-[15px] font-black text-ink/55">現在、表示できるガイド記事はありません。</h2>
          <p className="mt-2 text-[12px] font-bold leading-6 text-ink/40">
            来園前に、公式サイトの最新情報もあわせてご確認ください。
          </p>
        </div>
      )}

      <div className="mt-10">
        <OfficialNotice />
      </div>
    </div>
  );
}
