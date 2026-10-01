"use client";

import { useEffect, useState, type FormEvent } from "react";

type Asset = { id: string; character_name: string; keywords: string[]; image_path: string; image_url: string; dm_text: string };
type Campaign = { id: string; month: string; reel_media_id: string; status: "draft" | "active" | "paused"; instagram_dm_assets: Asset[] };
type Delivery = { id: string; campaign_id: string; status: string; comment_id: string; follow_status: string | null; last_error: string | null };
type Listing = { campaigns: Campaign[]; deliveries: Delivery[]; metaConfigured: boolean };
type PreparedAsset = { month: string; characterName: string; keywords: string; dmText: string; file: File };

const inputClass = "min-h-10 w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm text-ink";
const buttonClass = "rounded-xl bg-pink px-4 py-2 text-sm font-bold text-white disabled:opacity-50";

async function requestJson(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "通信に失敗しました。");
  return data;
}

export function InstagramDmCampaignManager() {
  const [listing, setListing] = useState<Listing | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [month, setMonth] = useState("");
  const [reelMediaId, setReelMediaId] = useState("");
  const [characterName, setCharacterName] = useState("");
  const [keywords, setKeywords] = useState("");
  const [dmText, setDmText] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");

  async function refresh() {
    const data = await requestJson("/api/admin/instagram-dm/campaigns") as Listing;
    setListing(data);
    setSelectedCampaignId((current) => data.campaigns.some((campaign) => campaign.id === current && campaign.status === "draft")
      ? current : data.campaigns.find((campaign) => campaign.status === "draft")?.id || "");
  }

  useEffect(() => {
    void refresh().catch((error) => setFeedback(error instanceof Error ? error.message : "読み込みに失敗しました。"));
  }, []);

  useEffect(() => {
    const onPrepared = (event: Event) => {
      const detail = (event as CustomEvent<PreparedAsset>).detail;
      if (!detail?.file) return;
      setMonth(detail.month);
      setCharacterName(detail.characterName);
      setKeywords(detail.keywords);
      setDmText(detail.dmText);
      setImage(detail.file);
      setSelectedCampaignId(listing?.campaigns.find((campaign) => campaign.status === "draft" && campaign.month === detail.month)?.id || "");
      setFeedback("画像と文言を受け取りました。対象月の下書きを選び、内容を確認してください。");
    };
    window.addEventListener("harmony:instagram-dm-asset", onPrepared);
    return () => window.removeEventListener("harmony:instagram-dm-asset", onPrepared);
  }, [listing]);

  async function createCampaign(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setFeedback("");
    try {
      const data = await requestJson("/api/admin/instagram-dm/campaigns", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, reelMediaId }),
      }) as { id: string };
      await refresh();
      setSelectedCampaignId(data.id);
      setFeedback("下書きを作成しました。キャラクターの画像と文言を登録してください。");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "作成に失敗しました。");
    } finally {
      setBusy(false);
    }
  }

  async function addAsset(event: FormEvent) {
    event.preventDefault();
    if (!image) return;
    setBusy(true);
    setFeedback("");
    try {
      const form = new FormData();
      form.set("campaignId", selectedCampaignId);
      form.set("characterName", characterName);
      form.set("keywords", keywords);
      form.set("dmText", dmText);
      form.set("image", image);
      await requestJson("/api/admin/instagram-dm/assets", { method: "POST", body: form });
      await refresh();
      setCharacterName("");
      setKeywords("");
      setDmText("");
      setImage(null);
      const fileInput = document.getElementById("instagram-dm-image") as HTMLInputElement | null;
      if (fileInput) fileInput.value = "";
      setFeedback("画像と文言を登録しました。");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "登録に失敗しました。");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(id: string, status: "active" | "paused") {
    setBusy(true);
    setFeedback("");
    try {
      await requestJson("/api/admin/instagram-dm/campaigns", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      await refresh();
      setFeedback(status === "active" ? "自動返信を開始しました。" : "新規受付を停止しました。");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "更新に失敗しました。");
    } finally {
      setBusy(false);
    }
  }

  const draftCampaigns = listing?.campaigns.filter((campaign) => campaign.status === "draft") || [];
  const unknownFollowCount = listing?.deliveries.filter((delivery) => delivery.follow_status === "unknown").length || 0;
  return (
    <section id="instagram-dm-manager" className="mb-7 scroll-mt-6 rounded-[28px] border border-pink/15 bg-white p-4 shadow-soft sm:p-6 lg:p-7">
      <div className="mb-5">
        <p className="text-[10px] font-black tracking-[0.16em] text-pink">COMMENT TO DM</p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="mt-1 text-[22px] font-black text-ink">コメントからランキング画像を自動送信</h2>
          <button type="button" onClick={() => void refresh().catch((error) => setFeedback(error instanceof Error ? error.message : "更新に失敗しました。"))}
            className="rounded-xl border border-ink/15 px-3 py-2 text-xs font-bold text-ink">送信状況を更新</button>
        </div>
        <p className="mt-2 text-xs leading-6 text-ink/60">
          Reelごとに対象月を設定し、上の「自動DM用にセット」で生成したPNGとDM文言をキャラクター別に登録します。
          下書きは送信されません。開始前にMeta連携とテストアカウントで確認してください。
        </p>
        {listing && !listing.metaConfigured && <p className="mt-2 text-xs font-bold text-red-700">Meta APIの環境変数が未設定です。</p>}
        {unknownFollowCount > 0 && <p className="mt-2 text-xs font-bold text-amber-800">
          最近の{unknownFollowCount}件でフォロー判定が不明でした。仕様により画像を送っています。Meta権限とトークンを確認してください。
        </p>}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <form onSubmit={(event) => void createCampaign(event)} className="rounded-2xl border border-ink/10 p-4">
          <h3 className="font-bold text-ink">1. Reelの下書きを作成</h3>
          <label className="mt-3 block text-xs font-bold text-ink/70">対象月
            <input className={`${inputClass} mt-1`} type="month" value={month} onChange={(event) => setMonth(event.target.value)} required />
          </label>
          <label className="mt-3 block text-xs font-bold text-ink/70">ReelのメディアID（URLではありません）
            <input className={`${inputClass} mt-1`} value={reelMediaId} onChange={(event) => setReelMediaId(event.target.value)} placeholder="1784…" required />
          </label>
          <button className={`${buttonClass} mt-4`} disabled={busy}>下書きを作成</button>
        </form>

        <form onSubmit={(event) => void addAsset(event)} className="rounded-2xl border border-ink/10 p-4">
          <h3 className="font-bold text-ink">2. キャラクター画像を追加</h3>
          <label className="mt-3 block text-xs font-bold text-ink/70">下書きキャンペーン
            <select className={`${inputClass} mt-1`} value={selectedCampaignId} onChange={(event) => setSelectedCampaignId(event.target.value)} required>
              <option value="">選択してください</option>
              {draftCampaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.month} / {campaign.reel_media_id}</option>)}
            </select>
          </label>
          <label className="mt-3 block text-xs font-bold text-ink/70">キャラクター名
            <input className={`${inputClass} mt-1`} value={characterName} onChange={(event) => setCharacterName(event.target.value)} placeholder="クロミ" required />
          </label>
          <label className="mt-3 block text-xs font-bold text-ink/70">反応するワード（カンマ区切り）
            <input className={`${inputClass} mt-1`} value={keywords} onChange={(event) => setKeywords(event.target.value)} placeholder="クロミ, くろみ" required />
          </label>
          <label className="mt-3 block text-xs font-bold text-ink/70">ランキングPNG
            <input id="instagram-dm-image" className={`${inputClass} mt-1`} type="file" accept="image/png" onChange={(event) => setImage(event.target.files?.[0] || null)} />
            {image && <span className="mt-1 block font-normal">選択中：{image.name}</span>}
          </label>
          <label className="mt-3 block text-xs font-bold text-ink/70">DM文言
            <textarea className={`${inputClass} mt-1 min-h-32`} value={dmText} onChange={(event) => setDmText(event.target.value)} required />
          </label>
          <button className={`${buttonClass} mt-4`} disabled={busy || !selectedCampaignId || !image}>画像と文言を登録</button>
        </form>
      </div>

      {feedback && <p role="status" className="mt-4 rounded-xl bg-lavender/10 p-3 text-xs font-bold text-ink">{feedback}</p>}

      <div className="mt-6 space-y-3">
        <h3 className="font-bold text-ink">3. 内容を確認して開始</h3>
        {listing?.campaigns.map((campaign) => (
          <div key={campaign.id} className="rounded-2xl border border-ink/10 p-4 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-bold text-ink">{campaign.month} / Reel {campaign.reel_media_id} / {campaign.status}</p>
              <button className={buttonClass} disabled={busy || (campaign.status === "draft" && !campaign.instagram_dm_assets.length)}
                onClick={() => void setStatus(campaign.id, campaign.status === "active" ? "paused" : "active")}>
                {campaign.status === "active" ? "停止" : "開始"}
              </button>
            </div>
            <ul className="mt-2 list-disc pl-5 text-ink/60">
              {campaign.instagram_dm_assets.map((asset) => (
                <li key={asset.id} className="mb-2">
                  {asset.character_name}：{asset.keywords.join("・")}
                  <a href={asset.image_url} target="_blank" rel="noopener noreferrer" className="ml-2 font-bold text-pink underline">画像を確認</a>
                  <details className="mt-1"><summary className="cursor-pointer font-bold">DM文言を確認</summary><p className="whitespace-pre-wrap rounded-lg bg-ink/5 p-2">{asset.dm_text}</p></details>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-ink/50">最近の処理：{listing.deliveries.filter((delivery) => delivery.campaign_id === campaign.id).length}件</p>
          </div>
        ))}
      </div>

      {listing && listing.deliveries.length > 0 && (
        <div className="mt-6 overflow-x-auto">
          <h3 className="mb-2 font-bold text-ink">最近の送信状況</h3>
          <table className="w-full min-w-[600px] text-left text-xs">
            <thead><tr><th className="p-2">コメントID</th><th className="p-2">状態</th><th className="p-2">フォロー判定</th><th className="p-2">エラー</th></tr></thead>
            <tbody>{listing.deliveries.slice(0, 30).map((delivery) => (
              <tr key={delivery.id} className="border-t border-ink/10"><td className="p-2">{delivery.comment_id}</td><td className={`p-2 ${["failed", "needs_review"].includes(delivery.status) ? "font-bold text-red-700" : ""}`}>{delivery.status}</td><td className="p-2">{delivery.follow_status || "未判定"}</td><td className="p-2">{delivery.last_error || "—"}</td></tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}
