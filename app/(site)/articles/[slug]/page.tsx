import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import { ArticlePreview } from "@/components/admin/article-preview";
import { ArticleViewTracker } from "@/components/article-view-tracker";
import { OfficialNotice } from "@/components/official-notice";
import {
  getPublishedArticle,
  listRelatedArticles,
} from "@/lib/articles/repository";
import { prepareArticleContent } from "@/lib/articles/publishing";

export const dynamic = "force-dynamic";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://harmony-palette.example")
  .replace(/\/+$/, "");

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
  try {
    relatedArticles = await listRelatedArticles(
      article.id,
      article.tags.map((tag) => tag.id),
      3,
    );
  } catch {
    relatedArticles = [];
  }
  const articleUrl = `${siteUrl}/articles/${article.slug}`;
  const preparedContent = prepareArticleContent(article.contentHtml);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.seoTitle || article.title,
    description: article.seoDescription || article.excerpt,
    image: article.coverImageUrl ? [article.coverImageUrl] : undefined,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    mainEntityOfPage: articleUrl,
    url: articleUrl,
    publisher: {
      "@type": "Organization",
      name: "Harmony Palette",
      url: siteUrl,
    },
    keywords: article.tags.map((tag) => tag.name).join(", "),
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
        <Link href="/articles" className="mt-7 inline-flex items-center gap-2 text-[12px] font-black text-pink hover:underline">
          <ArrowLeft size={15} />
          記事一覧へ戻る
        </Link>
      </div>
    </>
  );
}
