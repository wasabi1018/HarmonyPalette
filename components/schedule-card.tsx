import { Clock3, MapPin } from "lucide-react";
import type { Character, GreetingSchedule } from "@/data/types";
import { formatDate } from "@/lib/format";
import { CharacterAvatar } from "./character-avatar";
import { StatusPill } from "./status-pill";

export function ScheduleCard({
  schedule,
  scheduleCharacters,
  compact = false,
}: {
  schedule: GreetingSchedule;
  scheduleCharacters: Character[];
  compact?: boolean;
}) {
  return (
    <article
      className={`rounded-[20px] border border-pink/10 bg-white p-3.5 shadow-soft transition-shadow hover:shadow-card sm:p-4 ${schedule.status === "completed" ? "opacity-65" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5 text-[10px] font-bold text-ink/45 sm:text-[11px]">
          <span>{formatDate(schedule.date)}</span>
          <span className="h-1 w-1 shrink-0 rounded-full bg-ink/20" aria-hidden="true" />
          <span className="truncate">{schedule.greetingType}</span>
        </div>
        <StatusPill status={schedule.status} />
      </div>
      <div className="mt-3 flex items-center gap-2.5">
        <div className="flex -space-x-3">
          {scheduleCharacters.map((character) => (
            <CharacterAvatar key={character.id} character={character} size="sm" />
          ))}
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-[14px] font-black text-ink">{schedule.title}</h3>
          <p className="mt-0.5 truncate text-[10px] text-ink/50 sm:text-[11px]">
            {scheduleCharacters.map((character) => character.name).join("・")}
          </p>
        </div>
      </div>
      <div className="mt-3 grid gap-1.5 text-xs font-bold text-ink/65 sm:grid-cols-2">
        <div className="flex items-center gap-1.5">
          <Clock3 size={14} className="text-pink" aria-hidden="true" />
          <span className="text-[14px] font-black text-ink">
            {schedule.startTime}
            <span className="mx-1 text-ink/25">–</span>
            {schedule.endTime}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin size={14} className="text-lavender" aria-hidden="true" />
          <span className="truncate text-[11px]">{schedule.location}</span>
        </div>
      </div>
      {!compact && (
        <p className="mt-3 border-t border-pink/10 pt-3 text-[11px] leading-5 text-ink/50">
          {schedule.description}
        </p>
      )}
    </article>
  );
}
