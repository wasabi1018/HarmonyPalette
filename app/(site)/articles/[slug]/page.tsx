import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ArticlePreview } from "@/components/admin/article-preview";
import { ArticleViewTracker } from "@/components/article-view-tracker";
import { OfficialNotice } from "@/components/official-notice";
import { getPublishedArticle } from "@/lib/articles/repository";

export const dynamic = "force-dynamic";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://harmony-palette.example";

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
      alternates: { canonical: url },
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
  const articleUrl = `${siteUrl}/articles/${article.slug}`;
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
        contentHtml={article.contentHtml}
        tags={article.tags}
        publishedAt={article.publishedAt || article.updatedAt}
      />
      <div className="mx-auto max-w-[920px] px-4 pb-12 sm:px-7">
        <OfficialNotice />
        <Link href="/articles" className="mt-7 inline-flex items-center gap-2 text-[12px] font-black text-pink hover:underline">
          <ArrowLeft size={15} />
          記事一覧へ戻る
        </Link>
      </div>
    </>
  );
}
