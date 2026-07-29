import { CalendarRange, ChevronDown, Clock3, ExternalLink, MapPin, PartyPopper, Users } from "lucide-react";
import type { ScheduleEntry } from "@/lib/schedule-store";
import { getEntryCharacterNames } from "@/lib/schedule-store";
import { PlanToggleIndicator, PlanToggleSurface } from "@/components/plan-add-button";

export function ScheduleEntryCard({
  entry,
  selectedCharacters = [],
  planDate = entry.date,
}: {
  entry: ScheduleEntry;
  selectedCharacters?: string[];
  planDate?: string;
}) {
  const names = getEntryCharacterNames(entry);
  const selectedCharacterNames = new Set(selectedCharacters);
  const isEvent = entry.kind === "event";

  return (
    <article className="rounded-2xl border border-pink/10 bg-white p-4 shadow-[0_8px_24px_rgba(118,73,86,0.06)] transition-transform hover:-translate-y-0.5 sm:p-5">
      <PlanToggleSurface
        entry={entry}
        targetDate={planDate}
        className="-m-1 block w-[calc(100%+8px)] rounded-xl p-1 text-left transition-[background-color,box-shadow,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink/30"
        addedClassName="bg-mint/10"
        pressedClassName="scale-[0.99] bg-pink/5 shadow-inner"
      >
        {({ added, pressed }) => (
          <>
            <span className="flex items-start justify-between gap-2">
              <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-[11px] font-black">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 ${isEvent ? "bg-[#fff4df] text-[#a76624]" : "bg-pink/10 text-pink"}`}>
                  {isEvent ? <PartyPopper size={13} aria-hidden="true" /> : <Users size={13} aria-hidden="true" />}
                  {isEvent ? "イベント" : "グリーティング"}
                </span>
                <span className="rounded-full bg-[#f5f2f4] px-2.5 py-1.5 text-ink/60">{entry.scheduleType}</span>
                {entry.verificationStatus === "year-inferred" && <span className="rounded-full border border-[#f1d59c] bg-[#fff9ec] px-2.5 py-1.5 text-[#8a652c]">年は推定</span>}
              </span>
              <PlanToggleIndicator
                added={added}
                pressed={pressed}
                size={17}
                className={`mt-1 ${added ? "text-[#35745f]" : "text-pink"}`}
              />
            </span>

            <span className="mt-3 block text-[16px] font-black leading-6 text-ink sm:text-[17px]">{entry.title}</span>
            {names.length > 0 && (
              <span className="mt-1.5 block text-[13px] font-bold leading-6 text-ink/60">
                {names.map((name, index) => {
                  const selected = selectedCharacterNames.has(name);
                  return (
                    <span key={name}>
                      {index > 0 && "・"}
                      <span className={selected ? "rounded-md bg-pink/10 px-1.5 py-0.5 font-black text-pink" : undefined}>
                        {name}
                        {selected && <span className="sr-only">（検索対象として選択中）</span>}
                      </span>
                    </span>
                  );
                })}
              </span>
            )}

            <span className="mt-4 grid gap-2 text-[12px] font-bold text-ink/65 sm:grid-cols-2">
              <span className="inline-flex items-center gap-2"><Clock3 size={15} className="text-pink" aria-hidden="true" />{entry.startTime}{entry.endTime ? `–${entry.endTime}` : "〜"}</span>
              <span className="inline-flex items-center gap-2"><MapPin size={15} className="text-pink" aria-hidden="true" />{entry.location}</span>
              {isEvent && entry.endDate && <span className="inline-flex items-center gap-2 sm:col-span-2"><CalendarRange size={15} className="text-pink" aria-hidden="true" />{entry.date.replaceAll("-", "/")}〜{entry.endDate.replaceAll("-", "/")}</span>}
            </span>
          </>
        )}
      </PlanToggleSurface>

      <details className="group mt-4 border-t border-pink/10 text-[11px] font-bold">
        <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 rounded-lg pt-2 text-ink/50 outline-none transition-colors hover:text-pink focus-visible:ring-2 focus-visible:ring-pink/30 [&::-webkit-details-marker]:hidden">
          <span>詳細・出典</span>
          <ChevronDown size={14} className="shrink-0 text-pink transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="grid gap-2 pb-1 pt-1 leading-5 text-ink/45">
          <p className="break-words">
            出典：{entry.sourceName || "登録情報"}
            {entry.sourceReference && <span className="break-all">・{entry.sourceReference}</span>}
          </p>
          {entry.officialUrl && (
            <a href={entry.officialUrl} target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-1 text-pink hover:underline">
              公式情報 <ExternalLink size={12} aria-hidden="true" />
            </a>
          )}
        </div>
      </details>
    </article>
  );
}
