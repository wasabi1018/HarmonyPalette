import type { Metadata } from "next";
import { ArticleTrashManager } from "@/components/admin/article-trash-manager";
import { listTrashedArticles } from "@/lib/articles/repository";

export const metadata: Metadata = {
  title: "記事のゴミ箱",
  description: "削除した記事を復元または完全削除します。",
};

export const dynamic = "force-dynamic";

export default async function ArticleTrashPage() {
  let setupError = "";
  let articles: Awaited<ReturnType<typeof listTrashedArticles>> = [];
  try {
    articles = await listTrashedArticles();
  } catch {
    setupError = "ゴミ箱を利用するには、Supabaseで最新のマイグレーションを適用してください。";
  }
  return <ArticleTrashManager initialArticles={articles} setupError={setupError} />;
}
