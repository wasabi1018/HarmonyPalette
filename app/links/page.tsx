import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  ChevronRight,
  Home,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { getLinkPageSettings } from "@/lib/link-page-settings";

export const metadata: Metadata = {
  title: "リンク集",
  description: "Harmony Paletteの今日の予定、初めての方向け情報、最新記事、楽天ROOMへのリンク集です。",
  alternates: { canonical: "/links" },
  robots: { index: false, follow: true },
};

export const revalidate = 300;

const internalLinks = [
  {
    href: "/#today-schedule",
    label: "今日の予定を見る",
    detail: "TOPページの今日のスケジュールへ",
    icon: CalendarDays,
    primary: true,
  },
  {
    href: "/guide",
    label: "初めての方へ",
    detail: "ハーモニーランドを楽しむ準備",
    icon: Sparkles,
    primary: false,
  },
  {
    href: "/articles",
    label: "最新記事を見る",
    detail: "おでかけに役立つ情報をチェック",
    icon: BookOpen,
    primary: false,
  },
] as const;

export default async function LinksPage() {
  const { rakutenRoomUrl } = await getLinkPageSettings();

  return (
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-[#fff8fb] text-ink">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-pink/10 bg-white/95 px-4 backdrop-blur-xl sm:h-16 sm:px-6">
        <Link href="/" aria-label="Harmony Palette トップへ" className="relative h-10 w-[156px] sm:w-[180px]">
          <Image
            src="/logo-compact.png"
            alt="Harmony Palette"
            fill
            priority
            className="object-contain object-left"
            sizes="(max-width: 639px) 156px, 180px"
          />
        </Link>
        <Link
          href="/"
          aria-label="サイトTOPへ"
          className="inline-flex h-10 items-center gap-1.5 rounded-full border border-pink/20 bg-white px-3 text-[10px] font-black text-pink transition hover:bg-pink/5"
        >
          <Home size={16} aria-hidden="true" />
          <span className="hidden min-[360px]:inline">サイトTOP</span>
        </Link>
      </header>

      <main className="mx-auto flex min-h-0 w-full max-w-[540px] flex-1 flex-col justify-start px-4 py-[clamp(10px,2.2dvh,20px)] sm:px-6">
        <div className="shrink-0 text-center">
          <p className="text-[9px] font-black tracking-[0.2em] text-pink sm:text-[10px]">INSTAGRAM LINKS</p>
          <h1 className="mt-1 font-display text-[clamp(21px,3.5dvh,30px)] font-semibold leading-tight text-ink">
            Harmony Paletteへようこそ
          </h1>
          <p className="mt-1 text-[clamp(10px,1.55dvh,12px)] font-bold leading-5 text-ink/50">
            今日の予定やおすすめ情報を、ここからすぐに見られます。
          </p>
        </div>

        <nav
          aria-label="Harmony Palette リンク集"
          className="mt-[clamp(8px,2dvh,16px)] grid shrink-0 gap-[clamp(6px,1.2dvh,10px)]"
        >
          {internalLinks.map(({ href, label, detail, icon: Icon, primary }) => (
            <Link
              key={href}
              href={href}
              className={`group flex min-h-[clamp(54px,8.5dvh,72px)] items-center gap-3 rounded-[20px] border px-3.5 transition hover:-translate-y-0.5 ${primary
                ? "border-pink bg-pink text-white shadow-[0_8px_22px_rgba(235,110,152,0.22)]"
                : "border-pink/15 bg-white text-ink shadow-soft hover:border-pink/35"
              }`}
            >
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${primary ? "bg-white/[0.18]" : "bg-pink/[0.08] text-pink"}`}>
                <Icon size={19} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-[clamp(13px,2dvh,16px)] font-black leading-5">{label}</strong>
                <span className={`mt-0.5 block truncate text-[9px] font-bold ${primary ? "text-white/75" : "text-ink/40"}`}>
                  {detail}
                </span>
              </span>
              <ChevronRight size={17} className={primary ? "text-white" : "text-pink"} aria-hidden="true" />
            </Link>
          ))}

          {rakutenRoomUrl ? (
            <a
              href={rakutenRoomUrl}
              target="_blank"
              rel="sponsored noreferrer"
              className="group flex min-h-[clamp(58px,9dvh,76px)] items-center gap-3 rounded-[20px] border border-[#f3c9bc] bg-white px-3.5 text-ink shadow-soft transition hover:-translate-y-0.5 hover:border-pink/40"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#fff3e9] text-pink">
                <ShoppingBag size={19} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-[clamp(13px,2dvh,16px)] font-black leading-5">楽天ROOMでおすすめを見る</strong>
                <span className="mt-0.5 block truncate text-[9px] font-bold text-ink/40">愛用品や気になるグッズをまとめています</span>
              </span>
              <ArrowUpRight size={17} className="text-pink" aria-hidden="true" />
            </a>
          ) : (
            <div
              aria-disabled="true"
              className="flex min-h-[clamp(58px,9dvh,76px)] items-center gap-3 rounded-[20px] border border-dashed border-pink/20 bg-white/65 px-3.5 text-ink/45"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#fff3e9] text-pink/50">
                <ShoppingBag size={19} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-[clamp(13px,2dvh,16px)] font-black leading-5">楽天ROOM</strong>
                <span className="mt-0.5 block text-[9px] font-bold text-ink/35">リンクを準備中です</span>
              </span>
            </div>
          )}
        </nav>

        <footer className="mt-[clamp(7px,1.5dvh,12px)] shrink-0 text-center text-[8px] font-bold leading-4 text-ink/35">
          <p>楽天ROOMへの外部リンクを含みます</p>
          <p className="tracking-[0.08em]">@harmony__palette</p>
        </footer>
      </main>
    </div>
  );
}
