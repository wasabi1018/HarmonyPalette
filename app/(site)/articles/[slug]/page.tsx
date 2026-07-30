import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BookCopy, BookOpen } from "lucide-react";
import { ArticlePreview } from "@/components/admin/article-preview";
import { ArticleViewTracker } from "@/components/article-view-tracker";
import { OfficialNotice } from "@/components/official-notice";
import {
  getPublishedArticle,
  listRelatedArticles,
} from "@/lib/articles/repository";
import { prepareArticleContent } from "@/lib/articles/publishing";
import { getPublishedArticleSeriesContext } from "@/lib/articles/series-repository";
import {
  SITE_NAME,
  SITE_ORGANIZATION_ID,
  SITE_URL,
  SITE_WEBSITE_ID,
  siteUrl,
} from "@/lib/site-config";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const article = await getPublishedArticle(slug);
    if (!article) return { title: "記事が見つかりません" };
    const title = article.seoTitle || article.title;
    const description = article.seoDescription || article.excerpt || `${article.title}の記事です。`;
    const url = `/articles/${article.slug}`;
    return {
      title,
      description,
      alternates: {
        canonical: url,
        types: {
          "application/rss+xml": "/articles/feed.xml",
          "application/feed+json": "/articles/feed.json",
        },
      },
      openGraph: {
        type: "article",
        title,
        description,
        url,
        publishedTime: article.publishedAt || undefined,
        modifiedTime: article.updatedAt,
        tags: article.tags.map((tag) => tag.name),
        images: article.coverImageUrl ? [article.coverImageUrl] : undefined,
      },
      twitter: {
        card: article.coverImageUrl ? "summary_large_image" : "summary",
        title,
        description,
        images: article.coverImageUrl ? [article.coverImageUrl] : undefined,
      },
    };
  } catch {
    return { title: "記事" };
  }
}

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let article = null;
  try {
    article = await getPublishedArticle(slug);
  } catch {
    article = null;
  }
  if (!article) notFound();
  let relatedArticles: Awaited<ReturnType<typeof listRelatedArticles>> = [];
  let seriesContext: Awaited<ReturnType<typeof getPublishedArticleSeriesContext>> = null;
  try {
    [relatedArticles, seriesContext] = await Promise.all([
      listRelatedArticles(
        article.id,
        article.tags.map((tag) => tag.id),
        3,
        article.destination,
      ),
      getPublishedArticleSeriesContext(article.id).catch(() => null),
    ]);
  } catch {
    relatedArticles = [];
    seriesContext = null;
  }
  const articleUrl = siteUrl(`/articles/${article.slug}`);
  const preparedContent = prepareArticleContent(article.contentHtml);
  const listingUrl = siteUrl(article.destination === "guide" ? "/guide" : "/articles");
  const listingName = article.destination === "guide" ? "初めての方へ" : "記事";
  const breadcrumbItems = [
    { name: "ホーム", url: siteUrl("/") },
    { name: listingName, url: listingUrl },
    ...(seriesContext ? [{
      name: seriesContext.series.title,
      url: siteUrl(`/articles/series/${seriesContext.series.slug}`),
    }] : []),
    { name: article.title, url: articleUrl },
  ];
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${articleUrl}#article`,
        headline: article.seoTitle || article.title,
        description: article.seoDescription || article.excerpt,
        image: article.coverImageUrl ? [article.coverImageUrl] : undefined,
        datePublished: article.publishedAt,
        dateModified: article.updatedAt,
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": articleUrl,
        },
        url: articleUrl,
        inLanguage: "ja-JP",
        author: {
          "@type": "Organization",
          "@id": SITE_ORGANIZATION_ID,
          name: SITE_NAME,
          url: SITE_URL,
        },
        publisher: {
          "@type": "Organization",
          "@id": SITE_ORGANIZATION_ID,
          name: SITE_NAME,
          url: SITE_URL,
          logo: {
            "@type": "ImageObject",
            url: siteUrl("/logo.png"),
            width: 1536,
            height: 1024,
          },
        },
        isPartOf: seriesContext ? {
          "@type": "CreativeWorkSeries",
          name: seriesContext.series.title,
          url: siteUrl(`/articles/series/${seriesContext.series.slug}`),
        } : { "@id": SITE_WEBSITE_ID },
        keywords: article.tags.map((tag) => tag.name).join(", "),
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${articleUrl}#breadcrumb`,
        itemListElement: breadcrumbItems.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.name,
          item: item.url,
        })),
      },
    ],
  };

  return (
    <>
      <ArticleViewTracker slug={article.slug} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <ArticlePreview
        title={article.title}
        excerpt={article.excerpt}
        coverImageUrl={article.coverImageUrl}
        contentHtml={preparedContent.html}
        tags={article.tags}
        publishedAt={article.publishedAt || article.updatedAt}
        headings={preparedContent.headings}
        readingTimeMinutes={preparedContent.readingTimeMinutes}
        articleUrl={articleUrl}
      />
      <div className="article-print-hidden mx-auto max-w-[920px] px-4 pb-12 sm:px-7">
        {seriesContext && (
          <section className="mb-10 rounded-[24px] border border-pink/15 bg-white p-5 shadow-soft sm:p-6">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-pink/[0.08] text-pink">
                <BookCopy size={18} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-black tracking-[0.14em] text-pink">
                  SERIES {seriesContext.seriesOrder ? `#${seriesContext.seriesOrder}` : ""}
                </p>
                <Link
                  href={`/articles/series/${seriesContext.series.slug}`}
                  className="mt-1 inline-flex font-display text-[21px] font-semibold text-ink hover:text-pink"
                >
                  {seriesContext.series.title}
                </Link>
                {seriesContext.series.description && (
                  <p className="mt-2 text-[11px] font-bold leading-5 text-ink/45">
                    {seriesContext.series.description}
                  </p>
                )}
              </div>
            </div>
            {(seriesContext.previous || seriesContext.next) && (
              <div className="mt-5 grid gap-2 border-t border-pink/10 pt-4 sm:grid-cols-2">
                {seriesContext.previous ? (
                  <Link
                    href={`/articles/${seriesContext.previous.article.slug}`}
                    className="rounded-xl border border-ink/[0.07] px-3 py-3 text-[10px] font-black leading-5 text-ink/55 hover:border-pink/20 hover:text-pink"
                  >
                    <span className="block text-[8px] text-ink/30">← 前の記事</span>
                    {seriesContext.previous.article.title}
                  </Link>
                ) : <span />}
                {seriesContext.next && (
                  <Link
                    href={`/articles/${seriesContext.next.article.slug}`}
                    className="rounded-xl border border-ink/[0.07] px-3 py-3 text-right text-[10px] font-black leading-5 text-ink/55 hover:border-pink/20 hover:text-pink"
                  >
                    <span className="block text-[8px] text-ink/30">次の記事 →</span>
                    {seriesContext.next.article.title}
                  </Link>
                )}
              </div>
            )}
          </section>
        )}
        {relatedArticles.length > 0 && (
          <section className="mb-10 border-t border-pink/10 pt-9">
            <p className="text-[9px] font-black tracking-[0.16em] text-pink">RELATED ARTICLES</p>
            <h2 className="mt-2 font-display text-[24px] font-semibold text-ink">あわせて読みたい記事</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {relatedArticles.map((related) => (
                <Link
                  key={related.id}
                  href={`/articles/${related.slug}`}
                  className="group overflow-hidden rounded-2xl border border-pink/10 bg-white shadow-soft transition hover:-translate-y-0.5 hover:border-pink/25"
                >
                  <div className="aspect-[16/9] overflow-hidden bg-pink/[0.05]">
                    {related.coverImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={related.coverImageUrl}
                        alt={`${related.title}のアイキャッチ画像`}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <span className="grid h-full place-items-center text-pink/35"><BookOpen size={24} /></span>
                    )}
                  </div>
                  <span className="block p-4">
                    <strong className="line-clamp-2 block text-[12px] font-black leading-6 text-ink group-hover:text-pink">
                      {related.title}
                    </strong>
                    <span className="mt-3 inline-flex items-center gap-1 text-[9px] font-black text-pink">
                      続きを読む
                      <ArrowRight size={11} />
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
        <OfficialNotice />
        <Link
          href={article.destination === "guide" ? "/guide" : "/articles"}
          className="mt-7 inline-flex items-center gap-2 text-[12px] font-black text-pink hover:underline"
        >
          <ArrowLeft size={15} />
          {article.destination === "guide" ? "初めての方へ戻る" : "記事一覧へ戻る"}
        </Link>
      </div>
    </>
  );
}
