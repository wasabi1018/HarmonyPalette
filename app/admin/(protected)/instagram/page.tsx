import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, MessageCircle, Settings2 } from "lucide-react";
import { InstagramPageHeading, InstagramToolDirectory } from "@/components/admin/instagram-workspace";

export const metadata: Metadata = { title: "Instagram", description: "投稿・返信素材の作成、コメント連動DM、サイト表示設定を管理します。" };

export default function AdminInstagramPage() {
  return <>
    <InstagramPageHeading title="Instagram" description="作りたい素材や、確認したい機能を選んでください。" />
    <section aria-labelledby="instagram-create-heading"><h2 id="instagram-create-heading" className="mb-4 text-[18px] font-black text-ink">画像・文章を作る</h2><InstagramToolDirectory /></section>
    <div className="mt-7 grid gap-4 md:grid-cols-2">
      {[{ href: "/admin/instagram/dm", title: "コメント連動DMを運用する", description: "キャンペーンの作成・確認、開始・停止、送信状況。", icon: MessageCircle }, { href: "/admin/instagram/settings", title: "サイト表示を設定する", description: "トップページに掲載するInstagram投稿を変更します。", icon: Settings2 }].map(({ href, title, description, icon: Icon }) => <Link key={href} href={href} prefetch={false} className="flex items-center gap-4 rounded-[22px] border border-lavender/20 bg-white p-5 transition hover:border-lavender/40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lavender/20"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-lavender/10 text-lavender"><Icon size={20} aria-hidden="true" /></span><span className="min-w-0 flex-1"><strong className="block text-[14px] font-black text-ink">{title}</strong><span className="mt-1 block text-[12px] leading-6 text-ink/60">{description}</span></span><ChevronRight size={18} className="shrink-0 text-lavender" aria-hidden="true" /></Link>)}
    </div>
  </>;
}
