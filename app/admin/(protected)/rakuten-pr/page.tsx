import type { Metadata } from "next";
import Link from "next/link";
import { RakutenPrManager } from "@/components/admin/rakuten-pr-manager";
import { getRakutenSettingsStatus } from "@/lib/rakuten-settings";
import { getRakutenPrPlacement } from "@/lib/rakuten-pr-settings";
import { getRakutenPrProducts } from "@/lib/rakuten-pr-data";
import { createDefaultRakutenPrPlacement, RAKUTEN_PR_PLACEMENTS, type RakutenPrPlacementDefinition } from "@/lib/rakuten-pr";
import { emptyRakutenStatus, RakutenSettingsError } from "@/lib/rakuten-settings-input";
import { RakutenBannerManager } from "@/components/admin/rakuten-banner-manager";
import { createDefaultRakutenBanner, RAKUTEN_BANNER_PLACEMENTS, getRakutenBannerDefinition, type RakutenBannerDefinition, type RakutenBannerPlacement } from "@/lib/rakuten-banner";
import { getRakutenBanner } from "@/lib/rakuten-banner-settings";
import { getAdminArticle, listAdminArticles } from "@/lib/articles/repository";
import { articleRakutenDefinition } from "@/lib/rakuten-article-data";
import { createArticleRakutenBannerDefinition } from "@/lib/rakuten-article";

export const metadata: Metadata = { title: "楽天PR管理" };
export const dynamic = "force-dynamic";

async function ProductsEditor({ definitions = RAKUTEN_PR_PLACEMENTS }: { definitions?: readonly RakutenPrPlacementDefinition[] } = {}) {
  let placements = definitions.map(createDefaultRakutenPrPlacement);
  let apiStatus = emptyRakutenStatus;
  let setupError = "";
  try {
    [placements, apiStatus] = await Promise.all([
      Promise.all(definitions.map(getRakutenPrPlacement)), getRakutenSettingsStatus(),
    ]);
  } catch (error) {
    setupError = error instanceof RakutenSettingsError ? error.message : "楽天PRの掲載内容を取得できませんでした。再読み込みしてください。";
  }
  const { products, productError } = await getRakutenPrProducts(placements);
  return <RakutenPrManager definitions={definitions} initialPlacements={placements} initialProducts={products} apiStatus={apiStatus} setupError={setupError} initialProductError={productError} />;
}

async function BannersEditor({ placementId, definitions = RAKUTEN_BANNER_PLACEMENTS }: { placementId?: string; definitions?: readonly RakutenBannerDefinition[] }) {
  let banners = definitions.map(createDefaultRakutenBanner);
  let inheritedBanner: RakutenBannerPlacement | null = null;
  let setupError = "";
  try {
    [banners, inheritedBanner] = await Promise.all([Promise.all(definitions.map(getRakutenBanner)), definitions.some((entry) => entry.allowInheritance) ? getRakutenBanner(getRakutenBannerDefinition("article-top")) : Promise.resolve(null)]);
  }
  catch (error) { setupError = error instanceof RakutenSettingsError ? error.message : "バナーの掲載内容を取得できませんでした。再読み込みしてください。"; }
  return <RakutenBannerManager definitions={definitions} initialBanners={banners} setupError={setupError} initialPlacementId={placementId} inheritedBanner={inheritedBanner} />;
}

