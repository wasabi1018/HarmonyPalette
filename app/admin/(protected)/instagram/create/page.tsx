import type { Metadata } from "next";
import { InstagramPageHeading, InstagramToolDirectory } from "@/components/admin/instagram-workspace";

export const metadata: Metadata = { title: "Instagram作成ツール" };
export default function InstagramCreatePage() {
  return <><InstagramPageHeading title="作成ツール" description="画像の種類を選ぶと、そのツールの編集画面を開きます。" /><InstagramToolDirectory /></>;
}
