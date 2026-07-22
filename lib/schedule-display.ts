import type { ScheduleEntry } from "@/lib/schedule-store";

export function isFanStudioGreeting(entry: ScheduleEntry) {
  return entry.kind === "greeting" && (
    entry.scheduleType.includes("ファンスタジオ")
    || entry.location.includes("ファンスタジオ")
    || entry.sourceId === "harmonyland-funstudio"
  );
}

export function shortFanStudioLocation(location: string) {
  return location.replace("ファンスタジオ", "").trim() || "ファンスタジオ";
}

export function specialAppearance(entry: ScheduleEntry) {
  const appearanceNote = entry.appearanceNotes?.find(Boolean)?.trim();
  if (appearanceNote) return /通常(?:の)?姿/.test(appearanceNote) ? null : appearanceNote;
  if (entry.title.includes("日焼け")) return "日焼け姿";
  const titleAppearance = entry.title.match(/（([^）]*姿[^）]*)）/)?.[1] ?? null;
  return titleAppearance && !/通常(?:の)?姿/.test(titleAppearance) ? titleAppearance : null;
}

export function fanStudioFallbackName(entry: ScheduleEntry) {
  return entry.title
    .replace(/（[^）]*姿[^）]*）/g, "")
    .replace(/ファンスタジオ(?:グリーティング)?/g, "")
    .trim() || "登場キャラクター";
}
