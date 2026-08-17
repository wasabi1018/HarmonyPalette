import Link from "next/link";
import { ArrowRight, Ticket } from "lucide-react";

export function FirstVisitGuideLink({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/guide"
      className={`group flex items-center gap-4 rounded-[22px] border border-[#f4dfae] bg-[#fffaf0] p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:border-[#e8c979] hover:shadow-card sm:p-5 ${className}`}
    >
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#fff0c9] text-[#c58b22]">
        <Ticket size={22} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-black tracking-[0.14em] text-[#b77d18]">
          FIRST VISIT GUIDE
        </span>
        <strong className="mt-1 block text-[15px] font-black text-ink sm:text-[17px]">
          初めての方へ
        </strong>
        <span className="mt-1 block text-[11px] font-bold leading-5 text-ink/50 sm:text-xs">
          チケット・アクセス・子ども連れの回り方を、来園前にまとめて確認。
        </span>
      </span>
      <ArrowRight
        size={18}
        className="shrink-0 text-pink transition-transform group-hover:translate-x-1"
        aria-hidden="true"
      />
    </Link>
  );
}
