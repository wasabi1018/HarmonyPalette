import type { Metadata } from "next";
import Link from "next/link";
import { BellRing, ChevronRight } from "lucide-react";
import { OfficialUpdateManager } from "@/components/admin/official-update-manager";
import { getOfficialMonitorSettings, getOfficialUpdateEvent, listOfficialUpdateEvents } from "@/lib/official-monitor/repository";
import type { OfficialMonitorSettings } from "@/lib/official-monitor/types";

export const metadata: Metadata = {
  title: "公式サイト更新監視",
  description: "ハーモニーランド公式サイトの更新検出、Discord通知、差分確認を管理します。",
};

export const dynamic = "force-dynamic";

const fallbackSettings: OfficialMonitorSettings = {
  enabled: false,
  scheduledTime: "21:00",
  timezone: "Asia/Tokyo",
  lookaheadDays: 31,
  nextRunAt: null,
  lastStartedAt: null,
  lastSucceededAt: null,
  lastError: null,
  consecutiveFailures: 0,
  discordConfigured: false,
  discordWebhookMasked: null,
  retentionDays: 90,
  maxStorageBytes: 157_286_400,
};

export default async function OfficialUpdatesPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const { event: eventId } = await searchParams;
  let settings = fallbackSettings;
  let events: Awaited<ReturnType<typeof listOfficialUpdateEvents>> = [];
  let detail: Awaited<ReturnType<typeof getOfficialUpdateEvent>> = null;
  let setupError: string | undefined;
  try {
    [settings, events] = await Promise.all([getOfficialMonitorSettings(), listOfficialUpdateEvents()]);
    if (eventId) detail = await getOfficialUpdateEvent(eventId);
  } catch {
    setupError = "公式更新監視を利用するには、Supabaseで 202608150001_official_update_monitor.sql を適用してください。";
  }
  return <div className="mx-auto max-w-[1320px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
    <nav aria-label="パンくずリスト" className="mb-3 flex items-center gap-1 text-[11px] font-bold text-ink/40"><Link href="/admin" className="hover:text-pink">管理トップ</Link><ChevronRight size={12} /><span aria-current="page">公式更新監視</span></nav>
    <div className="mb-5 rounded-[26px] border border-pink/10 bg-gradient-to-br from-[#fff0f5] via-white to-[#f4f0fb] px-5 py-6 sm:px-8">
      <p className="flex items-center gap-2 text-[11px] font-black tracking-[0.18em] text-pink"><BellRing size={15} />OFFICIAL UPDATE MONITOR</p>
      <h1 className="mt-2 font-display text-[28px] font-semibold text-ink sm:text-[36px]">公式サイト更新監視</h1>
      <p className="mt-2 text-[13px] font-bold leading-6 text-ink/55">更新の検出、Discord通知、自動取り込みされた確認待ちデータの公開判断を行います。</p>
    </div>
    <OfficialUpdateManager settings={settings} events={events} detail={detail as Parameters<typeof OfficialUpdateManager>[0]["detail"]} setupError={setupError} />
  </div>;
}
