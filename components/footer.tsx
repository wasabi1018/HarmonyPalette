import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Heart } from "lucide-react";
import { informationNavigation, mainNavigation } from "@/lib/navigation";
import { HARMONYLAND_OFFICIAL_URL } from "@/lib/site-config";

export function Footer() {
  return (
    <footer className="mt-12 border-t border-pink/10 bg-white">
      <div className="mx-auto grid max-w-[1200px] gap-7 px-4 py-8 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.15fr_.7fr_.9fr_1fr] lg:px-8">
        <div>
          <div className="relative h-14 w-[220px] overflow-hidden" aria-label="Harmony Palette ロゴ">
            <Image
              src="/logo-compact.png"
              alt="Harmony Palette"
              fill
              className="object-contain object-center"
              sizes="220px"
            />
          </div>
          <p className="mt-3 max-w-sm text-[13px] leading-6 text-ink/55">
            ハーモニーランドへ行く前も、行ったあとも。知りたい情報をやさしく整理するファンサイトです。
          </p>
          <p className="mt-3 flex items-center gap-2 text-[11px] font-bold text-pink">
            <Heart size={13} fill="currentColor" aria-hidden="true" />
            楽しい思い出づくりを応援します
          </p>
        </div>
        <div>
          <p className="text-[10px] font-black tracking-[0.18em] text-ink/35">EXPLORE</p>
          <nav className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 lg:grid-cols-1" aria-label="フッターナビゲーション">
            {mainNavigation.slice(0, 5).map((item) => (
              <Link key={item.href} href={item.href} className="text-[13px] font-bold text-ink/65 hover:text-pink">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div>
          <p className="text-[10px] font-black tracking-[0.18em] text-ink/35">INFORMATION</p>
          <nav className="mt-3 grid gap-y-2" aria-label="サイト情報">
            {informationNavigation.map((item) => (
              <Link key={item.href} href={item.href} className="text-[13px] font-bold text-ink/65 hover:text-pink">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div>
          <p className="text-[10px] font-black tracking-[0.18em] text-ink/35">OFFICIAL SOURCE</p>
          <p className="mt-3 text-[13px] leading-6 text-ink/55">
            最新かつ正確な情報は、必ず公式サイトでご確認ください。
          </p>
          <a
            href={HARMONYLAND_OFFICIAL_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-2 text-[13px] font-black text-pink hover:underline"
          >
            ハーモニーランド公式サイト
            <ExternalLink size={13} aria-hidden="true" />
          </a>
        </div>
      </div>
      <div className="border-t border-pink/10 bg-[#fffafd]">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-2 px-4 py-4 text-[10px] leading-5 text-ink/50 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <p>
            Harmony Paletteは、ハーモニーランドを応援する非公式ファンサイトです。株式会社サンリオおよびハーモニーランドとは関係ありません。
          </p>
          <p className="shrink-0">© Harmony Palette</p>
        </div>
      </div>
    </footer>
  );
}
