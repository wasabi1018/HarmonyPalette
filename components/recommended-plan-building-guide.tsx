import Link from "next/link";
import { ArrowUpRight, Check, ListChecks, Route } from "lucide-react";
import { RECOMMENDED_PLAN_BUILDING } from "@/lib/recommended-plan-building";

export function RecommendedPlanBuildingGuide() {
  return (
    <section
      aria-labelledby="recommended-plan-building-title"
      data-testid="recommended-plan-building"
      className="mx-auto max-w-[980px] px-4 pb-6 sm:px-6 lg:px-8 lg:pb-8"
    >
      <div className="rounded-[26px] border border-mint/20 bg-gradient-to-br from-[#f6fbf8] via-white to-[#fff7fa] p-4 shadow-soft sm:p-6 lg:p-7">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-mint/15 text-[#3f8069]">
            <Route size={21} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-black tracking-[0.16em] text-[#3f8069]">HOW TO PLAN</p>
            <h2
              id="recommended-plan-building-title"
              className="mt-1 font-display text-[22px] font-semibold leading-snug text-ink sm:text-[28px]"
            >
              {RECOMMENDED_PLAN_BUILDING.title}
            </h2>
          </div>
        </div>

        <p className="mt-4 text-[13px] font-bold leading-7 text-ink/55">
          {RECOMMENDED_PLAN_BUILDING.introduction}
        </p>

        <ol className="mt-6" aria-label="プランを立てる5つのステップ">
          {RECOMMENDED_PLAN_BUILDING.steps.map((step, index) => (
            <li
              key={step.id}
              className="relative grid grid-cols-[44px_minmax(0,1fr)] gap-3 pb-5 last:pb-0 sm:grid-cols-[48px_minmax(0,1fr)] sm:gap-4"
            >
              {index < RECOMMENDED_PLAN_BUILDING.steps.length - 1 ? (
                <span
                  className="absolute bottom-0 left-[21px] top-10 w-px bg-mint/25 sm:left-[23px]"
                  aria-hidden="true"
                />
              ) : null}
              <span className="relative z-10 grid h-11 w-11 place-items-center rounded-2xl border border-mint/25 bg-white text-[13px] font-black tabular-nums text-[#3f8069] shadow-[0_6px_18px_rgba(63,128,105,0.08)] sm:h-12 sm:w-12">
                {index + 1}
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="text-[10px] font-black tracking-[0.14em] text-[#3f8069]">
                  STEP {index + 1}
                </p>
                <h3 className="mt-1 text-[14px] font-black leading-6 text-ink sm:text-[15px]">
                  {step.title}
                </h3>
                <p className="mt-1.5 text-[12px] font-bold leading-6 text-ink/55 sm:text-[13px]">
                  {step.description}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-6 rounded-[20px] border border-pink/10 bg-[#fff9fb] px-4 py-4 sm:px-5">
          <h3 className="flex items-center gap-2 text-[14px] font-black text-ink">
            <ListChecks size={18} className="text-pink" aria-hidden="true" />
            できあがったら3つだけ確認
          </h3>
          <ul className="mt-3 grid gap-2.5 sm:grid-cols-3" role="list">
            {RECOMMENDED_PLAN_BUILDING.checklist.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-[12px] font-bold leading-5 text-ink/60">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-mint/15 text-[#3f8069]">
                  <Check size={12} strokeWidth={3} aria-hidden="true" />
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-pink/10 pt-3 text-[11px] font-bold leading-5 text-ink/45">
            {RECOMMENDED_PLAN_BUILDING.closingNote}
          </p>
        </div>

        <Link
          href={RECOMMENDED_PLAN_BUILDING.articleLink.href}
          className="mt-4 inline-flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-mint/25 bg-white px-4 text-[12px] font-black text-[#3f8069] transition hover:border-mint/50 hover:bg-mint/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/40 sm:w-auto"
        >
          {RECOMMENDED_PLAN_BUILDING.articleLink.label}
          <ArrowUpRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
