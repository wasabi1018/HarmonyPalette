import type { Metadata } from "next";
import { MediaManager } from "@/components/admin/media-manager";
import { listArticleMedia } from "@/lib/articles/media-repository";

export const metadata: Metadata = {
  title: "メディア",
  description: "記事で使用する画像と代替テキストを管理します。",
};

export const dynamic = "force-dynamic";

export default async function AdminMediaPage() {
  let setupError = "";
  let media: Awaited<ReturnType<typeof listArticleMedia>> = [];
  try {
    media = await listArticleMedia();
  } catch {
    setupError = "メディア機能を利用するには、Supabaseで最新のマイグレーションを適用してください。";
  }
  return <MediaManager initialMedia={media} setupError={setupError} />;
}
