import type { Metadata } from "next";
import Link from "next/link";
import { CakeSlice, ChevronRight, UsersRound } from "lucide-react";
import { CharacterOrderManager } from "@/components/character-order-manager";

export const metadata: Metadata = {
  title: "キャラクター管理",
  description: "キャラクターの基本情報、誕生日、表示順を管理する画面です。",
};

export default function AdminCharactersPage() {
  return (
    <div className="mx-auto max-w-[1240px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <nav aria-label="パンくずリスト" className="mb-3 flex items-center gap-1 text-[11px] font-bold text-ink/40">
        <Link href="/admin" className="hover:text-pink">管理トップ</Link>
        <ChevronRight size={12} aria-hidden="true" />
        <span aria-current="page">キャラクター</span>
      </nav>

      <div className="mb-5 rounded-[26px] border border-lavender/15 bg-gradient-to-br from-[#fff0f5] via-white to-[#f4f0fb] px-5 py-6 sm:px-8">
        <p className="flex items-center gap-2 text-[11px] font-black tracking-[0.18em] text-lavender">
          <UsersRound size={15} aria-hidden="true" />
          CHARACTER ADMIN
        </p>
        <h1 className="mt-2 font-display text-[28px] font-semibold text-ink sm:text-[36px]">
          キャラクター管理
        </h1>
        <p className="mt-2 flex max-w-[720px] items-start gap-2 text-[13px] font-bold leading-6 text-ink/55">
          <CakeSlice size={16} className="mt-1 shrink-0 text-pink" aria-hidden="true" />
          基本情報と誕生日、公開画面での表示順を管理します。誕生日は月・日のみ登録します。
        </p>
      </div>

      <CharacterOrderManager />
    </div>
  );
}
