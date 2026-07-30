"use client";

import { useDraggable } from "@dnd-kit/core";
import { GripVertical, LockKeyhole, MapPin, Pencil, Trash2, TriangleAlert, Users } from "lucide-react";
import type { DailyPlanItem } from "@/lib/daily-plan-store";
import { getCustomPlanColorValue } from "@/lib/plan-options";

export function PlanItemCard({
  item,
  previewTime,
  hasOverlap,
  onEdit,
  onRemove,
}: {
  item: DailyPlanItem;
  previewTime?: { startTime: string; endTime: string };
  hasOverlap: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const draggable = useDraggable({
    id: item.id,
    disabled: item.timeLocked,
  });
  const transform = draggable.transform;
  const shownTime = previewTime ?? item;
  const style = {
    ...(transform ? { transform: `translate3d(0, ${transform.y}px, 0)` } : {}),
    ...(item.kind === "custom"
      ? { borderLeftColor: getCustomPlanColorValue(item.accentColor) }
      : {}),
  };

  return (
    <article
      ref={draggable.setNodeRef}
      style={style}
      className={`relative rounded-2xl border border-l-[3px] bg-white p-3 shadow-soft transition-shadow ${
        item.kind === "official" ? "border-pink/15 border-l-pink/45" : "border-ink/10"
      } ${draggable.isDragging ? "z-30 shadow-[0_20px_50px_rgba(75,45,55,0.2)]" : ""}`}
    >
      <div className="flex items-start gap-2.5">
        <div className="w-[52px] shrink-0 pt-0.5">
          <p className="flex items-center gap-1 whitespace-nowrap text-[12px] font-black tabular-nums leading-4 text-ink">
            {shownTime.startTime}
            {item.timeLocked && (
              <span className="text-pink" title="公式時刻は固定です">
                <LockKeyhole size={10} aria-hidden="true" />
                <span className="sr-only">公式時刻は固定です</span>
              </span>
            )}
          </p>
          <p className="mt-0.5 whitespace-nowrap text-[9px] font-bold tabular-nums leading-4 text-ink/35">〜{shownTime.endTime}</p>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <h3 className="min-w-0 flex-1 pt-1 text-[14px] font-black leading-5 text-ink">{item.title}</h3>
            <div className="flex shrink-0 items-center gap-0.5">
              {!item.timeLocked && (
                <button
                  type="button"
                  ref={draggable.setActivatorNodeRef}
                  {...draggable.listeners}
                  {...draggable.attributes}
                  className="relative grid h-9 w-9 touch-none place-items-center rounded-lg bg-mint/15 text-[#35745f] before:absolute before:-inset-1 before:rounded-xl before:content-[''] active:cursor-grabbing"
                  aria-label={`${item.title}の時刻をドラッグして変更`}
                >
                  <GripVertical size={16} aria-hidden="true" />
                </button>
              )}
              {item.kind === "custom" && (
                <button type="button" onClick={onEdit} className="relative grid h-9 w-9 place-items-center rounded-lg text-ink/45 before:absolute before:-inset-1 before:rounded-xl before:content-[''] hover:bg-pink/5 hover:text-pink" aria-label={`${item.title}を編集`}>
                  <Pencil size={14} aria-hidden="true" />
                </button>
              )}
              <button type="button" onClick={onRemove} className="relative grid h-9 w-9 place-items-center rounded-lg text-ink/35 before:absolute before:-inset-1 before:rounded-xl before:content-[''] hover:bg-pink/5 hover:text-pink" aria-label={`${item.title}をプランから削除`}>
                <Trash2 size={14} aria-hidden="true" />
              </button>
            </div>
          </div>

          {(item.characterNames.length > 0 || item.location || hasOverlap) && (
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold leading-4 text-ink/45">
              {item.characterNames.length > 0 && (
                <span className="inline-flex min-w-0 items-center gap-1 text-pink">
                  <Users size={11} className="shrink-0" aria-hidden="true" />
                  <span>{item.characterNames.join("・")}</span>
                </span>
              )}
              {item.location && (
                <span className="inline-flex min-w-0 items-center gap-1">
                  <MapPin size={11} className="shrink-0 text-lavender" aria-hidden="true" />
                  <span>{item.location}</span>
                </span>
              )}
              {hasOverlap && (
                <span className="inline-flex items-center gap-1 font-black text-[#9a6512]">
                  <TriangleAlert size={11} aria-hidden="true" />
                  時間が重複
                </span>
              )}
            </div>
          )}
          {item.note && (
            <p className="mt-1.5 line-clamp-2 rounded-lg bg-[#fffafd] px-2 py-1.5 text-[10px] font-bold leading-4 text-ink/50" title={item.note}>
              {item.note}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
