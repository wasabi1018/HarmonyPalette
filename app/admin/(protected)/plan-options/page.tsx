import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, ListTree } from "lucide-react";
import { PlanOptionsManager } from "@/components/admin/plan-options-manager";

export const metadata: Metadata = {
  title: "マイプラン候補管理",
  description: "自由予定で選択できるアトラクションと施設を管理する画面です。",
};

export default function AdminPlanOptionsPage() {
  return (
    <div className="mx-auto max-w-[1240px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <nav aria-label="パンくずリスト" className="mb-3 flex items-center gap-1 text-[11px] font-bold text-ink/40">
        <Link href="/admin" className="hover:text-pink">管理トップ</Link>
        <ChevronRight size={12} aria-hidden="true" />
        <span aria-current="page">マイプラン候補</span>
      </nav>
      <div className="mb-5 rounded-[26px] border border-lavender/15 bg-gradient-to-br from-[#fff0f5] via-white to-[#f4f0fb] px-5 py-6 sm:px-8">
        <p className="flex items-center gap-2 text-[11px] font-black tracking-[0.18em] text-lavender">
          <ListTree size={15} aria-hidden="true" />MY PLAN OPTIONS
        </p>
        <h1 className="mt-2 font-display text-[28px] font-semibold text-ink sm:text-[36px]">マイプラン候補管理</h1>
        <p className="mt-2 max-w-[720px] text-[13px] font-bold leading-6 text-ink/55">
          自由予定で選べるアトラクションと施設を登録します。アトラクションに既定の施設を設定すると、選択時に場所も自動入力されます。
        </p>
      </div>
      <PlanOptionsManager />
    </div>
  );
}
