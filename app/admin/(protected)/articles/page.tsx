import type { Metadata } from "next";
import { ArticleListManager } from "@/components/admin/article-list-manager";
import {
  listAdminArticles,
  listTags,
} from "@/lib/articles/repository";

export const metadata: Metadata = {
  title: "記事管理",
  description: "記事の作成・編集・公開状態を管理します。",
};

export const dynamic = "force-dynamic";

export default async function AdminArticlesPage() {
  let setupError = "";
  let articles: Awaited<ReturnType<typeof listAdminArticles>> = [];
  let tags: Awaited<ReturnType<typeof listTags>> = [];
  try {
    [articles, tags] = await Promise.all([listAdminArticles(), listTags()]);
  } catch {
    setupError = "記事機能を利用するには、Supabaseで最新のarticlesマイグレーションを適用してください。";
  }

  return (
    <ArticleListManager
      initialArticles={articles}
      availableTags={tags}
      setupError={setupError}
    />
  );
}
