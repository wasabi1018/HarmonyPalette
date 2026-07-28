import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays } from "lucide-react";
import { OfficialNotice } from "@/components/official-notice";
import { PageIntro } from "@/components/page-intro";
import { listPublishedArticles } from "@/lib/articles/repository";

export const metadata: Metadata = {
  title: "最新記事",
  description: "ハーモニーランドのおでかけ準備や楽しみ方を紹介する記事ページです。",
  alternates: { canonical: "/articles" },
};

export const dynamic = "force-dynamic";

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

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const { tag = "" } = await searchParams;
  let articles: Awaited<ReturnType<typeof listPublishedArticles>> = [];
  let allArticles: Awaited<ReturnType<typeof listPublishedArticles>> = [];
  try {
    allArticles = await listPublishedArticles();
    articles = tag
      ? allArticles.filter((article) => article.tags.some((item) => item.slug === tag))
      : allArticles;
  } catch {
    articles = [];
    allArticles = [];
  }
  const tags = Array.from(new Map(
    allArticles.flatMap((article) => article.tags).map((item) => [item.slug, item]),
  ).values());

  return (
    <div className="mx-auto max-w-[1240px] px-4 pt-8 sm:px-6 lg:px-8 lg:pt-12">
      <PageIntro
        eyebrow="JOURNAL"
        title="おでかけのヒントを読む。"
        description="来園準備や楽しみ方、周辺旅行のヒントを、やさしく読みやすくまとめます。"
        tone="pink"
      />

      {(tags.length > 0 || tag) && (
        <nav aria-label="記事タグ" className="mt-7 flex flex-wrap gap-2">
          <Link
            href="/articles"
            className={`rounded-full px-4 py-2 text-[11px] font-black transition ${
              !tag ? "bg-pink text-white" : "border border-pink/15 bg-white text-ink/50 hover:text-pink"
            }`}
          >
            すべて
          </Link>
          {tags.map((item) => (
            <Link
              key={item.id}
              href={`/articles?tag=${item.slug}`}
              className="rounded-full border px-4 py-2 text-[11px] font-black transition hover:-translate-y-0.5"
              style={{
                color: item.color,
                borderColor: `${item.color}33`,
                backgroundColor: tag === item.slug ? `${item.color}18` : "#fff",
              }}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      )}

      {articles.length > 0 ? (
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {articles.map((article) => (
            <article key={article.id} className="group overflow-hidden rounded-[26px] border border-pink/10 bg-white shadow-soft">
              <Link href={`/articles/${article.slug}`} className="block">
                <div className="aspect-[16/8] overflow-hidden bg-[#fff0f5]">
                  {article.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={article.coverImageUrl}
                      alt={`${article.title}のアイキャッチ画像`}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]"
                    />
                  ) : (
                    <span className="grid h-full place-items-center text-pink/40"><BookOpen size={32} /></span>
                  )}
                </div>
                <div className="p-5 sm:p-6">
                  <div className="flex flex-wrap gap-2">
                    {article.tags.map((item) => (
                      <span
                        key={item.id}
                        className="rounded-full px-2.5 py-1 text-[9px] font-black"
                        style={{ color: item.color, backgroundColor: `${item.color}14` }}
                      >
                        {item.name}
                      </span>
                    ))}
                  </div>
                  <h2 className="mt-4 font-display text-[21px] font-semibold leading-8 text-ink transition group-hover:text-pink">
                    {article.title}
                  </h2>
                  {article.excerpt && (
                    <p className="mt-3 line-clamp-2 text-[13px] font-bold leading-6 text-ink/55">{article.excerpt}</p>
                  )}
                  <div className="mt-5 flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 text-[10px] font-bold text-ink/35">
                      <CalendarDays size={13} />
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
        <div className="mt-8 rounded-[26px] border border-pink/10 bg-white px-6 py-16 text-center shadow-soft">
          <BookOpen size={30} className="mx-auto text-pink/35" />
          <h2 className="mt-4 text-[15px] font-black text-ink/55">
            {tag ? "このタグの記事はまだありません" : "公開記事はまだありません"}
          </h2>
          <p className="mt-2 text-[12px] font-bold leading-6 text-ink/40">
            新しいおでかけ情報を準備しています。
          </p>
          {tag && <Link href="/articles" className="mt-4 inline-flex text-[11px] font-black text-pink hover:underline">すべての記事を見る</Link>}
        </div>
      )}

      <div className="mt-10"><OfficialNotice /></div>
    </div>
  );
}
