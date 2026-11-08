import type { Metadata } from "next";
import { ArticleEditor } from "@/components/admin/article-editor";
import { listArticleMedia } from "@/lib/articles/media-repository";
import { listTags } from "@/lib/articles/repository";
import { listArticleSeries } from "@/lib/articles/series-repository";
import { getGuideEditorOptions } from "@/lib/guides/repository";

export const metadata: Metadata = {
  title: "記事を新規作成",
  description: "リッチエディターで新しい記事を作成します。",
};

export const dynamic = "force-dynamic";

export default async function NewArticlePage({ searchParams }: { searchParams: Promise<{ type?: string; mode?: string; event?: string }> }) {
  const params = await searchParams;
  const guideOptions = await getGuideEditorOptions().catch(() => undefined);
  let setupError = "";
  let tags: Awaited<ReturnType<typeof listTags>> = [];
  let media: Awaited<ReturnType<typeof listArticleMedia>> = [];
  let series: Awaited<ReturnType<typeof listArticleSeries>> = [];
  const [tagsResult, mediaResult, seriesResult] = await Promise.allSettled([
    listTags(),
    listArticleMedia(),
    listArticleSeries(),
  ]);
  if (tagsResult.status === "fulfilled") {
    tags = tagsResult.value;
  } else {
    setupError = "保存を有効にするには、Supabaseで最新のarticlesマイグレーションを適用してください。";
  }
  if (mediaResult.status === "fulfilled") media = mediaResult.value;
  if (seriesResult.status === "fulfilled") series = seriesResult.value;

  return (
    <ArticleEditor
      initialArticle={null}
      guideOptions={guideOptions}
      initialGuide={params.type === "strategy"}
      initialGuideMode={params.mode === "custom" ? "custom" : "event"}
      initialEventKey={params.event || ""}
      availableTags={tags}
      initialMedia={media}
      availableSeries={series}
      setupError={setupError || (params.type === "strategy" && !guideOptions ? "攻略ガイドのマイグレーションと接続設定を確認してください。" : "")}
    />
  );
}
