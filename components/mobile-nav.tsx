"use client";

import Link from "next/link";
import { BookOpen, CalendarDays, ChevronRight, ClipboardList, Home, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { mainNavigation } from "@/lib/navigation";

const items = [
  { label: "ホーム", href: "/", icon: Home },
  { label: "予定を探す", href: "/schedule", icon: CalendarDays },
  { label: "マイプラン", href: "/plan", icon: ClipboardList },
  { label: "記事", href: "/articles", icon: BookOpen },
  { label: "メニュー", href: "#menu", icon: Menu },
];

const quickNavHrefs = new Set(items.filter((item) => item.href !== "#menu").map((item) => item.href));
const menuItems = mainNavigation.filter((item) => !quickNavHrefs.has(item.href));

export function MobileNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      {menuOpen && (
        <>
          <button type="button" aria-label="メニューを閉じる" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-[55] bg-ink/20 lg:hidden" />
          <div role="dialog" aria-label="その他のメニュー" className="fixed inset-x-3 bottom-[82px] z-[60] rounded-[24px] border border-pink/15 bg-white/95 p-4 shadow-[0_10px_36px_rgba(85,58,78,0.16)] backdrop-blur-xl lg:hidden">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-ink">その他のメニュー</p>
                <p className="mt-0.5 text-[11px] font-bold text-ink/45">下部ナビにないページを表示しています</p>
              </div>
              <button type="button" aria-label="メニューを閉じる" onClick={() => setMenuOpen(false)} className="grid h-8 w-8 place-items-center rounded-full bg-pink/10 text-pink">
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {menuItems.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className="flex min-h-12 items-center justify-between rounded-xl bg-[#fff9fb] px-3 py-3 text-xs font-black text-ink">
                  <span>{item.label}</span>
                  <ChevronRight size={14} className="text-pink" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
      <nav className="fixed inset-x-3 bottom-3 z-[60] grid grid-cols-5 rounded-[24px] border border-pink/15 bg-white/95 p-2 shadow-[0_10px_36px_rgba(85,58,78,0.16)] backdrop-blur-xl lg:hidden" aria-label="モバイル用下部ナビゲーション">
        {items.map(({ label, href, icon: Icon }) => {
          const active = href !== "#menu" && pathname === href;
          if (href === "#menu") return <button key={label} type="button" onClick={() => setMenuOpen((value) => !value)} aria-expanded={menuOpen} className={`flex min-h-[50px] flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-black transition-colors ${menuOpen ? "bg-pink/10 text-pink" : "text-ink/55 hover:bg-pink/5 hover:text-pink"}`}>
            <Icon size={19} strokeWidth={menuOpen ? 2.5 : 2} aria-hidden="true" />
            {label}
          </button>;
          return <Link key={label} href={href} tabIndex={menuOpen ? -1 : undefined} aria-hidden={menuOpen || undefined} className={`flex min-h-[50px] flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-black transition-[color,background-color,opacity] ${menuOpen ? "pointer-events-none opacity-35" : active ? "bg-pink/10 text-pink" : "text-ink/55 hover:bg-pink/5 hover:text-pink"}`}>
            <Icon size={19} strokeWidth={active ? 2.5 : 2} aria-hidden="true" />
            {label}
          </Link>;
        })}
      </nav>
    </>
  );
}
