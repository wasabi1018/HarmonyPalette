"use client";

import { useEffect, useState, type FormEvent } from "react";
import { LoaderCircle, Save } from "lucide-react";
import { RakutenBanner } from "@/components/rakuten-banner";
import { parseRakutenBanner, type RakutenBannerDefinition, type RakutenBannerPlacement } from "@/lib/rakuten-banner";

type Props = { definitions: readonly RakutenBannerDefinition[]; initialBanners: RakutenBannerPlacement[]; setupError?: string; initialPlacementId?: string; inheritedBanner?: RakutenBannerPlacement | null };
function editable(banner: RakutenBannerPlacement) { return JSON.stringify({ ...banner, updatedAt: null }); }

export function RakutenBannerManager({ definitions, initialBanners, setupError, initialPlacementId, inheritedBanner }: Props) {
  const [placementId, setPlacementId] = useState(definitions.some((entry) => entry.id === initialPlacementId) ? initialPlacementId! : definitions[0].id);
  const [banners, setBanners] = useState(() => Object.fromEntries(initialBanners.map((banner) => [banner.placementId, banner])));
  const [saved, setSaved] = useState(banners);
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const banner = banners[placementId];
  const definition = definitions.find((entry) => entry.id === placementId)!;
  const changed = editable(banner) !== editable(saved[placementId]);
  const anyChanged = definitions.some((entry) => editable(banners[entry.id]) !== editable(saved[entry.id])) || Boolean(code.trim());
  let preview: RakutenBannerPlacement | null = null;
  let inputError = "";
  try { const parsed = parseRakutenBanner(banner, definition); preview = parsed.mode === "inherit" ? (inheritedBanner?.enabled ? inheritedBanner : null) : parsed; }
  catch (error) { inputError = error instanceof Error ? error.message : "バナーの掲載内容を確認してください。"; }

  useEffect(() => {
    if (!anyChanged) return;
    function beforeUnload(event: BeforeUnloadEvent) { event.preventDefault(); event.returnValue = ""; }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [anyChanged]);

  function change(patch: Partial<RakutenBannerPlacement>) {
    setBanners((current) => ({ ...current, [placementId]: { ...current[placementId], ...patch } }));
    setMessage(""); setIsError(false);
  }
  function importCode() {
    try {
      // Template contents stay inert: supplied HTML is never inserted into the page.
      const template = document.createElement("template");
      template.innerHTML = code;
      const links = template.content.querySelectorAll("a[href]");
      const images = template.content.querySelectorAll("img[src]");
      if (links.length !== 1 || images.length !== 1 || images[0].closest("a") !== links[0]) throw new Error("楽天の画像バナーコードを1つ貼り付けてください。");
      const imported = parseRakutenBanner({ ...banner, linkUrl: links[0].getAttribute("href"), imageUrl: images[0].getAttribute("src"), alt: images[0].getAttribute("alt")?.trim() || banner.alt }, definition);
      change(imported); setCode("");
      setMessage("バナーを取り込みました。プレビューを確認して保存してください。");
    } catch (error) { setIsError(true); setMessage(error instanceof Error ? error.message : "バナーコードを確認してください。"); }
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || setupError || !changed || inputError || code.trim()) return;
    setSaving(true); setMessage(""); setIsError(false);
    const targetId = placementId;
    try {
      const response = await fetch(`/api/admin/rakuten-banners/${encodeURIComponent(targetId)}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, cache: "no-store", body: JSON.stringify(banner),
      });
      const body = await response.json() as { banner?: RakutenBannerPlacement; error?: string };
      if (!response.ok || !body.banner) throw new Error(body.error || "バナーを保存できませんでした。");
      const updated = body.banner;
      setBanners((current) => ({ ...current, [targetId]: updated }));
      setSaved((current) => ({ ...current, [targetId]: updated }));
      setMessage(updated.mode === "inherit" ? "全記事共通のバナーを使う設定を保存しました。" : updated.enabled ? "バナーを保存しました。公開画面に反映されます。" : "バナーを保存しました。公開表示はオフです。");
    } catch (error) { setIsError(true); setMessage(error instanceof Error ? error.message : "バナーを保存できませんでした。"); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[22px] border border-pink/10 bg-white p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0 flex-1"><label htmlFor="rakuten-banner-placement" className="text-sm font-bold text-ink">掲載場所</label>
            <select id="rakuten-banner-placement" value={placementId} disabled={saving} onChange={(event) => { setPlacementId(event.target.value); setCode(""); setMessage(""); setIsError(false); }} className="mt-2 min-h-11 w-full rounded-xl border border-ink/15 bg-white px-3 text-sm font-medium outline-none focus:border-pink focus:ring-2 focus:ring-pink/20">
              {definitions.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
            </select>
          </div>
          <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${saved[placementId].enabled ? "bg-green-50 text-green-800" : "bg-ink/5 text-ink/65"}`}>{saved[placementId].mode === "inherit" ? "共通設定を使用" : saved[placementId].enabled ? "公開表示中" : "公開表示オフ"}</span>
        </div>
        <p className="mt-3 text-[13px] leading-6 text-ink/70">{definition.location}に表示します。画像を中央に配置し、スマホでは画面幅に合わせて縮小します。</p>
        {setupError && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm leading-6 text-red-700">{setupError}</p>}
      </section>
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <form onSubmit={(event) => void save(event)} className="min-w-0 rounded-[22px] border border-pink/10 bg-white p-4 sm:p-6">
          <fieldset disabled={saving || Boolean(setupError)}>
            <legend className="text-xl font-black text-ink">バナーの掲載内容</legend>
            {definition.allowInheritance && <div className="mt-4">
              <label htmlFor="rakuten-banner-mode" className="text-sm font-bold text-ink">バナーの使い方</label>
              <select id="rakuten-banner-mode" value={banner.mode} onChange={(event) => { change({ mode: event.target.value as "inherit" | "custom" }); setCode(""); }} className="mt-2 min-h-11 w-full rounded-xl border border-ink/15 bg-white px-3 text-sm outline-none focus:border-pink focus:ring-2 focus:ring-pink/20">
                <option value="inherit">全記事共通のバナーを使う</option><option value="custom">この記事だけ個別に設定する</option>
              </select>
              <p className="mt-2 text-xs leading-6 text-ink/65">共通設定を使う場合は、全記事共通のバナー変更がこの記事にも反映されます。個別設定を公開オフで保存すると、この記事のバナーを非表示にします。</p>
            </div>}
            {banner.mode !== "inherit" && <>
            <label htmlFor="rakuten-banner-code" className="mt-4 block text-sm font-bold text-ink">楽天のバナーコード</label>
            <p id="rakuten-banner-code-help" className="mt-1 text-xs leading-6 text-ink/65">楽天アフィリエイトの画像バナーコードを貼り付けて取り込めます。</p>
            <textarea id="rakuten-banner-code" aria-describedby="rakuten-banner-code-help" value={code} maxLength={16384} rows={4} onChange={(event) => setCode(event.target.value)} placeholder={'<a href="..."><img src="..."></a>'} className="mt-2 w-full rounded-xl border border-ink/15 p-3 text-xs leading-5 outline-none focus:border-pink focus:ring-2 focus:ring-pink/20" />
            <button type="button" onClick={importCode} disabled={!code.trim()} className="mt-2 min-h-11 rounded-xl border border-pink/25 px-4 text-sm font-bold text-[#b43e68] disabled:opacity-40">コードから取り込む</button>
            <div className="mt-6 space-y-4">
              <div><label htmlFor="rakuten-banner-link" className="text-sm font-bold text-ink">リンク先URL</label><input id="rakuten-banner-link" type="url" value={banner.linkUrl} maxLength={2048} required={banner.enabled} onChange={(event) => change({ linkUrl: event.target.value })} className="mt-2 min-h-11 w-full rounded-xl border border-ink/15 px-3 text-sm outline-none focus:border-pink focus:ring-2 focus:ring-pink/20" /></div>
              <div><label htmlFor="rakuten-banner-image" className="text-sm font-bold text-ink">画像URL</label><input id="rakuten-banner-image" type="url" value={banner.imageUrl} maxLength={2048} required={banner.enabled} onChange={(event) => change({ imageUrl: event.target.value })} className="mt-2 min-h-11 w-full rounded-xl border border-ink/15 px-3 text-sm outline-none focus:border-pink focus:ring-2 focus:ring-pink/20" /></div>
              <div><label htmlFor="rakuten-banner-alt" className="text-sm font-bold text-ink">画像の説明</label><input id="rakuten-banner-alt" value={banner.alt} maxLength={160} required onChange={(event) => change({ alt: event.target.value })} className="mt-2 min-h-11 w-full rounded-xl border border-ink/15 px-3 text-sm outline-none focus:border-pink focus:ring-2 focus:ring-pink/20" /><p className="mt-1 text-xs leading-5 text-ink/65">読み上げや、画像を表示できないときに使います。</p></div>
            </div>
            <label className="mt-5 flex min-h-11 items-center gap-3 rounded-xl bg-[#fff8fb] p-3 text-sm font-bold text-ink"><input type="checkbox" checked={banner.enabled} onChange={(event) => change({ enabled: event.target.checked })} className="h-4 w-4 accent-[#c94372]" />このバナーを公開表示する</label>
            </>}
            {inputError && <p role="alert" className="mt-2 text-xs leading-6 text-red-700">{inputError}</p>}
            {banner.updatedAt && <p className="mt-4 text-xs leading-5 text-ink/55">最終保存：{new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", dateStyle: "medium", timeStyle: "short" }).format(new Date(banner.updatedAt))}</p>}
            {code.trim() && <p className="mt-3 text-xs leading-6 text-ink/65">貼り付けたコードは「コードから取り込む」を押してから保存してください。</p>}
            <button type="submit" disabled={!changed || Boolean(inputError) || Boolean(code.trim())} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#c94372] px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40">{saving ? <LoaderCircle size={17} className="animate-spin" aria-hidden="true" /> : <Save size={17} aria-hidden="true" />}{saving ? "保存中…" : "バナーの掲載内容を保存"}</button>
          </fieldset>
          <p role={isError ? "alert" : "status"} className={`mt-3 text-sm leading-6 ${isError ? "text-red-700" : "text-ink/70"}`}>{message || (changed || code.trim() ? "未保存の変更があります。" : "")}</p>
        </form>
        <section className="min-w-0 rounded-[22px] border border-pink/10 bg-white p-4 sm:p-6" aria-labelledby="rakuten-banner-preview-heading">
          <h2 id="rakuten-banner-preview-heading" className="text-lg font-black text-ink">表示プレビュー</h2>
          <p className="mt-2 text-xs leading-6 text-ink/65">保存前のバナーを確認できます。公開表示オフでもプレビューは表示します。</p>
          <div className="mt-4 overflow-hidden rounded-xl bg-[#fff8fb]">
            {preview?.imageUrl && preview.linkUrl ? <RakutenBanner banner={preview} preview onImageSize={(width, height) => {
              if (banner.mode === "inherit" || saving || width > 4000 || height > 4000) return;
              setBanners((current) => {
                const selected = current[placementId];
                if (selected.imageUrl !== preview?.imageUrl || (selected.width === width && selected.height === height)) return current;
                return { ...current, [placementId]: { ...selected, width, height } };
              });
            }} /> : <p className="p-5 text-sm leading-6 text-ink/65">{banner.mode === "inherit" ? "全記事共通の上部バナーは公開オフ、または未設定です。" : "楽天の画像URLとリンク先を入力するとプレビューが表示されます。"}</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
