import type { ScheduleStatus } from "@/data/types";

const labels: Record<ScheduleStatus, string> = { completed: "終了", soon: "まもなく", upcoming: "これから" };
const styles: Record<ScheduleStatus, string> = { completed: "bg-ink/5 text-ink/45", soon: "bg-pink text-white", upcoming: "bg-mint/15 text-[#38866B]" };

export function StatusPill({ status }: { status: ScheduleStatus }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-black ${styles[status]}`}><span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />{labels[status]}</span>;
}
