import type { Metadata } from "next";
import Link from "next/link";
import { RakutenPrManager } from "@/components/admin/rakuten-pr-manager";
import { getRakutenSettingsStatus } from "@/lib/rakuten-settings";
import { getRakutenPrPlacement } from "@/lib/rakuten-pr-settings";
import { getRakutenPrProducts } from "@/lib/rakuten-pr-data";
import { createDefaultRakutenPrPlacement, RAKUTEN_PR_PLACEMENTS } from "@/lib/rakuten-pr";
import { emptyRakutenStatus, RakutenSettingsError } from "@/lib/rakuten-settings-input";

export const metadata: Metadata = { title: "楽天PR管理" };
export const dynamic = "force-dynamic";

export default async function AdminRakutenPrPage() {
  let placements = RAKUTEN_PR_PLACEMENTS.map(createDefaultRakutenPrPlacement);
  let apiStatus = emptyRakutenStatus;
  let setupError = "";
  try {
    [placements, apiStatus] = await Promise.all([
      Promise.all(RAKUTEN_PR_PLACEMENTS.map(getRakutenPrPlacement)), getRakutenSettingsStatus(),
    ]);
  } catch (error) {
    setupError = error instanceof RakutenSettingsError ? error.message : "楽天PRの掲載内容を取得できませんでした。再読み込みしてください。";
  }
  const { products, productError } = await getRakutenPrProducts(placements);
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <nav aria-label="パンくずリスト" className="mb-3 text-[13px] text-ink/65"><Link href="/admin" className="hover:text-pink">管理トップ</Link> / 楽天PR管理</nav>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-[28px] font-black text-ink">楽天PR管理</h1><p className="mt-2 text-sm leading-6 text-ink/65">掲載場所ごとに、紹介する商品・見出し・表示設定を管理します。</p></div>
        <Link href="/admin/rakuten" className="inline-flex min-h-11 items-center rounded-xl border border-pink/20 bg-white px-4 text-sm font-bold text-[#b43e68]">楽天API設定</Link>
      </div>
      <RakutenPrManager definitions={RAKUTEN_PR_PLACEMENTS} initialPlacements={placements} initialProducts={products} apiStatus={apiStatus} setupError={setupError} initialProductError={productError} />
    </div>
  );
}
