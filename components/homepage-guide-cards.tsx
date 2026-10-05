import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { HomepageGuideCard } from "@/lib/homepage-guide-cards";

export function HomepageGuideCards({ cards }: { cards: HomepageGuideCard[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {cards.map((card, index) => (
        <Link key={index} href={card.url} className="group flex min-w-0 items-center gap-3 rounded-2xl border border-pink/15 bg-white px-4 py-4 transition hover:border-pink/40 hover:bg-pink/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink">
          <div className="min-w-0 flex-1">
            <h3 className="break-words text-[15px] font-black leading-6 text-ink group-hover:text-[#b43e68]">{card.title}</h3>
            <p className="mt-1 break-words text-[13px] leading-6 text-ink/70">{card.description}</p>
          </div>
          <ArrowRight size={18} className="shrink-0 text-pink" aria-hidden="true" />
        </Link>
      ))}
    </div>
  );
}
