import type { ParkOperatingDay } from "@/lib/park-operating-day-store";
import type { DataLoadStatus, ScheduleEntry } from "@/lib/schedule-store";

type TodayStatusInput = {
  today: string;
  currentTime: string;
  entries: ScheduleEntry[];
  loadStatus: DataLoadStatus;
  operatingDay?: ParkOperatingDay;
  clockReady: boolean;
};

export function getHomepageTodayStatus({ today, currentTime, entries, loadStatus, operatingDay, clockReady }: TodayStatusInput) {
  if (operatingDay?.operatingStatus === "closed") return { label: "本日は休園日", kind: "closed" as const };
  if (loadStatus === "loading") return { label: "本日の予定を確認しています…", kind: "loading" as const };
  if (entries.length === 0 && (loadStatus === "error" || loadStatus === "unavailable")) {
    return { label: loadStatus === "error" ? "本日の予定を読み込めませんでした" : "現在、予定を表示できません", kind: "error" as const };
  }
  const schedules = entries.filter((entry) => entry.date <= today && (entry.endDate ?? entry.date) >= today);
  if (schedules.length === 0) return { label: "本日の公開済み予定はまだありません", kind: "empty" as const };
  if (!clockReady) return { label: "本日の掲載予定を確認する", kind: "ready" as const };
  const afterClosing = operatingDay?.operatingStatus === "open" && operatingDay.closingTime && currentTime >= operatingDay.closingTime;
  const allEnded = schedules.every((entry) => entry.status === "completed" || ((entry.endDate ?? entry.date) === today && Boolean(entry.endTime && entry.endTime <= currentTime)));
  if (allEnded || afterClosing) return { label: "本日の掲載予定は終了しました", kind: "ended" as const };
  const ongoing = schedules.find((entry) => entry.status !== "completed" && entry.startTime <= currentTime && entry.endTime && entry.endTime > currentTime);
  if (ongoing) return { label: `進行中：${ongoing.title}`, kind: "ongoing" as const };
  const next = schedules.filter((entry) => entry.status !== "completed" && entry.startTime > currentTime).sort((a, b) => a.startTime.localeCompare(b.startTime))[0];
  if (next) return { label: `次の予定 ${next.startTime} ${next.title}`, kind: "next" as const };
  return { label: "本日の掲載予定をご確認ください", kind: "ready" as const };
}
