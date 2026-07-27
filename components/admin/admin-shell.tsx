"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  FileText,
  Home,
  Menu,
  Settings,
  Tag,
  X,
} from "lucide-react";
import { useState } from "react";
import { AdminLogoutButton } from "./admin-logout-button";

type AdminShellProps = {
  children: React.ReactNode;
  userEmail: string;
};

const navigation = [
  { href: "/admin", label: "管理トップ", icon: Home, exact: true },
  { href: "/admin/schedule", label: "スケジュール", icon: CalendarDays, exact: false },
] as const;

const futureNavigation = [
  { label: "記事", icon: FileText },
  { label: "タグ", icon: Tag },
] as const;

function BrandLogo() {
  return (
    <div className="relative h-11 w-[172px] overflow-hidden" aria-label="Harmony Palette">
      <Image
        src="/logo.png"
        alt="Harmony Palette"
        width={220}
        height={147}
        priority
        className="absolute left-0 top-[-33px] h-auto w-[165px] max-w-none"
      />
    </div>
  );
}

function SidebarContent({
  pathname,
  userEmail,
  onNavigate,
}: {
  pathname: string;
  userEmail: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-pink/10 px-5 py-2.5">
        <Link href="/admin" onClick={onNavigate} className="flex justify-center">
          <BrandLogo />
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5" aria-label="管理メニュー">
        {navigation.map(({ href, label, icon: Icon, exact }) => {
          const active = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-[13px] font-black transition ${
                active
                  ? "bg-pink/10 text-pink"
                  : "text-ink/55 hover:bg-pink/5 hover:text-pink"
              }`}
            >
              <Icon size={18} strokeWidth={active ? 2.4 : 2} aria-hidden="true" />
              {label}
            </Link>
          );
        })}

        <div className="px-3 pb-1 pt-5 text-[9px] font-black tracking-[0.16em] text-ink/30">
          CONTENT
        </div>
        {futureNavigation.map(({ label, icon: Icon }) => (
          <div
            key={label}
            aria-disabled="true"
            className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-[13px] font-bold text-ink/30"
          >
            <Icon size={18} aria-hidden="true" />
            <span className="flex-1">{label}</span>
            <span className="rounded-full bg-lavender/10 px-2 py-0.5 text-[8px] font-black text-lavender">
              次フェーズ
            </span>
          </div>
        ))}
      </nav>

      <div className="border-t border-pink/10 p-3">
        <div className="flex items-center gap-3 rounded-xl bg-[#fff9fb] px-3 py-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-pink/10 text-[11px] font-black text-pink">
            HP
          </span>
          <span className="min-w-0 flex-1">
            <strong className="block truncate text-[11px] font-black text-ink">
              Harmony Palette 管理者
            </strong>
            <span className="mt-0.5 block truncate text-[9px] font-bold text-ink/40">
              {userEmail}
            </span>
          </span>
        </div>
        <div className="mt-1 grid grid-cols-[1fr_auto] items-center gap-1">
          <button
            type="button"
            disabled
            className="flex min-h-10 items-center gap-3 rounded-xl px-3 text-[12px] font-bold text-ink/30"
          >
            <Settings size={16} aria-hidden="true" />
            設定
          </button>
          <AdminLogoutButton compact />
        </div>
      </div>
    </div>
  );
}

export function AdminShell({ children, userEmail }: AdminShellProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#fffdfd] text-ink">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[232px] border-r border-pink/10 bg-white lg:block">
        <SidebarContent pathname={pathname} userEmail={userEmail} />
      </aside>

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-pink/10 bg-white/95 px-4 backdrop-blur-xl lg:hidden">
        <Link href="/admin" className="inline-flex" onClick={() => setMenuOpen(false)}>
          <BrandLogo />
        </Link>
        <button
          type="button"
          onClick={() => setMenuOpen((value) => !value)}
          aria-expanded={menuOpen}
          aria-controls="admin-mobile-menu"
          aria-label={menuOpen ? "管理メニューを閉じる" : "管理メニューを開く"}
          className="grid h-10 w-10 place-items-center rounded-xl border border-ink/10 text-ink transition hover:border-pink/30 hover:text-pink"
        >
          {menuOpen ? <X size={19} aria-hidden="true" /> : <Menu size={19} aria-hidden="true" />}
        </button>
      </header>

      {menuOpen && (
        <>
          <button
            type="button"
            aria-label="管理メニューを閉じる"
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 z-40 bg-ink/20 lg:hidden"
          />
          <aside
            id="admin-mobile-menu"
            className="fixed inset-y-0 left-0 z-50 w-[min(310px,88vw)] border-r border-pink/10 bg-white shadow-[16px_0_40px_rgba(62,53,64,0.12)] lg:hidden"
          >
            <SidebarContent
              pathname={pathname}
              userEmail={userEmail}
              onNavigate={() => setMenuOpen(false)}
            />
          </aside>
        </>
      )}

      <main className="min-w-0 lg:pl-[232px]">{children}</main>
    </div>
  );
}
