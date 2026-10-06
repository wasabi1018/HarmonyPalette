import type { Metadata } from "next";
import Link from "next/link";
import { RakutenPrManager } from "@/components/admin/rakuten-pr-manager";
import { getRakutenSettingsStatus } from "@/lib/rakuten-settings";
import { getRakutenPrPlacement } from "@/lib/rakuten-pr-settings";
import { getRakutenPrProducts } from "@/lib/rakuten-pr-data";
import { createDefaultRakutenPrPlacement, RAKUTEN_PR_PLACEMENTS } from "@/lib/rakuten-pr";
import { emptyRakutenStatus, RakutenSettingsError } from "@/lib/rakuten-settings-input";
import { RakutenBannerManager } from "@/components/admin/rakuten-banner-manager";
import { createDefaultRakutenBanner, RAKUTEN_BANNER_PLACEMENTS } from "@/lib/rakuten-banner";
import { getRakutenBanner } from "@/lib/rakuten-banner-settings";

export const metadata: Metadata = { title: "楽天PR管理" };
export const dynamic = "force-dynamic";

async function ProductsEditor() {
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
  return <RakutenPrManager definitions={RAKUTEN_PR_PLACEMENTS} initialPlacements={placements} initialProducts={products} apiStatus={apiStatus} setupError={setupError} initialProductError={productError} />;
}

async function BannersEditor() {
  let banners = RAKUTEN_BANNER_PLACEMENTS.map(createDefaultRakutenBanner);
  let setupError = "";
  try { banners = await Promise.all(RAKUTEN_BANNER_PLACEMENTS.map(getRakutenBanner)); }
  catch (error) { setupError = error instanceof RakutenSettingsError ? error.message : "バナーの掲載内容を取得できませんでした。再読み込みしてください。"; }
  return <RakutenBannerManager definitions={RAKUTEN_BANNER_PLACEMENTS} initialBanners={banners} setupError={setupError} />;
}

export default async function AdminRakutenPrPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const bannerMode = (await searchParams).type === "banner";
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <nav aria-label="パンくずリスト" className="mb-3 text-[13px] text-ink/65"><Link href="/admin" className="hover:text-pink">管理トップ</Link> / 楽天PR管理</nav>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-[28px] font-black text-ink">楽天PR管理</h1><p className="mt-2 text-sm leading-6 text-ink/65">掲載場所ごとに、商品紹介・バナー・表示設定を管理します。</p></div>
        <Link href="/admin/rakuten" className="inline-flex min-h-11 items-center rounded-xl border border-pink/20 bg-white px-4 text-sm font-bold text-[#b43e68]">楽天API設定</Link>
      </div>
      <nav aria-label="楽天PRの種類" className="mb-5 flex gap-2">
        {[{ href: "/admin/rakuten-pr", label: "商品紹介", selected: !bannerMode }, { href: "/admin/rakuten-pr?type=banner", label: "バナー", selected: bannerMode }].map((tab) => (
          <a key={tab.href} href={tab.href} aria-current={tab.selected ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded-xl border px-5 text-sm font-bold ${tab.selected ? "border-[#c94372] bg-[#c94372] text-white" : "border-pink/20 bg-white text-[#b43e68] hover:bg-pink/5"}`}>{tab.label}</a>
        ))}
      </nav>
      {bannerMode ? <BannersEditor /> : <ProductsEditor />}
    </div>
  );
}