async function ArticleProductsEditor({ articleId, bannerMode = false }: { articleId?: string; bannerMode?: boolean }) {
  try {
    const articles = await listAdminArticles();
    const selected = articles.find((entry) => entry.id === articleId);
    const article = selected ? await getAdminArticle(selected.id) : null;
    return <div className="space-y-5">
      <section className="rounded-[22px] border border-pink/10 bg-white p-4 sm:p-6">
        <h2 className="text-lg font-black text-ink">記事ごとの楽天PR</h2>
        <p className="mt-2 text-sm leading-6 text-ink/65">{bannerMode ? "上部バナーは通常、全記事共通の設定を使います。この記事だけ別のバナーや非表示にすることもできます。" : "本文途中に1行2件を表示します。商品と挿入する見出しは、記事ごとに設定できます。"}広告設定の保存は、公開済みの記事へすぐ反映されます。</p>
        <form action="/admin/rakuten-pr" method="get" className="mt-4 flex flex-wrap items-end gap-3">
          <input type="hidden" name="type" value={bannerMode ? "article-banner" : "article"} />
          <div className="min-w-0 flex-1"><label htmlFor="rakuten-article" className="text-sm font-bold text-ink">対象の記事</label>
            <select id="rakuten-article" name="articleId" defaultValue={selected?.id || ""} className="mt-2 min-h-11 w-full rounded-xl border border-ink/15 bg-white px-3 text-sm outline-none focus:border-pink focus:ring-2 focus:ring-pink/20">
              <option value="">記事を選んでください</option>
              {articles.map((entry) => <option key={entry.id} value={entry.id}>{entry.title}{entry.status === "draft" ? "（下書き）" : entry.status === "scheduled" ? "（公開予約）" : ""}</option>)}
            </select>
          </div>
          <button type="submit" className="min-h-11 rounded-xl bg-[#c94372] px-5 text-sm font-bold text-white">設定を開く</button>
        </form>
        {articleId && !article && <p role="alert" className="mt-3 text-sm text-red-700">記事が見つかりません。対象の記事を選び直してください。</p>}
        {article && <a href={`/admin/articles/${article.id}`} className="mt-4 inline-flex min-h-11 items-center text-sm font-bold text-[#b43e68] hover:underline">この記事を編集する →</a>}
      </section>
      {article && <>
        <nav aria-label="この記事の楽天PR" className="flex flex-wrap gap-2">
          {[{ type: "article", text: "本文途中の商品2件", active: !bannerMode }, { type: "article-banner", text: "この記事の上部バナー", active: bannerMode }].map((tab) => <a key={tab.type} href={`/admin/rakuten-pr?type=${tab.type}&articleId=${article.id}`} aria-current={tab.active ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded-xl border px-4 text-sm font-bold ${tab.active ? "border-[#c94372] bg-[#c94372] text-white" : "border-pink/20 bg-white text-[#b43e68]"}`}>{tab.text}</a>)}
        </nav>
        {bannerMode ? <BannersEditor key={article.id} definitions={[createArticleRakutenBannerDefinition(article)]} /> : <ProductsEditor key={article.id} definitions={[articleRakutenDefinition(article)]} />}
      </>}
    </div>;
  } catch { return <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">記事を取得できませんでした。再読み込みしてください。</p>; }
}

export default async function AdminRakutenPrPage({ searchParams }: { searchParams: Promise<{ type?: string; articleId?: string; placementId?: string }> }) {
  const query = await searchParams;
  const mode = query.type === "banner" ? "banner" : query.type === "article" || query.type === "article-banner" ? "article" : "products";
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <nav aria-label="パンくずリスト" className="mb-3 text-[13px] text-ink/65"><Link href="/admin" className="hover:text-pink">管理トップ</Link> / 楽天PR管理</nav>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-[28px] font-black text-ink">楽天PR管理</h1><p className="mt-2 text-sm leading-6 text-ink/65">掲載場所ごとに、商品紹介・バナー・表示設定を管理します。</p></div>
        <Link href="/admin/rakuten" className="inline-flex min-h-11 items-center rounded-xl border border-pink/20 bg-white px-4 text-sm font-bold text-[#b43e68]">楽天API設定</Link>
      </div>
      <nav aria-label="楽天PRの種類" className="mb-5 flex flex-wrap gap-2">
        {[{ href: "/admin/rakuten-pr", label: "共通の商品紹介", selected: mode === "products" }, { href: "/admin/rakuten-pr?type=article", label: "記事ごとの設定", selected: mode === "article" }, { href: "/admin/rakuten-pr?type=banner", label: "共通バナー", selected: mode === "banner" }].map((tab) => (
          <a key={tab.href} href={tab.href} aria-current={tab.selected ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded-xl border px-5 text-sm font-bold ${tab.selected ? "border-[#c94372] bg-[#c94372] text-white" : "border-pink/20 bg-white text-[#b43e68] hover:bg-pink/5"}`}>{tab.label}</a>
        ))}
      </nav>
      {mode === "banner" ? <BannersEditor placementId={query.placementId} /> : mode === "article" ? <ArticleProductsEditor articleId={query.articleId} bannerMode={query.type === "article-banner"} /> : <><p className="mb-5 rounded-xl bg-[#fff8fb] p-4 text-sm leading-6 text-ink/70">この4件はTOPと各記事の末尾に共通で表示します。記事末尾はPC・スマホとも2列×2行です。</p><ProductsEditor /></>}
    </div>
  );
}
