import { Sparkles } from "lucide-react";

export function PageIntro({ eyebrow, title, description, tone = "pink" }: { eyebrow: string; title: string; description: string; tone?: "pink" | "mint" | "lavender" }) {
  const toneClass = { pink: "from-[#fff0f5] to-white", mint: "from-[#eefaf4] to-white", lavender: "from-[#f5f0fb] to-white" }[tone];
  return <div className={`relative overflow-hidden rounded-[32px] bg-gradient-to-br ${toneClass} px-6 py-8 sm:px-10 sm:py-11`}>
    <div className="absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/70" aria-hidden="true" />
    <div className="absolute bottom-[-70px] right-[22%] h-36 w-36 rounded-full border-[18px] border-white/60" aria-hidden="true" />
    <div className="relative max-w-2xl">
      <p className="flex items-center gap-2 text-xs font-black tracking-[0.2em] text-pink"><Sparkles size={15} aria-hidden="true" />{eyebrow}</p>
      <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-ink sm:text-5xl">{title}</h1>
      <p className="mt-4 text-sm leading-7 text-ink/65 sm:text-base">{description}</p>
    </div>
  </div>;
}
