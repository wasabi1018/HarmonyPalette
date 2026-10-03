"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ChevronRight, Heart, Images, Instagram, LayoutGrid, MessageCircle, Settings2, UsersRound, type LucideIcon } from "lucide-react";
import { instagramTools, instagramToolHref } from "@/lib/instagram-admin-tools";

const icons: Record<typeof instagramTools[number]["icon"], LucideIcon> = { calendar: CalendarDays, heart: Heart, schedule: LayoutGrid, users: UsersRound, images: Images };

export function InstagramToolDirectory() {
  return <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
    {instagramTools.map((tool) => {
      const Icon = icons[tool.icon];
      return <Link key={tool.id} href={instagramToolHref(tool.id)} prefetch={false} className="group flex min-w-0 flex-col rounded-[22px] border border-pink/15 bg-white p-5 shadow-soft transition hover:border-pink/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pink/20">
        <div className="flex items-center justify-between gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-pink/10 text-pink"><Icon size={21} aria-hidden="true" /></span><ChevronRight size={18} className="text-ink/30 transition group-hover:text-pink" aria-hidden="true" /></div>
        <h3 className="mt-4 text-[15px] font-black text-ink">{tool.title}</h3>
        <p className="mt-2 flex-1 text-[12px] font-bold leading-6 text-ink/60">{tool.description}</p>
        <span className="mt-4 text-[11px] font-black text-pink">{tool.detail}</span>
      </Link>;
    })}
  </div>;
}

export function InstagramWorkspace({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const links = [
    { href: "/admin/instagram", label: "Instagramトップ", icon: Instagram, active: pathname === "/admin/instagram" },
    { href: "/admin/instagram/create", label: "作成ツール", icon: Images, active: pathname.startsWith("/admin/instagram/create") },
    { href: "/admin/instagram/dm", label: "DM運用", icon: MessageCircle, active: pathname.startsWith("/admin/instagram/dm") },
    { href: "/admin/instagram/settings", label: "設定", icon: Settings2, active: pathname.startsWith("/admin/instagram/settings") },
  ];
  return <div className="mx-auto max-w-[1420px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
    <nav aria-label="Instagram内のメニュー" className="mb-6 grid grid-cols-2 gap-2 rounded-2xl border border-pink/10 bg-[#fff7fa] p-2 sm:flex sm:flex-wrap">
      {links.map(({ href, label, icon: Icon, active }) => <Link key={href} href={href} prefetch={false} aria-current={active ? "page" : undefined} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-[12px] font-black transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pink/20 sm:px-4 ${active ? "bg-white text-pink shadow-sm" : "text-ink/60 hover:bg-white/70 hover:text-pink"}`}><Icon size={16} aria-hidden="true" />{label}</Link>)}
    </nav>
    {children}
  </div>;
}

export function InstagramPageHeading({ title, description, category }: { title: string; description: string; category?: "create" | "dm" | "settings" }) {
  return <header className="mb-6">
    <nav aria-label="パンくずリスト" className="mb-3 flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-ink/60">
      <Link href="/admin" className="hover:text-pink">管理トップ</Link><ChevronRight size={12} aria-hidden="true" />
      {title === "Instagram" ? <span aria-current="page">Instagram</span> : <><Link href="/admin/instagram" className="hover:text-pink">Instagram</Link><ChevronRight size={12} aria-hidden="true" />{category === "create" && <><Link href="/admin/instagram/create" className="hover:text-pink">作成ツール</Link><ChevronRight size={12} aria-hidden="true" /></>}<span aria-current="page">{title}</span></>}
    </nav>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="font-display text-[27px] font-semibold text-ink sm:text-[34px]">{title}</h1><p className="mt-2 max-w-[760px] text-[12px] font-bold leading-6 text-ink/60 sm:text-[13px]">{description}</p></div>
      {category === "create" && <Link href="/admin/instagram/create" prefetch={false} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-pink/20 bg-white px-4 text-[12px] font-black text-pink"><LayoutGrid size={16} aria-hidden="true" />別のツールを選ぶ</Link>}
    </div>
  </header>;
}
