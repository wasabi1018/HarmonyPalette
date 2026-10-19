import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Settings2, ShieldCheck } from "lucide-react";
import { adminSections } from "@/lib/admin-navigation";

export const metadata: Metadata = {
  title: "管理トップ",
  description: "Harmony Paletteの管理トップページです。",
};

const cardStyles = {
  mint: {
    card: "border-mint/15 hover:border-mint/30 focus-visible:ring-mint/30",
    icon: "bg-mint/10 text-[#4d987a]",
    arrow: "text-[#4d987a]",
  },
  pink: {
    card: "border-pink/10 hover:border-pink/25 focus-visible:ring-pink/30",
    icon: "bg-pink/10 text-pink",
    arrow: "text-pink",
  },
  sky: {
    card: "border-sky/15 hover:border-sky/30 focus-visible:ring-sky/30",
    icon: "bg-sky/10 text-sky",
    arrow: "text-sky",
  },
  lavender: {
    card: "border-lavender/15 hover:border-lavender/30 focus-visible:ring-lavender/30",
    icon: "bg-lavender/10 text-lavender",
    arrow: "text-lavender",
  },
};

const homeSections = [...adminSections].sort(
  (a, b) => (a.homeOrder ?? 100) - (b.homeOrder ?? 100),
);

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

      <nav aria-label="管理機能一覧" className="mt-6 grid gap-4 md:grid-cols-2">
        {homeSections.map(({ href, icon: Icon, title, description, tone }) => {
          const styles = cardStyles[tone];
          return (
            <Link
              key={href}
              href={href}
              className={`group flex items-center gap-4 rounded-[22px] border bg-white p-5 shadow-soft transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 ${styles.card}`}
            >
              <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${styles.icon}`}>
                <Icon size={22} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block text-[15px] font-black text-ink">{title}</strong>
                <span className="mt-1 block text-[11px] font-bold leading-5 text-ink/45">
                  {description}
                </span>
              </span>
              <ChevronRight
                size={18}
                className={`shrink-0 transition-transform group-hover:translate-x-0.5 ${styles.arrow}`}
                aria-hidden="true"
              />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
