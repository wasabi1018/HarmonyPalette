"use client";

import Link from "next/link";
import { Check, Plus, Undo2 } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { addScheduleToPlan, isScheduleInPlan, removeScheduleFromPlan, useDailyPlans } from "@/lib/daily-plan-store";
import type { ScheduleEntry } from "@/lib/schedule-store";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric" })
    .format(new Date(`${date}T00:00:00`));
}

export function PlanAddButton({
  entry,
  targetDate,
  variant = "default",
}: {
  entry: ScheduleEntry;
  targetDate: string;
  variant?: "default" | "small" | "compact" | "card";
}) {
  const plans = useDailyPlans();
  const added = isScheduleInPlan(plans, entry.id, targetDate);
  const [notice, setNotice] = useState<{ message: string; action: "added" | "removed" } | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const handleToggle = () => {
    if (added) {
      removeScheduleFromPlan(targetDate, entry.id);
      setNotice({
        message: `${formatDate(targetDate)}のマイプランから取り消しました。`,
        action: "removed",
      });
      return;
    }

    const result = addScheduleToPlan(entry, targetDate);
    setNotice({
      message: result.status === "exists"
        ? `${formatDate(targetDate)}のプランに追加済みです。`
        : `${formatDate(targetDate)}のマイプランに追加しました。`,
      action: "added",
    });
  };

  const common = added
    ? "bg-mint/15 text-[#35745f] hover:bg-pink/10 hover:text-pink"
    : variant === "compact"
      ? "bg-white/90 text-pink shadow-sm hover:bg-pink hover:text-white"
      : "bg-pink text-white shadow-soft hover:bg-[#df5c89]";

  return (
    <>
      <button
        type="button"
        onClick={handleToggle}
        aria-label={added ? `${entry.title}を${formatDate(targetDate)}のマイプランから取り消す` : `${entry.title}を${formatDate(targetDate)}のマイプランに追加`}
        title={added ? "マイプランから取り消す" : "マイプランに追加"}
        className={
          variant === "compact"
            ? `relative grid h-9 w-9 shrink-0 place-items-center rounded-full transition-colors before:absolute before:-inset-1 before:rounded-full before:content-[''] ${common}`
            : variant === "card"
              ? `relative inline-flex min-h-9 shrink-0 items-center justify-center gap-1 rounded-full px-3 text-[10px] font-black transition-colors before:absolute before:-inset-y-1 before:inset-x-0 before:rounded-full before:content-[''] ${common}`
            : variant === "small"
              ? `inline-flex min-h-9 shrink-0 items-center justify-center gap-1 rounded-xl px-2.5 text-[10px] font-black transition-colors ${common}`
              : `inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-[11px] font-black transition-colors ${common}`
        }
      >
        {added ? <Check size={variant === "compact" ? 15 : 13} aria-hidden="true" /> : <Plus size={variant === "compact" ? 16 : 14} aria-hidden="true" />}
        {variant !== "compact" && (
          variant === "card"
            ? (added ? "追加済み" : "追加")
            : (added ? "追加を取り消す" : "マイプランに追加")
        )}
      </button>

      {notice && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-x-4 bottom-24 z-[9999] mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-[12px] font-bold text-white shadow-[0_16px_44px_rgba(62,53,64,0.28)] lg:bottom-6" role="status" aria-live="polite">
          {notice.action === "added"
            ? <Check size={16} className="shrink-0 text-mint" aria-hidden="true" />
            : <Undo2 size={16} className="shrink-0 text-[#ffd27a]" aria-hidden="true" />}
          <span className="min-w-0 flex-1">{notice.message}</span>
          <Link href={`/plan?date=${targetDate}`} className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-black text-white hover:bg-white/20">プランを見る</Link>
        </div>,
        document.body,
      )}
    </>
  );
}
