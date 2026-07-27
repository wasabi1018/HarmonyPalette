import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleEditor } from "@/components/admin/article-editor";
import {
  getAdminArticle,
  listTags,
} from "@/lib/articles/repository";
import { isUuid } from "@/lib/articles/validation";

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
    const [article, tags] = await Promise.all([getAdminArticle(id), listTags()]);
    if (!article) notFound();
    return <ArticleEditor initialArticle={article} availableTags={tags} />;
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
