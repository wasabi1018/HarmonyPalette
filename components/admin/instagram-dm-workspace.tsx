"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { LoaderCircle, Plus, RefreshCw, X } from "lucide-react";
import type { PreparedInstagramDmAsset } from "@/lib/instagram-admin-session";
import { useInstagramSessionState, useInstagramUnsavedChanges } from "./instagram-session-provider";

type Asset = { id: string; character_name: string; keywords: string[]; image_url: string; dm_text: string };
type Campaign = { id: string; month: string; reel_media_id: string; status: "draft" | "active" | "paused"; instagram_dm_assets: Asset[] };
type Delivery = { id: string; campaign_id: string; status: string; comment_id: string; follow_status: string | null; last_error: string | null };
type Listing = { campaigns: Campaign[]; deliveries: Delivery[]; metaConfigured: boolean };
type ManualAsset = { characterName: string; keywords: string; dmText: string; file: File | null };
export type InstagramDmView = "list" | "new" | "detail" | "deliveries" | "asset";

const inputClass = "mt-1 min-h-11 w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-[13px] text-ink outline-none focus:border-pink focus:ring-4 focus:ring-pink/10";
const buttonClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-pink px-4 py-2 text-[12px] font-black text-white disabled:cursor-not-allowed disabled:opacity-40";
const linkClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-pink/20 bg-white px-4 text-[12px] font-black text-pink";
const campaignLabels = { draft: "下書き", active: "稼働中", paused: "一時停止" };
const deliveryLabels: Record<string, string> = { pending_intro: "案内送信待ち", awaiting_tap: "ボタン押下待ち", pending_check: "フォロー確認待ち", awaiting_follow: "フォロー待ち", pending_image: "画像送信待ち", pending_text: "文章送信待ち", pending_reply: "コメント返信待ち", complete: "完了", failed: "失敗", needs_review: "要確認" };
const followLabels: Record<string, string> = { following: "フォロー中", not_following: "未フォロー", unknown: "不明" };

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...init });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "通信に失敗しました。");
  return data as T;
}

