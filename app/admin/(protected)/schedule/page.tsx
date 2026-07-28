import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Settings2 } from "lucide-react";
import { ScheduleJsonImporter } from "@/components/schedule-json-importer";
import { OfficialBatchImporter } from "@/components/official-batch-importer";
import { ScheduleManager, ScheduleManagerNotice } from "@/components/schedule-manager";
import { getSupabaseConfigStatus } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "スケジュール管理",
  description: "イベントとグリーティングを管理する画面です。",
};

export default function AdminSchedulePage() {
  const config = getSupabaseConfigStatus();
  return (
    <div className="mx-auto max-w-[1240px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <nav aria-label="パンくずリスト" className="mb-3 flex items-center gap-1 text-[11px] font-bold text-ink/40"><Link href="/admin" className="hover:text-pink">管理トップ</Link><ChevronRight size={12} aria-hidden="true" /><span aria-current="page">スケジュール</span></nav>
      <div className="mb-5 rounded-[26px] border border-pink/10 bg-gradient-to-br from-[#fff0f5] via-white to-[#f4f0fb] px-5 py-6 sm:px-8">
        <p className="flex items-center gap-2 text-[11px] font-black tracking-[0.18em] text-pink"><Settings2 size={15} aria-hidden="true" />SCHEDULE ADMIN</p>
        <h1 className="mt-2 font-display text-[28px] font-semibold text-ink sm:text-[36px]">スケジュール管理</h1>
        <p className="mt-2 text-[13px] font-bold leading-6 text-ink/55">イベントとグリーティングを管理し、公開画面へ反映します。</p>
      </div>
      <ScheduleManagerNotice />
      <OfficialBatchImporter config={{ canWrite: config.canWrite, hasPublicKey: config.hasPublicKey, hasSecretKey: config.hasSecretKey }} />
      <ScheduleJsonImporter />
      <ScheduleManager />
    </div>
  );
}
