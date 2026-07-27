import type { Metadata } from "next";
import { ArticleEditor } from "@/components/admin/article-editor";
import { listTags } from "@/lib/articles/repository";

export const metadata: Metadata = {
  title: "記事を新規作成",
  description: "リッチエディターで新しい記事を作成します。",
};

export const dynamic = "force-dynamic";

export default async function NewArticlePage() {
  let setupError = "";
  let tags: Awaited<ReturnType<typeof listTags>> = [];
  try {
    tags = await listTags();
  } catch {
    setupError = "保存を有効にするには、Supabaseで最新のarticlesマイグレーションを適用してください。";
  }

  return <ArticleEditor initialArticle={null} availableTags={tags} setupError={setupError} />;
}
