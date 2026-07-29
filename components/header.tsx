"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ChevronRight, Menu, X } from "lucide-react";
import { useState } from "react";
import { mainNavigation } from "@/lib/navigation";

export function Header() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-pink/10 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center" onClick={() => setIsOpen(false)}>
          <div className="relative h-11 w-[154px] shrink-0 overflow-hidden sm:w-[188px]" aria-label="Harmony Palette ロゴ">
            <Image
              src="/logo-compact.png"
              alt="Harmony Palette"
              fill
              priority
              className="object-contain object-center"
              sizes="(max-width: 639px) 154px, 188px"
            />
          </div>
        </Link>

        <nav className="hidden items-center gap-0.5 xl:flex" aria-label="メインナビゲーション">
          {mainNavigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-2.5 py-2 text-[12px] font-bold transition-colors ${isActive ? "bg-pink/10 text-pink" : "text-ink/65 hover:bg-pink/5 hover:text-pink"}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/schedule"
            className="hidden min-h-10 items-center gap-2 rounded-full bg-ink px-4 text-[12px] font-bold text-white shadow-soft transition-transform hover:-translate-y-0.5 lg:flex"
          >
            <CalendarDays size={15} aria-hidden="true" />
            今日の予定
          </Link>
          <button
            type="button"
            aria-label={isOpen ? "メニューを閉じる" : "メニューを開く"}
            aria-expanded={isOpen}
            onClick={() => setIsOpen((value) => !value)}
            className="hidden h-10 w-10 place-items-center rounded-full border border-ink/10 text-ink transition-colors hover:border-pink/30 hover:text-pink lg:grid xl:hidden"
          >
            {isOpen ? <X size={19} aria-hidden="true" /> : <Menu size={19} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="hidden border-t border-pink/10 bg-white px-4 py-3 lg:block xl:hidden">
          <nav className="mx-auto grid max-w-[1200px] grid-cols-2 gap-1" aria-label="タブレットナビゲーション">
            {mainNavigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="flex min-h-11 items-center justify-between rounded-xl px-3 py-2.5 text-[13px] font-bold text-ink hover:bg-pink/5"
              >
                {item.label}
                <ChevronRight size={15} className="text-pink" aria-hidden="true" />
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
