import { CalendarOff, Clock3 } from "lucide-react";
import React from "react";
import type { ParkOperatingDay } from "@/lib/park-operating-day-store";

export function ParkOperatingInfo({
  date,
  operatingDays,
  className = "",
}: {
  date: string;
  operatingDays: ParkOperatingDay[];
  className?: string;
}) {
  const operatingDay = operatingDays.find((entry) => entry.date === date);

  if (!operatingDay || operatingDay.operatingStatus === "unknown") return null;

  if (operatingDay.operatingStatus === "closed") {
    return (
      <p className={`flex items-center gap-1.5 text-[11px] font-bold text-pink sm:text-[12px] ${className}`}>
        <CalendarOff size={14} className="shrink-0" aria-hidden="true" />
        <span>休園日</span>
      </p>
    );
  }

  if (!operatingDay.openingTime || !operatingDay.closingTime) return null;

  return (
    <p className={`flex items-center gap-1.5 text-[11px] font-semibold text-ink/45 sm:text-[12px] ${className}`}>
      <Clock3 size={14} className="shrink-0" aria-hidden="true" />
      <span>営業時間</span>
      <span className="tabular-nums">{operatingDay.openingTime}–{operatingDay.closingTime}</span>
    </p>
  );
}
