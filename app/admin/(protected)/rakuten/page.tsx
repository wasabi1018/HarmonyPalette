import type { Metadata } from "next";
import Link from "next/link";
import { RakutenSettingsForm } from "@/components/admin/rakuten-settings-form";
import { getRakutenSettingsStatus } from "@/lib/rakuten-settings";
import { getRakutenSiteOrigin } from "@/lib/rakuten-api";
import { emptyRakutenStatus, RakutenSettingsError } from "@/lib/rakuten-settings-input";

export const metadata: Metadata = { title: "楽天API設定" };
export const dynamic = "force-dynamic";

export default async function AdminRakutenPage() {
  let status = emptyRakutenStatus;
  let setupError = "";
  try { status = await getRakutenSettingsStatus(); }
  catch (error) { setupError = error instanceof RakutenSettingsError ? error.message : "楽天API設定を取得できませんでした。再読み込みしてください。"; }
  return (
    <div className="mx-auto max-w-[1000px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <nav aria-label="パンくずリスト" className="mb-3 text-[13px] text-ink/65"><Link href="/admin" className="hover:text-pink">管理トップ</Link> / 楽天API設定</nav>
      <h1 className="text-[28px] font-black text-ink">楽天API設定</h1>
      <p className="mb-6 mt-2 text-sm leading-6 text-ink/65">商品や宿泊施設の紹介に使う楽天APIの接続情報を登録します。</p>
      <Link href="/admin/rakuten-pr" className="mb-5 inline-flex min-h-11 items-center rounded-xl border border-pink/20 bg-white px-4 text-sm font-bold text-[#b43e68]">楽天PRの商品・掲載内容を管理</Link>
      <RakutenSettingsForm initialStatus={status} siteOrigin={getRakutenSiteOrigin()} setupError={setupError} />
    </div>
  );
}
