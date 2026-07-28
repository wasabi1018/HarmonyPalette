import type { Metadata } from "next";
import { ArticleBackupPanel } from "@/components/admin/article-backup-panel";
import {
  getArticleBackupSummary,
  type ArticleBackupSummary,
} from "@/lib/articles/backup";

export const metadata: Metadata = {
  title: "記事バックアップ",
  description: "記事データをJSONまたはCSVで保存します。",
};

export const dynamic = "force-dynamic";

const emptySummary: ArticleBackupSummary = {
  articles: 0,
  tags: 0,
  series: 0,
  revisions: 0,
  media: 0,
  mediaBytes: 0,
};

export default async function AdminBackupPage() {
  try {
    return <ArticleBackupPanel summary={await getArticleBackupSummary()} />;
  } catch {
    return (
      <ArticleBackupPanel
        summary={emptySummary}
        setupError="バックアップを作成するには、Supabaseの接続設定を確認してください。"
      />
    );
  }
}
