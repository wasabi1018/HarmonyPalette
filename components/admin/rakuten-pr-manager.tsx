"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUp, Check, ExternalLink, LoaderCircle, Save, Search, ShoppingBag, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { RakutenPrSection } from "@/components/rakuten-pr-section";
import type { RakutenPrDisplay, RakutenPrPlacement, RakutenPrPlacementDefinition } from "@/lib/rakuten-pr";
import type { RakutenProduct, RakutenProductSearchResult } from "@/lib/rakuten-products";
import type { RakutenSettingsStatus } from "@/lib/rakuten-settings-input";

type Props = {
  definitions: readonly RakutenPrPlacementDefinition[];
  initialPlacements: RakutenPrPlacement[];
  initialProducts: RakutenProduct[];
  apiStatus: RakutenSettingsStatus;
  setupError?: string;
  initialProductError?: string;
};

function editable(placement: RakutenPrPlacement) {
  return JSON.stringify({ enabled: placement.enabled, title: placement.title, description: placement.description, items: placement.items, beforeHeadingId: placement.beforeHeadingId });
}

export function RakutenPrManager({ definitions, initialPlacements, initialProducts, apiStatus, setupError, initialProductError }: Props) {
  const [placementId, setPlacementId] = useState(definitions[0].id);
  const [placements, setPlacements] = useState(() => Object.fromEntries(initialPlacements.map((placement) => [placement.placementId, placement])));
  const [saved, setSaved] = useState(placements);
  const [products, setProducts] = useState(() => Object.fromEntries(initialProducts.map((product) => [product.itemCode, product])));
  const [keyword, setKeyword] = useState("");
  const [result, setResult] = useState<RakutenProductSearchResult | null>(null);
  const [lastSearchKeyword, setLastSearchKeyword] = useState("");
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [searchError, setSearchError] = useState("");
  const searchRequest = useRef<AbortController | null>(null);
  const definition = definitions.find((entry) => entry.id === placementId)!;
  const placement = placements[placementId];
  const changed = editable(placement) !== editable(saved[placementId]);
  const anyChanged = definitions.some((entry) => editable(placements[entry.id]) !== editable(saved[entry.id]));
  const complete = placement.items.length === definition.itemLimit;
  const positionValid = !definition.beforeHeadings || definition.beforeHeadings.some((heading) => heading.id === placement.beforeHeadingId);
  const canEnable = complete && positionValid && apiStatus.configured && apiStatus.hasAffiliateId;

  useEffect(() => () => searchRequest.current?.abort(), []);
  useEffect(() => {
    if (!anyChanged) return;
    function beforeUnload(event: BeforeUnloadEvent) { event.preventDefault(); event.returnValue = ""; }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [anyChanged]);

  function change(patch: Partial<RakutenPrPlacement>) {
    setPlacements((current) => ({ ...current, [placementId]: { ...current[placementId], ...patch } }));
    setMessage(""); setIsError(false);
  }

  function add(product: RakutenProduct) {
    if (saving || placement.items.length >= definition.itemLimit || placement.items.some((item) => item.itemCode === product.itemCode)) return;
    setProducts((current) => ({ ...current, [product.itemCode]: product }));
    change({ items: [...placement.items, { itemCode: product.itemCode, description: "" }] });
  }

  function move(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= placement.items.length) return;
    const items = [...placement.items];
    [items[index], items[next]] = [items[next], items[index]];
    change({ items });
  }

  async function search(page = 1, searchKeyword = keyword.trim()) {
    if (!apiStatus.configured) return;
    const controller = new AbortController();
    searchRequest.current?.abort(); searchRequest.current = controller;
    setSearching(true); setSearchError("");
    try {
      const searchedKeyword = searchKeyword;
      const params = new URLSearchParams({ keyword: searchedKeyword, page: String(page) });
      const response = await fetch(`/api/admin/rakuten-products?${params}`, { cache: "no-store", signal: controller.signal });
      const body = await response.json() as { result?: RakutenProductSearchResult; error?: string };
      if (!response.ok || !body.result) throw new Error(body.error || "商品を検索できませんでした。");
      if (controller.signal.aborted) return;
      setResult(body.result);
      setLastSearchKeyword(searchedKeyword);
      setProducts((current) => ({ ...current, ...Object.fromEntries(body.result!.products.map((product) => [product.itemCode, product])) }));
    } catch (error) {
      if (!controller.signal.aborted) { setResult(null); setSearchError(error instanceof Error ? error.message : "商品を検索できませんでした。"); }
    } finally { if (searchRequest.current === controller) setSearching(false); }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || setupError || !changed) return;
    setSaving(true); setMessage(""); setIsError(false);
    const targetId = placementId;
    try {
      const response = await fetch(`/api/admin/rakuten-pr/${encodeURIComponent(targetId)}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, cache: "no-store",
        body: JSON.stringify({ title: placement.title, description: placement.description, enabled: placement.enabled, items: placement.items, beforeHeadingId: placement.beforeHeadingId }),
      });
      const body = await response.json() as { placement?: RakutenPrPlacement; error?: string };
      if (!response.ok || !body.placement) throw new Error(body.error || "掲載内容を保存できませんでした。");
      const updated = body.placement;
      setPlacements((current) => ({ ...current, [targetId]: updated }));
      setSaved((current) => ({ ...current, [targetId]: updated }));
      setMessage(updated.enabled ? "掲載内容を保存しました。公開画面に反映されます。" : "掲載内容を保存しました。公開表示はオフです。");
    } catch (error) { setIsError(true); setMessage(error instanceof Error ? error.message : "掲載内容を保存できませんでした。"); }
    finally { setSaving(false); }
  }

  const preview: RakutenPrDisplay = {
    placementId: `preview-${placementId}`, title: placement.title || "PICK UP", description: placement.description,
    items: placement.items.flatMap((selected) => {
      const product = products[selected.itemCode];
      return product ? [{ ...product, affiliateUrl: product.affiliateUrl || product.itemUrl, description: selected.description }] : [];
    }),
  };

  return (
    <div className="space-y-5">
      <section className="rounded-[22px] border border-pink/10 bg-white p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0 flex-1">
            <label htmlFor="rakuten-pr-placement" className="text-sm font-bold text-ink">掲載場所</label>
            <select id="rakuten-pr-placement" value={placementId} disabled={saving} onChange={(event) => { setPlacementId(event.target.value); setMessage(""); setIsError(false); }}
              className="mt-2 min-h-11 w-full rounded-xl border border-ink/15 bg-white px-3 text-sm font-medium outline-none focus:border-pink focus:ring-2 focus:ring-pink/20">
              {definitions.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
            </select>
          </div>
          <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${saved[placementId].enabled ? "bg-green-50 text-green-800" : "bg-ink/5 text-ink/65"}`}>{saved[placementId].enabled ? "公開表示中" : "公開表示オフ"}</span>
        </div>
        <p className="mt-3 text-[13px] leading-6 text-ink/70">{definition.location}に表示します。掲載する商品は{definition.itemLimit}件です。</p>
        {setupError && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm leading-6 text-red-700">{setupError}</p>}
        {!apiStatus.configured && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-900">商品を検索するには、<Link href="/admin/rakuten" className="font-bold underline">楽天API設定</Link>で接続情報を登録してください。</p>}
        {apiStatus.configured && !apiStatus.hasAffiliateId && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-900">公開するには、<Link href="/admin/rakuten" className="font-bold underline">楽天API設定</Link>でアフィリエイトIDを登録してください。商品選びと公開表示オフでの保存はできます。</p>}
        {initialProductError && <p role="alert" className="mt-3 text-sm leading-6 text-red-700">{initialProductError} 選んだ商品は保持しています。</p>}
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <form onSubmit={(event) => void save(event)} className="min-w-0 rounded-[22px] border border-pink/10 bg-white p-4 sm:p-6">
          <fieldset disabled={saving || Boolean(setupError)}>
            <legend className="text-xl font-black text-ink">掲載内容</legend>
            <div className="mt-4 space-y-4">
              {definition.beforeHeadings && <div>
                <label htmlFor="rakuten-pr-position" className="text-sm font-bold text-ink">本文への挿入位置</label>
                <select id="rakuten-pr-position" value={placement.beforeHeadingId || ""} onChange={(event) => change({ beforeHeadingId: event.target.value })} className="mt-2 min-h-11 w-full rounded-xl border border-ink/15 bg-white px-3 text-sm outline-none focus:border-pink focus:ring-2 focus:ring-pink/20">
                  <option value="">見出しを選んでください</option>
                  {placement.beforeHeadingId && !positionValid && <option value={placement.beforeHeadingId}>本文から削除された見出し（選び直してください）</option>}
                  {definition.beforeHeadings.map((heading) => <option key={heading.id} value={heading.id}>「{heading.text}」の手前</option>)}
                </select>
                <p className="mt-2 text-xs leading-6 text-ink/65">保存済みの本文の見出しから選びます。見出しを変更したときは、記事を保存してからこの画面を再読み込みしてください。</p>
                {!definition.beforeHeadings.length && <p role="alert" className="mt-2 text-xs leading-6 text-red-700">本文に見出しがありません。記事に見出しと、その前の本文を追加して保存してください。</p>}
                {placement.beforeHeadingId && !positionValid && <p role="alert" className="mt-2 text-xs leading-6 text-red-700">挿入先の見出しが見つかりません。選び直して保存するまで、本文途中の商品は表示されません。</p>}
              </div>}
              <div><label htmlFor="rakuten-pr-title" className="text-sm font-bold text-ink">見出し</label><input id="rakuten-pr-title" value={placement.title} required maxLength={80} onChange={(event) => change({ title: event.target.value })}
                className="mt-2 min-h-11 w-full rounded-xl border border-ink/15 px-3 text-sm outline-none focus:border-pink focus:ring-2 focus:ring-pink/20" /></div>
              <div><label htmlFor="rakuten-pr-description" className="text-sm font-bold text-ink">説明文 <span className="font-medium text-ink/55">任意</span></label><input id="rakuten-pr-description" value={placement.description} maxLength={160} onChange={(event) => change({ description: event.target.value })}
                className="mt-2 min-h-11 w-full rounded-xl border border-ink/15 px-3 text-sm outline-none focus:border-pink focus:ring-2 focus:ring-pink/20" /></div>
            </div>
            <div className="mb-3 mt-6 flex flex-wrap items-center justify-between gap-2"><h2 className="text-base font-black text-ink">掲載商品</h2><span className="text-sm font-bold text-ink/65">{placement.items.length} / {definition.itemLimit}件</span></div>
            <p className="mb-3 text-xs leading-5 text-ink/65">商品検索から追加してください。{definition.itemLimit === 2 ? "上から順に、左・右に表示します。" : "上から順に、スマホでは左上・右上・左下・右下に表示します。"}</p>
            {placement.items.length === 0 && <p className="rounded-xl border border-dashed border-pink/25 p-5 text-sm leading-6 text-ink/65">まだ商品を選んでいません。</p>}
            <ol className="space-y-3">
              {placement.items.map((selected, index) => {
                const product = products[selected.itemCode];
                return <li key={selected.itemCode} className="rounded-xl border border-ink/10 p-3">
                  <div className="flex items-start gap-3">
                    {product ? <Image src={product.imageUrl} alt="" width={64} height={64} unoptimized className="h-16 w-16 shrink-0 rounded-lg bg-[#faf8f9] object-contain" /> : <ShoppingBag size={40} className="m-3 shrink-0 text-ink/35" aria-hidden="true" />}
                    <div className="min-w-0 flex-1"><p className="text-xs font-bold text-[#b43e68]">{index + 1}番目</p><p className="mt-1 line-clamp-2 break-words text-[13px] font-bold leading-5 text-ink">{product?.itemName || "商品情報を取得できませんでした"}</p>{!product && <p className="mt-1 break-all text-xs text-ink/55">{selected.itemCode}</p>}</div>
                  </div>
                  <label htmlFor={`rakuten-pr-note-${index}`} className="mt-3 block text-xs font-bold text-ink">短い紹介文 <span className="font-medium text-ink/55">任意</span></label>
                  <input id={`rakuten-pr-note-${index}`} value={selected.description} maxLength={80} placeholder="例：かわいい柄を毎日のおともに。" onChange={(event) => change({ items: placement.items.map((item, itemIndex) => itemIndex === index ? { ...item, description: event.target.value } : item) })}
                    className="mt-1 min-h-11 w-full rounded-lg border border-ink/15 px-2.5 text-[13px] outline-none focus:border-pink focus:ring-2 focus:ring-pink/20" />
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex gap-1"><button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`${index + 1}番目の商品を上へ`} className="grid min-h-11 min-w-11 place-items-center rounded-lg border border-ink/10 text-ink/70 hover:bg-pink/5 disabled:opacity-30"><ArrowUp size={16} aria-hidden="true" /></button><button type="button" onClick={() => move(index, 1)} disabled={index === placement.items.length - 1} aria-label={`${index + 1}番目の商品を下へ`} className="grid min-h-11 min-w-11 place-items-center rounded-lg border border-ink/10 text-ink/70 hover:bg-pink/5 disabled:opacity-30"><ArrowDown size={16} aria-hidden="true" /></button></div>
                    <button type="button" onClick={() => change({ items: placement.items.filter((item) => item.itemCode !== selected.itemCode) })} aria-label={`${index + 1}番目の商品を外す`} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-bold text-red-700 hover:bg-red-50"><Trash2 size={15} aria-hidden="true" />外す</button>
                  </div>
                </li>;
              })}
            </ol>
            <label className="mt-5 flex min-h-11 items-center gap-3 rounded-xl bg-[#fff8fb] p-3 text-sm font-bold text-ink"><input type="checkbox" checked={placement.enabled} disabled={!placement.enabled && !canEnable} onChange={(event) => change({ enabled: event.target.checked })} className="h-4 w-4 accent-[#c94372]" />この掲載枠を公開表示する</label>
            {!complete && <p className="mt-2 text-xs leading-5 text-ink/65">公開するには商品を{definition.itemLimit}件選んでください。途中でも公開表示オフで保存できます。</p>}
            {placement.updatedAt && <p className="mt-4 text-xs leading-5 text-ink/55">最終保存：{new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", dateStyle: "medium", timeStyle: "short" }).format(new Date(placement.updatedAt))}</p>}
            <button type="submit" disabled={!changed || (placement.enabled && !canEnable)} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#c94372] px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40">{saving ? <LoaderCircle size={17} className="animate-spin" aria-hidden="true" /> : <Save size={17} aria-hidden="true" />}{saving ? "保存中…" : "掲載内容を保存"}</button>
          </fieldset>
          <p role={isError ? "alert" : "status"} className={`mt-3 text-sm leading-6 ${isError ? "text-red-700" : "text-ink/70"}`}>{message || (changed ? "未保存の変更があります。" : "")}</p>
        </form>

        <section className="min-w-0 rounded-[22px] border border-pink/10 bg-white p-4 sm:p-6" aria-labelledby="rakuten-product-search-heading">
          <h2 id="rakuten-product-search-heading" className="text-xl font-black text-ink">商品を検索</h2>
          <form onSubmit={(event) => { event.preventDefault(); void search(); }} className="mt-4 flex items-end gap-2">
            <div className="min-w-0 flex-1"><label htmlFor="rakuten-pr-keyword" className="text-xs font-bold text-ink">商品名・キーワード</label><input id="rakuten-pr-keyword" value={keyword} onChange={(event) => setKeyword(event.target.value)} minLength={2} maxLength={120} required disabled={!apiStatus.configured}
              placeholder="例：サンリオ タオル" className="mt-2 min-h-11 w-full rounded-xl border border-ink/15 px-3 text-sm outline-none focus:border-pink focus:ring-2 focus:ring-pink/20 disabled:bg-ink/5" /></div>
            <button type="submit" disabled={searching || !apiStatus.configured || keyword.trim().length < 2} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#c94372] px-3 text-sm font-bold text-white disabled:opacity-40">{searching ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <Search size={16} aria-hidden="true" />}{searching ? "検索中" : "検索"}</button>
          </form>
          <p className="mt-2 text-xs leading-5 text-ink/65">画像のある販売中の商品を検索します。価格は公開カードに表示しません。</p>
          <div role="status" aria-live="polite" className="mt-4 text-[13px] leading-6 text-ink/65">{searching ? "楽天市場の商品を検索しています…" : result ? `${result.products.length}件を表示しています。` : "キーワードで検索し、掲載したい商品を追加してください。"}</div>
          {searchError && <p role="alert" className="mt-2 rounded-xl bg-red-50 p-3 text-sm leading-6 text-red-700">{searchError}</p>}
          {result && !result.products.length && <p className="mt-3 rounded-xl bg-[#fff8fb] p-4 text-sm leading-6 text-ink/70">商品が見つかりませんでした。別のキーワードで検索してください。</p>}
          {result && <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-2">
            {result.products.map((product) => {
              const selected = placement.items.some((item) => item.itemCode === product.itemCode);
              return <article key={product.itemCode} className="flex min-w-0 flex-col rounded-xl border border-ink/10 p-2.5">
                <Image src={product.imageUrl} alt={product.itemName} width={128} height={128} unoptimized className="aspect-square w-full rounded-lg bg-[#faf8f9] object-contain" />
                <h3 className="mt-2 line-clamp-2 min-h-[40px] break-words text-[13px] font-bold leading-5 text-ink">{product.itemName}</h3>
                <p className="mt-1 line-clamp-1 text-[11px] leading-5 text-ink/55">{product.shopName}</p>
                <a href={product.affiliateUrl || product.itemUrl} target="_blank" rel="nofollow sponsored noopener noreferrer" className="my-1 inline-flex min-h-11 items-center gap-1 text-xs font-bold text-[#b43e68] hover:underline">楽天市場で確認<ExternalLink size={12} aria-hidden="true" /></a>
                <button type="button" onClick={() => add(product)} disabled={selected || placement.items.length >= definition.itemLimit || saving || Boolean(setupError)} aria-label={`${product.itemName}を掲載商品に追加`} className="mt-auto inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border border-pink/30 px-2 text-xs font-bold text-[#b43e68] disabled:bg-ink/5 disabled:text-ink/50">{selected && <Check size={13} aria-hidden="true" />}{selected ? "追加済み" : placement.items.length >= definition.itemLimit ? "掲載枠がいっぱい" : "掲載商品に追加"}</button>
              </article>;
            })}
          </div>}
          {result && result.pageCount > 1 && <div className="mt-4 flex items-center justify-between gap-2"><button type="button" onClick={() => void search(result.page - 1, lastSearchKeyword)} disabled={searching || result.page <= 1} className="min-h-11 rounded-lg border border-ink/15 px-3 text-xs font-bold text-ink/70 disabled:opacity-30">前のページ</button><span className="text-xs text-ink/65">{result.page} / {result.pageCount}</span><button type="button" onClick={() => void search(result.page + 1, lastSearchKeyword)} disabled={searching || result.page >= result.pageCount} className="min-h-11 rounded-lg border border-ink/15 px-3 text-xs font-bold text-ink/70 disabled:opacity-30">次のページ</button></div>}
          {result && <p className="mt-3 text-[11px] leading-5 text-ink/55"><a href="https://developers.rakuten.com/" target="_blank">Supported by Rakuten Developers</a></p>}
        </section>
      </div>

      <section className="rounded-[22px] border border-pink/10 bg-white p-4 sm:p-6">
        <h2 className="text-lg font-black text-ink">表示プレビュー（スマホ）</h2>
        <p className="mt-2 text-xs leading-6 text-ink/65">保存前の表示を確認できます。実際の公開画面では、商品名は2行まで、紹介文は2行まで表示します。</p>
        {preview.items.length ? <div className="mx-auto mt-4 max-w-[375px] rounded-xl bg-[#fff8fb] px-4 py-5"><RakutenPrSection placement={preview} compact className="" /></div> : <p className="mt-4 rounded-xl border border-dashed border-pink/25 p-5 text-sm text-ink/65">商品を追加するとプレビューが表示されます。</p>}
      </section>
    </div>
  );
}
