import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ArticlePreview } from "@/components/admin/article-preview";
import { OfficialNotice } from "@/components/official-notice";
import { getPublishedArticle } from "@/lib/articles/repository";

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
    return {
      title: article.title,
      description: article.excerpt || `${article.title}の記事です。`,
      alternates: { canonical: `/articles/${article.slug}` },
      openGraph: article.coverImageUrl ? { images: [article.coverImageUrl] } : undefined,
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

  return (
    <>
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
