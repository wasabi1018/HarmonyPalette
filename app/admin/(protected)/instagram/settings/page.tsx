import type { Metadata } from "next";
import { InstagramEmbedSettingsForm } from "@/components/admin/instagram-embed-settings-form";
import { InstagramPageHeading } from "@/components/admin/instagram-workspace";
import { defaultInstagramPostUrls } from "@/data/instagram-posts";
import { getInstagramEmbedSettings } from "@/lib/instagram-settings";

export const metadata: Metadata = { title: "Instagramサイト表示設定" };
export default async function InstagramSettingsPage() {
  let postUrls = [...defaultInstagramPostUrls] as [string, string];
  let setupError = "";
  try { postUrls = (await getInstagramEmbedSettings()).postUrls; }
  catch (error) { setupError = error instanceof Error ? error.message : "表示設定の取得に失敗しました。"; }
  return <><InstagramPageHeading title="サイト表示設定" description="トップページに掲載するInstagram投稿を設定します。" category="settings" /><InstagramEmbedSettingsForm initialPostUrls={postUrls} setupError={setupError} /></>;
}
