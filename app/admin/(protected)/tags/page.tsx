import type { Metadata } from "next";
import { TagManager } from "@/components/admin/tag-manager";
import { listTags } from "@/lib/articles/repository";

export const metadata: Metadata = {
  title: "タグ管理",
  description: "記事に付けるタグを管理します。",
};

export const dynamic = "force-dynamic";

export default async function AdminTagsPage() {
  let setupError = "";
  let tags: Awaited<ReturnType<typeof listTags>> = [];
  try {
    tags = await listTags();
  } catch {
    setupError = "タグ機能を利用するには、Supabaseで最新のarticlesマイグレーションを適用してください。";
  }

  return <TagManager initialTags={tags} setupError={setupError} />;
}
