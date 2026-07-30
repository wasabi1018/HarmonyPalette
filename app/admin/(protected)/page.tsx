import type { Metadata } from "next";
import Link from "next/link";
import {
  BarChart3,
  CalendarDays,
  ChevronRight,
  FileText,
  Instagram,
  ListTree,
  Settings2,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

export const metadata: Metadata = {
  title: "管理トップ",
  description: "Harmony Paletteの管理トップページです。",
};

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-[1120px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-col gap-4 border-b border-pink/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-black tracking-[0.18em] text-pink">
            <Settings2 size={15} aria-hidden="true" />
            ADMIN HOME
          </p>
          <h1 className="mt-2 font-display text-[30px] font-semibold text-ink sm:text-[36px]">
            管理トップ
          </h1>
          <p className="mt-2 text-[13px] font-bold leading-6 text-ink/50">
            Harmony Paletteの公開情報を、安全に確認・管理できます。
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-mint/10 px-3 py-2 text-[10px] font-black text-[#35745f]">
          <ShieldCheck size={14} aria-hidden="true" />
          管理者としてログイン中
        </span>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Link
          href="/admin/plan-options"
          className="group flex items-center gap-4 rounded-[22px] border border-mint/15 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-mint/30"
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-mint/10 text-[#4d987a]">
            <ListTree size={22} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <strong className="block text-[15px] font-black text-ink">
              マイプラン候補管理
            </strong>
            <span className="mt-1 block text-[11px] font-bold leading-5 text-ink/45">
              自由予定で選べるアトラクションと施設を管理
            </span>
          </span>
          <ChevronRight
            size={18}
            className="shrink-0 text-[#4d987a] transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>

        <Link
          href="/admin/instagram"
          className="group flex items-center gap-4 rounded-[22px] border border-pink/10 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-pink/25"
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-pink/10 text-pink">
            <Instagram size={22} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <strong className="block text-[15px] font-black text-ink">
              Instagram画像作成
            </strong>
            <span className="mt-1 block text-[11px] font-bold leading-5 text-ink/45">
              週次画像・月分セット・投稿文をまとめて作成
            </span>
          </span>
          <ChevronRight
            size={18}
            className="shrink-0 text-pink transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>

        <Link
          href="/admin/schedule"
          className="group flex items-center gap-4 rounded-[22px] border border-pink/10 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-pink/25"
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-pink/10 text-pink">
            <CalendarDays size={22} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <strong className="block text-[15px] font-black text-ink">
              スケジュール管理
            </strong>
            <span className="mt-1 block text-[11px] font-bold leading-5 text-ink/45">
              イベント、グリーティング、公開予定を管理
            </span>
          </span>
          <ChevronRight
            size={18}
            className="shrink-0 text-pink transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>

        <Link
          href="/admin/characters"
          className="group flex items-center gap-4 rounded-[22px] border border-sky/15 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-sky/30"
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-sky/10 text-sky">
            <UsersRound size={22} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <strong className="block text-[15px] font-black text-ink">
              キャラクター管理
            </strong>
            <span className="mt-1 block text-[11px] font-bold leading-5 text-ink/45">
              基本情報、誕生日、公開画面の表示順を管理
            </span>
          </span>
          <ChevronRight
            size={18}
            className="shrink-0 text-sky transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>

        <Link
          href="/admin/articles"
          className="group flex items-center gap-4 rounded-[22px] border border-lavender/15 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-lavender/30"
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-lavender/10 text-lavender">
            <FileText size={22} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <strong className="block text-[15px] font-black text-ink">
              記事管理
            </strong>
            <span className="mt-1 block text-[11px] font-bold leading-5 text-ink/45">
              記事の作成、画像・リンク編集、プレビュー、タグ管理
            </span>
          </span>
          <ChevronRight
            size={18}
            className="shrink-0 text-lavender transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>

        <Link
          href="/admin/analytics"
          className="group flex items-center gap-4 rounded-[22px] border border-mint/15 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-mint/30"
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-mint/10 text-[#4d987a]">
            <BarChart3 size={22} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <strong className="block text-[15px] font-black text-ink">
              記事アクセス分析
            </strong>
            <span className="mt-1 block text-[11px] font-bold leading-5 text-ink/45">
              閲覧推移、人気記事、期間別CSVを確認
            </span>
          </span>
          <ChevronRight
            size={18}
            className="shrink-0 text-[#4d987a] transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>
      </div>
    </div>
  );
}
