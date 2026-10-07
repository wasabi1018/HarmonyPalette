import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { HomepageGuideCard } from "@/lib/homepage-guide-cards";

const guideCardThemes = [
  {
    background: "border-pink/20 from-[#fff0f6] via-[#fff7fa] to-[#fcebf3] hover:border-pink/40 focus-visible:ring-[#b43e68]",
    circle: "bg-pink/[0.07]",
    arrow: "text-[#b43e68]",
    title: "group-hover:text-[#b43e68]",
  },
  {
    background: "border-[#bddfd5] from-[#eef9f6] via-[#f6fcfa] to-[#e5f4f2] hover:border-[#78b9a8] focus-visible:ring-[#287567]",
    circle: "bg-[#68bca8]/10",
    arrow: "text-[#287567]",
    title: "group-hover:text-[#287567]",
  },
  {
    background: "border-lavender/25 from-[#f2effb] via-[#faf7ff] to-[#ebe5f7] hover:border-lavender/50 focus-visible:ring-[#72569f]",
    circle: "bg-lavender/[0.09]",
    arrow: "text-[#72569f]",
    title: "group-hover:text-[#72569f]",
  },
];

export function HomepageGuideCards({ cards }: { cards: HomepageGuideCard[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {cards.map((card, index) => {
        const theme = guideCardThemes[index % guideCardThemes.length];
        return (
          <Link key={index} href={card.url} className={`group relative isolate flex min-w-0 items-center gap-3 overflow-hidden rounded-2xl border bg-gradient-to-br px-4 py-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset ${theme.background}`}>
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
              <span className={`absolute -left-6 -top-7 h-24 w-24 rounded-full ${theme.circle}`} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className={`break-words text-[15px] font-black leading-6 text-ink ${theme.title}`}>{card.title}</h3>
              <p className="mt-1 break-words text-[13px] leading-6 text-ink/80">{card.description}</p>
            </div>
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/90 ${theme.arrow}`} aria-hidden="true">
              <ArrowRight size={18} />
            </span>
          </Link>
        );
      })}
    </div>
  );
}
