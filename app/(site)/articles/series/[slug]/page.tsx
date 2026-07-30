import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BookCopy, BookOpen, CalendarDays } from "lucide-react";
import { OfficialNotice } from "@/components/official-notice";
import { getPublishedArticleSeries } from "@/lib/articles/series-repository";
import { siteUrl } from "@/lib/site-config";

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const context = await getPublishedArticleSeries(slug);
    if (!context) return { title: "シリーズが見つかりません" };
    return {
      title: context.series.title,
      description: context.series.description || `${context.series.title}の記事シリーズです。`,
      alternates: { canonical: `/articles/series/${context.series.slug}` },
    };
  } catch {
    return { title: "記事シリーズ" };
  }
}

export default async function ArticleSeriesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let context: Awaited<ReturnType<typeof getPublishedArticleSeries>> = null;
  try {
    context = await getPublishedArticleSeries(slug);
  } catch {
    context = null;
  }
  if (!context) notFound();
  const seriesUrl = siteUrl(`/articles/series/${context.series.slug}`);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": `${seriesUrl}#breadcrumb`,
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "ホーム", item: siteUrl("/") },
      { "@type": "ListItem", position: 2, name: "記事", item: siteUrl("/articles") },
      { "@type": "ListItem", position: 3, name: context.series.title, item: seriesUrl },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <div className="mx-auto max-w-[1040px] px-4 py-9 sm:px-6 lg:px-8 lg:py-12">
        <div className="rounded-[28px] border border-pink/10 bg-white px-5 py-8 text-center shadow-soft sm:px-8 sm:py-10">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-pink/[0.08] text-pink">
          <BookCopy size={22} aria-hidden="true" />
        </span>
        <p className="mt-4 text-[9px] font-black tracking-[0.18em] text-pink">ARTICLE SERIES</p>
        <h1 className="mt-2 font-display text-[30px] font-semibold text-ink sm:text-[38px]">
          {context.series.title}
        </h1>
        {context.series.description && (
          <p className="mx-auto mt-3 max-w-[680px] text-[12px] font-bold leading-6 text-ink/50">
            {context.series.description}
          </p>
        )}
        <p className="mt-4 text-[9px] font-black text-ink/30">{context.articles.length}記事</p>
        </div>

        <ol className="mt-7 space-y-4">
          {context.articles.map(({ article, seriesOrder }, index) => (
            <li key={article.id}>
            <Link
              href={`/articles/${article.slug}`}
              className="group grid overflow-hidden rounded-[22px] border border-pink/10 bg-white shadow-soft transition hover:-translate-y-0.5 hover:border-pink/25 sm:grid-cols-[220px_minmax(0,1fr)]"
            >
              <div className="aspect-[16/8] overflow-hidden bg-pink/[0.05] sm:aspect-auto">
                {article.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={article.coverImageUrl}
                    alt={`${article.title}のアイキャッチ画像`}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                  />
                ) : (
                  <span className="grid h-full min-h-28 place-items-center text-pink/35">
                    <BookOpen size={28} />
                  </span>
                )}
              </div>
              <span className="flex min-w-0 items-center gap-4 p-5 sm:p-6">
                <span className="font-display text-[28px] font-semibold text-pink/35">
                  {String(seriesOrder || index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block font-display text-[19px] font-semibold leading-7 text-ink group-hover:text-pink">
                    {article.title}
                  </strong>
                  {article.excerpt && (
                    <span className="mt-2 line-clamp-2 block text-[11px] font-bold leading-5 text-ink/45">
                      {article.excerpt}
                    </span>
                  )}
                  <span className="mt-3 inline-flex items-center gap-2 text-[9px] font-bold text-ink/30">
                    <CalendarDays size={12} />
                    {formatDate(article.publishedAt)}
                  </span>
                </span>
                <ArrowRight size={17} className="shrink-0 text-pink transition group-hover:translate-x-1" />
              </span>
            </Link>
            </li>
          ))}
        </ol>

        <div className="mt-9"><OfficialNotice /></div>
        <Link href="/articles" className="mt-7 inline-flex items-center gap-2 text-[11px] font-black text-pink hover:underline">
          <ArrowLeft size={14} />
          記事一覧へ戻る
        </Link>
      </div>
    </>
  );
}
