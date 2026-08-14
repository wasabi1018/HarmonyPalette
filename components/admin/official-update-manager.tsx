"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BellRing, Check, Clock3, ExternalLink, Loader2, Play, RefreshCw, Save, Send, ShieldCheck, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { MonitorEvent, OfficialMonitorSettings } from "@/lib/official-monitor/types";

type DiffRow = {
  id: string;
  entity_type: "schedule" | "operation" | "operating-day";
  change_type: "added" | "modified" | "removed" | "unchanged" | "uncertain";
  match_confidence: number;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  field_changes: Record<string, { before: unknown; after: unknown }>;
};

type Props = {
  settings: OfficialMonitorSettings;
  events: MonitorEvent[];
  detail: { event: MonitorEvent; diffs: DiffRow[] } | null;
  setupError?: string;
};

const inputClass = "h-11 w-full rounded-xl border border-ink/10 bg-white px-3 text-[13px] font-bold text-ink outline-none transition focus:border-pink/50 focus:ring-2 focus:ring-pink/10";

function eventStatus(event: MonitorEvent) {
  if (event.reviewStatus === "reviewed") return { label: "反映済み", className: "bg-mint/20 text-[#35745f]" };
  if (event.reviewStatus === "ignored") return { label: "見送り", className: "bg-ink/5 text-ink/45" };
  if (event.eventType === "import-failed") return { label: "取込失敗", className: "bg-red-50 text-red-600" };
  if (event.eventType === "news") return { label: "通知のみ", className: "bg-sky/10 text-sky" };
  if (event.importRunId) return { label: "公開確認待ち", className: "bg-[#fff4df] text-[#9a6620]" };
  return { label: "取込待ち", className: "bg-pink/10 text-pink" };
}

function primaryLabel(row: DiffRow) {
  const data = row.after_data || row.before_data || {};
  if (row.entity_type === "schedule") return String(data.title || "予定");
  if (row.entity_type === "operation") return String(data.attraction_name || "アトラクション運行情報");
  return String(data.operation_date || "営業情報");
}

const changeLabels = { added: "追加", modified: "変更", removed: "削除候補", unchanged: "変更なし", uncertain: "対応不明" } as const;
const entityLabels = { schedule: "予定", operation: "運行", "operating-day": "営業" } as const;

async function api(path: string, init?: RequestInit) {
  const response = await fetch(path, { ...init, headers: { "content-type": "application/json", ...init?.headers } });
  const body = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(body.error || "処理に失敗しました。");
  return body;
}