export function InstagramDmCampaignManager({ view = "list", campaignId, onAssetRegistered }: { view?: InstagramDmView; campaignId?: string; onAssetRegistered?: () => void }) {
  const router = useRouter();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [failed, setFailed] = useState(false);
  const [prepared, setPrepared] = useInstagramSessionState<PreparedInstagramDmAsset | null>("dm.prepared-asset", null);
  const [newCampaign, setNewCampaign] = useInstagramSessionState("dm.new-campaign", { month: "", reelMediaId: "" });
  const [selectedId, setSelectedId] = useInstagramSessionState("dm.asset-campaign", "");
  const [manualAsset, setManualAsset] = useInstagramSessionState<ManualAsset>(`dm.manual-asset.${campaignId ?? "new"}`, { characterName: "", keywords: "", dmText: "", file: null });
  const [deliveryFilter, setDeliveryFilter] = useInstagramSessionState<"all" | "review">("dm.delivery-filter", "review");
  useInstagramUnsavedChanges("dm.prepared-asset", Boolean(prepared));
  useInstagramUnsavedChanges("dm.new-campaign", Boolean(newCampaign.month || newCampaign.reelMediaId));
  useInstagramUnsavedChanges(`dm.manual-asset.${campaignId ?? "new"}`, Boolean(manualAsset.characterName || manualAsset.keywords || manualAsset.dmText || manualAsset.file));

  const listingUrl = `/api/admin/instagram-dm/campaigns${campaignId ? `?id=${encodeURIComponent(campaignId)}` : ""}`;
  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await requestJson<Listing>(listingUrl, { signal });
      if (!signal?.aborted) setListing(data);
    } catch (error) {
      if (!signal?.aborted) setLoadError(error instanceof Error ? error.message : "読み込みに失敗しました。");
    } finally { if (!signal?.aborted) setLoading(false); }
  }, [listingUrl]);
  useEffect(() => { const controller = new AbortController(); void refresh(controller.signal); return () => controller.abort(); }, [refresh]);

  const campaign = listing?.campaigns.find((item) => item.id === campaignId);
  const drafts = listing?.campaigns.filter((item) => item.status === "draft" && (!prepared || item.month === prepared.month)) ?? [];
  const targetId = view === "detail" ? campaign?.id ?? "" : drafts.some((item) => item.id === selectedId) ? selectedId : drafts.length === 1 ? drafts[0].id : "";
  const asset = prepared ?? manualAsset;

  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setFeedback(""); setFailed(false);
    try { await action(); }
    catch (error) { setFailed(true); setFeedback(error instanceof Error ? error.message : "操作に失敗しました。"); }
    finally { setBusy(false); }
  }

  function createCampaign(event: FormEvent) {
    event.preventDefault();
    void run(async () => {
      const result = await requestJson<{ id: string }>("/api/admin/instagram-dm/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ month: newCampaign.month || prepared?.month, reelMediaId: newCampaign.reelMediaId }) });
      setNewCampaign({ month: "", reelMediaId: "" });
      setSelectedId(result.id);
      router.push(`/admin/instagram/dm/${result.id}`);
    });
  }

  function addAsset(event: FormEvent) {
    event.preventDefault();
    if (!asset.file || !targetId) return;
    void run(async () => {
      const form = new FormData();
      form.set("campaignId", targetId); form.set("characterName", asset.characterName); form.set("keywords", asset.keywords); form.set("dmText", asset.dmText); form.set("image", asset.file!);
      await requestJson("/api/admin/instagram-dm/assets", { method: "POST", body: form });
      setPrepared(null);
      setManualAsset({ characterName: "", keywords: "", dmText: "", file: null });
      setFeedback("画像とDM文章を下書きへ登録しました。開始はキャンペーン詳細で操作できます。");
      await refresh();
      onAssetRegistered?.();
    });
  }

  function updateAsset(field: "characterName" | "keywords" | "dmText", value: string) {
    if (prepared) setPrepared((current) => current ? { ...current, [field]: value } : current);
    else setManualAsset((current) => ({ ...current, [field]: value }));
  }

  const assetForm = <form onSubmit={addAsset} className="rounded-2xl border border-pink/15 bg-[#fffafd] p-4 sm:p-5">
    <div className="flex items-center justify-between gap-3"><h2 className="text-[17px] font-black text-ink">画像とDM文章を登録</h2>{view === "asset" && <button type="button" aria-label="DM素材の登録を閉じる" className="grid h-11 w-11 place-items-center rounded-xl text-ink/60" disabled={busy} onClick={() => { if (window.confirm("準備したDM素材を破棄して閉じますか？")) setPrepared(null); }}><X size={18} aria-hidden="true" /></button>}</div>
    {prepared && <p className="mt-2 text-[12px] font-bold leading-6 text-pink">{prepared.month}の推しキャラ画像を引き継いでいます。登録するだけでは送信を開始しません。</p>}
    {view === "detail" && prepared && prepared.month !== campaign?.month ? <p role="alert" className="mt-3 text-[13px] font-bold text-red-700">画像の対象月とキャンペーンの月が異なります。対象月の下書きを選んでください。</p> : null}
    {view !== "detail" && <label className="mt-4 block text-[12px] font-bold text-ink/70">登録先の下書きキャンペーン<select className={inputClass} value={targetId} onChange={(event) => setSelectedId(event.target.value)} required disabled={loading || busy}><option value="">選択してください</option>{drafts.map((item) => <option key={item.id} value={item.id}>{item.month} / Reel {item.reel_media_id}</option>)}</select></label>}
    {!loading && view !== "detail" && drafts.length === 0 && <p className="mt-3 text-[12px] leading-6 text-ink/60">対象の下書きがありません。<Link href="/admin/instagram/dm/new" className="font-bold text-pink underline">下書きを作成</Link>すると、準備した素材を登録できます。</p>}
    <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="block text-[12px] font-bold text-ink/70">キャラクター名<input className={inputClass} value={asset.characterName} onChange={(event) => updateAsset("characterName", event.target.value)} required maxLength={80} disabled={busy} /></label><label className="block text-[12px] font-bold text-ink/70">コメントのキーワード<input className={inputClass} value={asset.keywords} onChange={(event) => updateAsset("keywords", event.target.value)} required placeholder="クロミ、くろみ" disabled={busy} /></label></div>
    <label className="mt-4 block text-[12px] font-bold text-ink/70">DM文章<textarea className={`${inputClass} min-h-32`} value={asset.dmText} onChange={(event) => updateAsset("dmText", event.target.value)} required maxLength={1000} disabled={busy} /></label>
    {prepared ? <p className="mt-3 break-all text-[12px] text-ink/60">登録するPNG：{prepared.file.name}</p> : <label className="mt-4 block text-[12px] font-bold text-ink/70">PNG画像〈1080 × 1350px〉<input key={manualAsset.file?.name ?? "empty"} className={`${inputClass} text-[12px]`} type="file" accept="image/png" onChange={(event) => setManualAsset((current) => ({ ...current, file: event.target.files?.[0] ?? null }))} required={!manualAsset.file} disabled={busy} />{manualAsset.file && <span className="mt-2 block break-all text-[11px]">選択済み：{manualAsset.file.name}</span>}</label>}
    <div className="mt-5 flex flex-wrap gap-2"><button className={buttonClass} disabled={busy || loading || Boolean(loadError) || !targetId || (Boolean(prepared) && view === "detail" && prepared?.month !== campaign?.month)}>{busy && <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />}下書きへ登録</button>{view === "asset" && targetId && <Link className={linkClass} href={`/admin/instagram/dm/${targetId}`}>キャンペーン詳細</Link>}</div>
  </form>;

  const visibleDeliveries = (listing?.deliveries ?? []).filter((delivery) => deliveryFilter === "all" || ["failed", "needs_review"].includes(delivery.status));
  return <section className="min-w-0 rounded-[24px] border border-pink/15 bg-white p-4 shadow-soft sm:p-6">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      {view !== "asset" && <nav aria-label="DM運用メニュー" className="flex flex-wrap gap-2"><Link href="/admin/instagram/dm" aria-current={view === "list" ? "page" : undefined} className={linkClass}>キャンペーン一覧</Link><Link href="/admin/instagram/dm/deliveries" aria-current={view === "deliveries" ? "page" : undefined} className={linkClass}>送信状況</Link>{view === "list" && <Link href="/admin/instagram/dm/new" className={buttonClass}><Plus size={16} aria-hidden="true" />新しく作成</Link>}</nav>}
      <button type="button" className={linkClass} onClick={() => void refresh()} disabled={loading || busy}><RefreshCw size={15} aria-hidden="true" />{loading ? "読み込み中…" : "最新の状態に更新"}</button>
    </div>
    {loadError && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-[13px] text-red-700">{loadError}</p>}
    {feedback && <p role={failed ? "alert" : "status"} className={`mb-4 rounded-xl p-3 text-[13px] ${failed ? "bg-red-50 text-red-700" : "bg-mint/10 text-[#35745f]"}`}>{feedback}</p>}
    {listing && !listing.metaConfigured && view !== "asset" && <p className="mb-4 rounded-xl bg-amber-50 p-3 text-[12px] leading-6 text-amber-900">Meta連携が未設定です。下書きの準備はできますが、自動返信の開始には連携設定が必要です。</p>}
    {view === "asset" && assetForm}
    {view === "new" && <form onSubmit={createCampaign} className="max-w-[620px]">
      <h2 className="text-[18px] font-black text-ink">Reelの下書きを作成</h2><p className="mt-2 text-[12px] leading-6 text-ink/60">対象月とReelを指定します。作成後にキャラクターの画像とDM文章を登録してください。</p>
      <label className="mt-5 block text-[12px] font-bold text-ink/70">対象月<input className={inputClass} type="month" value={newCampaign.month || prepared?.month || ""} onChange={(event) => setNewCampaign((current) => ({ ...current, month: event.target.value }))} required disabled={busy} /></label>
      <label className="mt-4 block text-[12px] font-bold text-ink/70">ReelのメディアID<input className={inputClass} value={newCampaign.reelMediaId} onChange={(event) => setNewCampaign((current) => ({ ...current, reelMediaId: event.target.value }))} pattern="[0-9]{5,100}" placeholder="1784…" required disabled={busy} /><span className="mt-2 block text-[11px] text-ink/60">Instagram投稿のURLではなく、数字のメディアIDを入力します。</span></label>
      <button className={`${buttonClass} mt-5`} disabled={busy}>下書きを作成</button>
    </form>}
    {view === "list" && listing && <div className="grid gap-3">
      <p className="text-[11px] text-ink/60">最近作成したキャンペーンを最大30件表示します。</p>
      {listing.campaigns.length === 0 && <p className="rounded-xl bg-[#fff7fa] p-6 text-[13px] leading-6 text-ink/60">キャンペーンはまだありません。「新しく作成」から下書きを準備できます。</p>}
      {listing.campaigns.map((item) => <Link href={`/admin/instagram/dm/${item.id}`} key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink/10 p-4 transition hover:border-pink/30"><span className="min-w-0"><strong className="block text-[15px] text-ink">{item.month}</strong><span className="mt-1 block break-all text-[12px] text-ink/60">Reel {item.reel_media_id}</span><span className="mt-2 block text-[12px] text-ink/60">登録素材：{item.instagram_dm_assets.length}キャラクター</span></span><span className={`rounded-full px-3 py-1.5 text-[11px] font-black ${item.status === "active" ? "bg-mint/15 text-[#35745f]" : "bg-pink/10 text-pink"}`}>{campaignLabels[item.status]}</span></Link>)}
      {prepared && <div className="mt-3">{assetForm}</div>}
    </div>}
    {view === "detail" && listing && !campaign && <p role="alert" className="text-[13px] text-ink/70">このキャンペーンは見つかりません。キャンペーン一覧から選び直してください。</p>}
    {view === "detail" && campaign && <div className="space-y-5">
      <div className="rounded-2xl border border-ink/10 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-[18px] font-black text-ink">{campaign.month}のキャンペーン</h2><span className="rounded-full bg-pink/10 px-3 py-1.5 text-[12px] font-bold text-pink">{campaignLabels[campaign.status]}</span></div><p className="mt-2 break-all text-[12px] text-ink/60">Reel {campaign.reel_media_id}</p></div>
      {campaign.status === "draft" && assetForm}
      <div><h2 className="mb-3 text-[17px] font-black text-ink">登録済みの素材</h2>{campaign.instagram_dm_assets.length === 0 && <p className="text-[13px] text-ink/60">画像とDM文章を登録すると、ここで内容を確認できます。</p>}<div className="grid gap-3">{campaign.instagram_dm_assets.map((item) => <div key={item.id} className="rounded-2xl border border-ink/10 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><strong className="text-[14px] text-ink">{item.character_name}</strong><a href={item.image_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-[12px] font-bold text-pink underline">画像を確認</a></div><p className="mt-2 text-[12px] text-ink/60">キーワード：{item.keywords.join("・")}</p><details className="mt-3 text-[12px]"><summary className="min-h-9 cursor-pointer font-bold text-ink/70">DM文章を確認</summary><p className="mt-2 whitespace-pre-wrap rounded-xl bg-ink/5 p-3 leading-6">{item.dm_text}</p></details></div>)}</div></div>
      <div className="rounded-2xl border border-lavender/20 bg-[#fcfaff] p-4"><h2 className="text-[17px] font-black text-ink">内容を確認して開始</h2><p className="mt-2 text-[12px] leading-6 text-ink/60">対象Reel・キーワード・画像・DM文章を確認してください。開始するとコメントへの自動返信が有効になります。</p><button type="button" className={`${buttonClass} mt-4`} disabled={busy || loading || Boolean(loadError) || (campaign.status !== "active" && (!listing?.metaConfigured || campaign.instagram_dm_assets.length === 0))} onClick={() => void run(async () => { const status = campaign.status === "active" ? "paused" : "active"; await requestJson("/api/admin/instagram-dm/campaigns", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: campaign.id, status }) }); setFeedback(status === "active" ? "自動返信を開始しました。" : "新規受付を停止しました。"); await refresh(); })}>{campaign.status === "active" ? "自動返信を一時停止" : campaign.status === "paused" ? "自動返信を再開" : "自動返信を開始"}</button></div>
    </div>}
    {view === "deliveries" && listing && <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-[17px] font-black text-ink">最近の送信状況</h2><p className="mt-2 text-[11px] text-ink/60">最近の最大100件を表示します。全期間の合計ではありません。</p></div><label className="text-[12px] font-bold text-ink/70">表示する状態<select value={deliveryFilter} onChange={(event) => setDeliveryFilter(event.target.value as "all" | "review")} className={inputClass}><option value="review">失敗・要確認</option><option value="all">すべて</option></select></label></div>
      {listing.deliveries.some((item) => item.follow_status === "unknown") && <p className="mb-4 rounded-xl bg-amber-50 p-3 text-[12px] leading-6 text-amber-900">フォロー判定が不明の送信があります。仕様により画像を送っています。Meta権限とトークンを確認してください。</p>}
      {visibleDeliveries.length === 0 && <p className="rounded-xl bg-[#fff7fa] p-5 text-[13px] text-ink/60">{deliveryFilter === "review" ? "取得した最近の送信に、失敗・要確認はありません。" : "送信履歴はまだありません。"}</p>}
      <div className="grid gap-3">{visibleDeliveries.map((item) => <div key={item.id} className="rounded-2xl border border-ink/10 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><strong className={`text-[13px] ${["failed", "needs_review"].includes(item.status) ? "text-red-700" : "text-ink"}`}>{deliveryLabels[item.status] ?? item.status}</strong><Link href={`/admin/instagram/dm/${item.campaign_id}`} className="inline-flex min-h-11 items-center text-[12px] font-bold text-pink underline">キャンペーン詳細</Link></div><p className="mt-1 text-[12px] text-ink/60">フォロー判定：{item.follow_status ? followLabels[item.follow_status] ?? item.follow_status : "未判定"}</p>{item.last_error && <p className="mt-2 break-words text-[12px] leading-6 text-red-700">{item.last_error}</p>}<details className="mt-3 text-[11px] text-ink/60"><summary className="min-h-9 cursor-pointer font-bold">処理の詳細</summary><p className="mt-2 break-all">コメントID：{item.comment_id}</p><p className="mt-1 break-all">処理ID：{item.id}</p></details></div>)}</div>
    </div>}
  </section>;
}
