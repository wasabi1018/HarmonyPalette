import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleEditor } from "@/components/admin/article-editor";
import { listArticleMedia } from "@/lib/articles/media-repository";
import {
  getAdminArticle,
  listArticleRevisions,
  listTags,
} from "@/lib/articles/repository";
import { isUuid } from "@/lib/articles/validation";
import {
  getAdminArticleSeriesAssignment,
  listArticleSeries,
} from "@/lib/articles/series-repository";

export const metadata: Metadata = {
  title: "記事を編集",
  description: "記事の本文と公開設定を編集します。",
};

export const dynamic = "force-dynamic";

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  try {
    const [article, tags, revisions, media, series, assignment] = await Promise.all([
      getAdminArticle(id),
      listTags(),
      listArticleRevisions(id),
      listArticleMedia().catch(() => []),
      listArticleSeries().catch(() => []),
      getAdminArticleSeriesAssignment(id).catch(() => ({
        seriesId: null,
        seriesOrder: null,
      })),
    ]);
    if (!article) notFound();
    return (
      <ArticleEditor
        initialArticle={article}
        availableTags={tags}
        initialRevisions={revisions}
        initialMedia={media}
        availableSeries={series}
        initialSeriesId={assignment.seriesId}
        initialSeriesOrder={assignment.seriesOrder}
      />
    );
  } catch {
    return (
      <ArticleEditor
        initialArticle={null}
        availableTags={[]}
        setupError="記事を読み込めませんでした。Supabaseのarticlesマイグレーションと接続設定を確認してください。"
      />
    );
  }
}