export function OfficialUpdateManager({ settings: initialSettings, events, detail, setupError }: Props) {
  const router = useRouter();
  const [settings, setSettings] = useState(initialSettings);
  const [webhook, setWebhook] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const defaultSelection = useMemo(() => detail?.diffs.filter((diff) => ["added", "modified", "removed"].includes(diff.change_type)).map((diff) => diff.id) ?? [], [detail]);
  const [selected, setSelected] = useState(defaultSelection);
  const canDismiss = Boolean(detail?.event.importRunId)
    || detail?.event.eventType === "news"
    || (detail?.event.eventType === "import-failed" && detail.event.metadata.retry === false);
  useEffect(() => setSelected(defaultSelection), [defaultSelection]);

  async function act(name: string, operation: () => Promise<unknown>, success: string) {
    setBusy(name);
    setMessage(null);
    try {
      await operation();
      setMessage(success);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "処理に失敗しました。");
    } finally {
      setBusy(null);
    }
  }

  const timeOptions = Array.from({ length: 96 }, (_, index) => `${String(Math.floor(index / 4)).padStart(2, "0")}:${String((index % 4) * 15).padStart(2, "0")}`);

  return (
    <div className="space-y-5">
      {setupError && <div className="rounded-2xl border border-[#e8b26c]/30 bg-[#fff8ec] p-4 text-[12px] font-bold leading-6 text-[#8c5b18]"><TriangleAlert className="mr-2 inline" size={16} />{setupError}</div>}
      {message && <div role="status" className="rounded-2xl border border-pink/15 bg-white p-4 text-[12px] font-bold text-ink/65">{message}</div>}

      <section className="rounded-[24px] border border-pink/10 bg-white p-5 shadow-[0_12px_35px_rgba(62,53,64,0.05)] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-black tracking-[0.15em] text-pink"><ShieldCheck size={15} />MONITOR SETTINGS</p>
            <h2 className="mt-2 text-lg font-black text-ink">公式サイト更新監視</h2>
            <p className="mt-1 max-w-2xl text-[12px] font-bold leading-6 text-ink/50">変更があった日だけ公式データを確認待ちとして取り込みます。公開はこの画面で選択して確定するまで行われません。</p>
          </div>
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-3 rounded-xl bg-[#fff8fa] px-4 text-[12px] font-black text-ink">
            <input type="checkbox" checked={settings.enabled} onChange={(event) => setSettings({ ...settings, enabled: event.target.checked })} className="h-4 w-4 accent-pink" />自動監視を有効にする
          </label>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <label className="text-[11px] font-black text-ink/55">実行時刻（日本時間）<select value={settings.scheduledTime} onChange={(event) => setSettings({ ...settings, scheduledTime: event.target.value })} className={`${inputClass} mt-1`}>{timeOptions.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label className="text-[11px] font-black text-ink/55">監視範囲（日）<input type="number" min={1} max={31} value={settings.lookaheadDays} onChange={(event) => setSettings({ ...settings, lookaheadDays: Number(event.target.value) })} className={`${inputClass} mt-1`} /></label>
          <label className="text-[11px] font-black text-ink/55">原本保持（日）<input type="number" min={7} max={365} value={settings.retentionDays} onChange={(event) => setSettings({ ...settings, retentionDays: Number(event.target.value) })} className={`${inputClass} mt-1`} /></label>
          <label className="text-[11px] font-black text-ink/55">保存上限（MB）<input type="number" min={10} max={500} value={Math.round(settings.maxStorageBytes / 1024 / 1024)} onChange={(event) => setSettings({ ...settings, maxStorageBytes: Number(event.target.value) * 1024 * 1024 })} className={`${inputClass} mt-1`} /></label>
          <label className="text-[11px] font-black text-ink/55">Discord Webhook<input type="password" value={webhook} onChange={(event) => setWebhook(event.target.value)} placeholder={settings.discordConfigured ? "設定済み（変更時のみ入力）" : "未設定"} autoComplete="off" className={`${inputClass} mt-1`} /></label>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button disabled={Boolean(busy)} onClick={() => act("save", async () => {
            const body = await api("/api/admin/official-updates", { method: "PUT", body: JSON.stringify({ enabled: settings.enabled, scheduledTime: settings.scheduledTime, lookaheadDays: settings.lookaheadDays, retentionDays: settings.retentionDays, maxStorageMegabytes: Math.round(settings.maxStorageBytes / 1024 / 1024), discordWebhookUrl: webhook }) }) as { settings?: OfficialMonitorSettings };
            if (body.settings) setSettings(body.settings);
            setWebhook("");
          }, "監視設定を保存しました。") } className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-pink px-4 text-[12px] font-black text-white disabled:opacity-50">{busy === "save" ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />}設定を保存</button>
          <button disabled={Boolean(busy) || !settings.discordConfigured} onClick={() => act("test", () => api("/api/admin/official-updates/test-discord", { method: "POST" }), "Discordへテスト通知を送信しました。") } className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-pink/20 px-4 text-[12px] font-black text-pink disabled:opacity-40">{busy === "test" ? <Loader2 className="animate-spin" size={15} /> : <Send size={15} />}通知テスト</button>
          <button disabled={Boolean(busy)} onClick={() => act("run", () => api("/api/admin/official-updates/run", { method: "POST" }), "公式サイトを確認しました。") } className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-ink/10 px-4 text-[12px] font-black text-ink/60 disabled:opacity-40">{busy === "run" ? <Loader2 className="animate-spin" size={15} /> : <Play size={15} />}今すぐ確認</button>
          <span className="ml-auto text-[10px] font-bold leading-5 text-ink/40">最終成功: {settings.lastSucceededAt ? new Date(settings.lastSucceededAt).toLocaleString("ja-JP") : "未実行"}<br />次回予定: {settings.nextRunAt ? new Date(settings.nextRunAt).toLocaleString("ja-JP") : "設定保存後に計算"}</span>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
        <section className="rounded-[24px] border border-pink/10 bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-base font-black text-ink"><BellRing size={18} className="text-pink" />更新履歴</h2><button onClick={() => router.refresh()} className="grid h-9 w-9 place-items-center rounded-xl border border-ink/10 text-ink/45" aria-label="更新履歴を再読込"><RefreshCw size={15} /></button></div>
          <div className="mt-4 space-y-2">
            {events.length === 0 && <p className="rounded-xl bg-ink/[0.025] p-5 text-center text-[12px] font-bold text-ink/40">まだ更新は検出されていません。</p>}
            {events.map((event) => { const status = eventStatus(event); return <Link key={event.id} href={`/admin/official-updates?event=${event.id}`} className={`block rounded-xl border p-3 transition hover:border-pink/25 ${detail?.event.id === event.id ? "border-pink/30 bg-pink/[0.025]" : "border-ink/5"}`}>
              <div className="flex items-start gap-3"><Clock3 size={15} className="mt-0.5 shrink-0 text-ink/30" /><span className="min-w-0 flex-1"><span className="block text-[11px] font-black text-ink">{event.entityKey === "index" ? "公式お知らせ" : event.entityKey}</span><span className="mt-1 line-clamp-2 block text-[10px] font-bold leading-5 text-ink/45">{event.summary}</span><span className="mt-1 block text-[9px] font-bold text-ink/30">{new Date(event.createdAt).toLocaleString("ja-JP")}</span></span><span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black ${status.className}`}>{status.label}</span></div>
            </Link>; })}
          </div>
        </section>

        <section className="rounded-[24px] border border-pink/10 bg-white p-5 sm:p-6">
          {!detail ? <div className="grid min-h-56 place-items-center text-center"><div><ExternalLink className="mx-auto text-ink/20" size={28} /><p className="mt-3 text-[12px] font-bold text-ink/40">左の更新履歴を選ぶと、変更内容を確認できます。</p></div></div> : <>
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-black tracking-[0.15em] text-pink">UPDATE REVIEW</p><h2 className="mt-1 text-lg font-black text-ink">{detail.event.entityKey === "index" ? "公式お知らせの更新" : `${detail.event.entityKey} の変更`}</h2><p className="mt-1 text-[11px] font-bold text-ink/45">{detail.event.summary}</p></div><span className={`rounded-full px-3 py-1.5 text-[10px] font-black ${eventStatus(detail.event).className}`}>{eventStatus(detail.event).label}</span></div>
            {detail.diffs.length > 0 ? <div className="mt-5 space-y-2">{detail.diffs.map((row) => {
              const selectable = row.change_type !== "unchanged" && detail.event.reviewStatus === "pending";
              return <label key={row.id} className={`block rounded-xl border p-3 ${selected.includes(row.id) ? "border-pink/25 bg-[#fffafd]" : "border-ink/5"}`}><div className="flex items-start gap-3"><input type="checkbox" disabled={!selectable} checked={selected.includes(row.id)} onChange={() => setSelected((current) => current.includes(row.id) ? current.filter((id) => id !== row.id) : [...current, row.id])} className="mt-1 h-4 w-4 accent-pink" /><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><strong className="text-[12px] text-ink">{primaryLabel(row)}</strong><span className="rounded-full bg-ink/5 px-2 py-0.5 text-[9px] font-black text-ink/45">{entityLabels[row.entity_type]}</span><span className="rounded-full bg-pink/10 px-2 py-0.5 text-[9px] font-black text-pink">{changeLabels[row.change_type]}</span>{row.change_type === "uncertain" && <span className="text-[9px] font-black text-[#9a6620]">対応付けを目視確認してください</span>}</span>{Object.entries(row.field_changes || {}).length > 0 && <span className="mt-2 block space-y-1">{Object.entries(row.field_changes).map(([field, values]) => <span key={field} className="block text-[10px] font-bold text-ink/45"><span className="text-ink/60">{field}</span>: {String(values.before ?? "なし")} → <span className="text-pink">{String(values.after ?? "なし")}</span></span>)}</span>}</span></div></label>;
            })}</div> : <p className="mt-5 rounded-xl bg-ink/[0.025] p-5 text-[12px] font-bold text-ink/45">この更新は通知のみです。内容は公式サイトで確認してください。</p>}
            {detail.event.reviewStatus === "pending" && canDismiss && <div className="mt-5 flex flex-wrap gap-2"><button disabled={Boolean(busy) || !detail.event.importRunId} onClick={() => act("review", () => api(`/api/admin/official-updates/${detail.event.id}/review`, { method: "POST", body: JSON.stringify({ action: "publish", selectedDiffIds: selected }) }), "選択した変更を公開データへ反映しました。") } className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-pink px-4 text-[12px] font-black text-white disabled:opacity-40">{busy === "review" ? <Loader2 className="animate-spin" size={15} /> : <Check size={15} />}選択内容を反映</button><button disabled={Boolean(busy)} onClick={() => act("ignore", () => api(`/api/admin/official-updates/${detail.event.id}/review`, { method: "POST", body: JSON.stringify({ action: "ignore" }) }), "今回は反映せず、確認済みにしました。") } className="inline-flex min-h-11 items-center rounded-xl border border-ink/10 px-4 text-[12px] font-black text-ink/50 disabled:opacity-40">今回は反映しない</button></div>}
            {detail.event.reviewStatus === "pending" && !canDismiss && <p className="mt-5 rounded-xl bg-[#fff4df] px-4 py-3 text-[11px] font-bold text-[#8c5b18]">自動取り込みを処理中です。次の15分間隔の実行後に再確認してください。</p>}
          </>}
        </section>
      </div>
    </div>
  );
}
