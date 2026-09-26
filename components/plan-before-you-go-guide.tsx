import Link from "next/link";
import { BookOpenCheck, CheckCircle2, ChevronDown, Lightbulb, MoveUpRight } from "lucide-react";
import {
  PLAN_BEFORE_YOU_GO,
  type PlanGuideContentBlock,
} from "@/lib/plan-before-you-go";

function GuideBlock({ block }: { block: PlanGuideContentBlock }) {
  if (block.type === "paragraph") {
    return <p>{block.text}</p>;
  }

  if (block.type === "list") {
    return (
      <ul className="grid gap-2.5" role="list">
        {block.items.map((item) => (
          <li key={item} className="flex gap-2.5">
            <span className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-pink/65" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (block.type === "subheading") {
    return (
      <h4 className="flex items-center gap-2 pt-1 text-[14px] font-black text-ink">
        <Lightbulb size={16} className="text-pink" aria-hidden="true" />
        {block.text}
      </h4>
    );
  }

  return (
    <div className="rounded-2xl border border-lavender/15 bg-lavender/5 px-4 py-3.5">
      <p className="text-[11px] font-black tracking-[0.12em] text-lavender">予定の例</p>
      <div className="mt-2 grid gap-1 text-[14px] font-black text-ink">
        {block.lines.map((line) => <p key={line}>{line}</p>)}
      </div>
      {block.caption ? (
        <p className="mt-2 text-[11px] font-bold leading-5 text-ink/45">※{block.caption}</p>
      ) : null}
    </div>
  );
}

export function PlanBeforeYouGoGuide() {
  return (
    <section
      aria-labelledby="plan-before-you-go-title"
      data-testid="plan-before-you-go"
      className="mx-auto max-w-[980px] px-4 pb-28 sm:px-6 lg:px-8 lg:pb-16"
    >
      <div className="rounded-[26px] border border-pink/10 bg-gradient-to-br from-[#fff7fa] via-white to-[#f6fbf8] p-4 shadow-soft sm:p-6 lg:p-7">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-pink/10 text-pink">
            <BookOpenCheck size={21} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-black tracking-[0.16em] text-pink">BEFORE YOU PLAN</p>
            <h2 id="plan-before-you-go-title" className="mt-1 font-display text-[22px] font-semibold leading-snug text-ink sm:text-[28px]">
              {PLAN_BEFORE_YOU_GO.title}
            </h2>
          </div>
        </div>
        <p className="mt-4 text-[13px] font-bold leading-7 text-ink/55">
          {PLAN_BEFORE_YOU_GO.introduction}
        </p>

        <div className="mt-5 grid gap-3">
          {PLAN_BEFORE_YOU_GO.items.map((item) => (
            <details
              key={item.id}
              data-guide-id={item.id}
              className="group overflow-hidden rounded-[20px] border border-ink/[0.07] bg-white shadow-[0_8px_28px_rgba(78,58,69,0.045)] open:border-pink/20"
            >
              <summary className="flex min-h-[76px] cursor-pointer list-none items-center gap-3 px-3.5 py-3.5 outline-none transition hover:bg-pink/[0.025] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pink/45 sm:px-4 [&::-webkit-details-marker]:hidden">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#fff6f9] text-[20px]" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-black leading-6 text-ink">
                    {item.title}
                  </span>
                  <span className="mt-1 block text-[12px] font-bold leading-5 text-ink/45">
                    {item.summary}
                  </span>
                </span>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-pink/5 text-pink transition-transform duration-200 group-open:rotate-180" aria-hidden="true">
                  <ChevronDown size={17} />
                </span>
              </summary>

              <div className="border-t border-pink/10 px-4 pb-5 pt-4 sm:px-5 sm:pb-6">
                <div className="grid gap-3 text-[13px] font-bold leading-7 text-ink/65">
                  {item.content.map((block, index) => (
                    <GuideBlock key={`${item.id}-${block.type}-${index}`} block={block} />
                  ))}
                </div>

                <div className="mt-4 rounded-2xl border border-mint/20 bg-mint/[0.08] px-4 py-3.5">
                  <p className="flex items-center gap-2 text-[12px] font-black text-[#3f8069]">
                    <CheckCircle2 size={15} aria-hidden="true" />
                    プランに入れること
                  </p>
                  <p className="mt-1.5 text-[13px] font-black leading-6 text-ink/70">
                    {item.planAction}
                  </p>
                </div>

                {item.note ? (
                  <p className="mt-3 rounded-xl bg-[#f8f6f7] px-3.5 py-3 text-[11px] font-bold leading-5 text-ink/45">
                    ※{item.note}
                  </p>
                ) : null}

                {item.links?.length ? (
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    {item.links.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="inline-flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-pink/15 bg-white px-3.5 text-[12px] font-black text-pink transition hover:border-pink/30 hover:bg-pink/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink/35 sm:w-auto"
                      >
                        {link.label}
                        <MoveUpRight size={14} aria-hidden="true" />
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            </details>
          ))}
        </div>

        <p className="mt-5 rounded-2xl border border-pink/10 bg-white/80 px-4 py-3 text-[11px] font-bold leading-6 text-ink/45">
          {PLAN_BEFORE_YOU_GO.footerNote}
        </p>
      </div>
    </section>
  );
}
