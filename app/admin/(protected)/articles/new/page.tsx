import type { Metadata } from "next";
import { ArticleEditor } from "@/components/admin/article-editor";
import { listArticleMedia } from "@/lib/articles/media-repository";
import { listTags } from "@/lib/articles/repository";

export const metadata: Metadata = {
  title: "記事を新規作成",
  description: "リッチエディターで新しい記事を作成します。",
};

export const dynamic = "force-dynamic";

export default async function NewArticlePage() {
  let setupError = "";
  let tags: Awaited<ReturnType<typeof listTags>> = [];
  let media: Awaited<ReturnType<typeof listArticleMedia>> = [];
  const [tagsResult, mediaResult] = await Promise.allSettled([
    listTags(),
    listArticleMedia(),
  ]);
  if (tagsResult.status === "fulfilled") {
    tags = tagsResult.value;
  } else {
    setupError = "保存を有効にするには、Supabaseで最新のarticlesマイグレーションを適用してください。";
  }
  if (mediaResult.status === "fulfilled") media = mediaResult.value;

  return (
    <ArticleEditor
      initialArticle={null}
      availableTags={tags}
      initialMedia={media}
      setupError={setupError}
    />
  );
}
