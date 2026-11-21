import type { Metadata } from "next";
import { ArticleEditor } from "@/components/admin/article-editor";
import { listArticleMedia } from "@/lib/articles/media-repository";
import { listTags } from "@/lib/articles/repository";
import { listArticleSeries } from "@/lib/articles/series-repository";
import { getGuideEditorOptions } from "@/lib/guides/repository";
import { createStarterGuideDraft } from "@/lib/guides/starter-drafts";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "記事を新規作成",
  description: "リッチエディターで新しい記事を作成します。",
};

export const dynamic = "force-dynamic";

export default async function NewArticlePage({ searchParams }: { searchParams: Promise<{ type?: string; mode?: string; event?: string; template?: string }> }) {
  const params = await searchParams;
  const initialDraft = params.template ? createStarterGuideDraft(params.template) : null;
  let setupError = "";
  let tags: Awaited<ReturnType<typeof listTags>> = [];
  let media: Awaited<ReturnType<typeof listArticleMedia>> = [];
  let series: Awaited<ReturnType<typeof listArticleSeries>> = [];
  const [tagsResult, mediaResult, seriesResult, guideResult] = await Promise.allSettled([
    listTags(),
    listArticleMedia(),
    listArticleSeries(),
    getGuideEditorOptions(),
  ]);
  if (tagsResult.status === "fulfilled") {
    tags = tagsResult.value;
  } else {
    setupError = "保存を有効にするには、Supabaseで最新のarticlesマイグレーションを適用してください。";
  }
  if (mediaResult.status === "fulfilled") media = mediaResult.value;
  if (seriesResult.status === "fulfilled") series = seriesResult.value;
  const guideOptions = guideResult.status === "fulfilled" ? guideResult.value : undefined;
  const eventKey = initialDraft?.guide?.eventKey || params.event || "";
  const existing = guideOptions?.existingGuides.find((guide) => guide.eventKey === eventKey);
  if ((params.type === "strategy" || initialDraft) && eventKey && existing) redirect(`/admin/articles/${existing.id}${params.template ? `?template=${encodeURIComponent(params.template)}` : ""}`);

  return (
    <ArticleEditor
      initialArticle={null}
      key={params.template || `${params.type || "article"}-${eventKey}`}
      initialDraft={initialDraft}
      guideOptions={guideOptions}
      initialGuide={params.type === "strategy" || Boolean(initialDraft)}
      initialGuideMode={params.mode === "custom" ? "custom" : "event"}
      initialEventKey={eventKey}
      availableTags={tags}
      initialMedia={media}
      availableSeries={series}
      setupError={setupError || ((params.type === "strategy" || initialDraft) && !guideOptions ? "攻略ガイドの設定を読み込めませんでした。接続設定を確認してください。" : "")}
    />
  );
}
