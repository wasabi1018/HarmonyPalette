import type { Character } from "@/data/types";
import { sortByCharacterDisplayOrder } from "@/lib/character-store";
import { getEntryCharacterNames, type ScheduleEntry } from "@/lib/schedule-store";

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

export function compareFanStudioLocations(left: string, right: string) {
  const leftLocation = shortFanStudioLocation(left);
  const rightLocation = shortFanStudioLocation(right);
  const leftRoomNumber = Number(leftLocation.match(/\d+/)?.[0]);
  const rightRoomNumber = Number(rightLocation.match(/\d+/)?.[0]);
  const leftOrder = Number.isFinite(leftRoomNumber) ? leftRoomNumber : Number.MAX_SAFE_INTEGER;
  const rightOrder = Number.isFinite(rightRoomNumber) ? rightRoomNumber : Number.MAX_SAFE_INTEGER;

  return leftOrder - rightOrder || leftLocation.localeCompare(rightLocation, "ja");
}

export function sortFanStudioEntriesByRoom(entries: ScheduleEntry[], characters: Character[]) {
  const entriesByRoom = new Map<string, ScheduleEntry[]>();
  entries.forEach((entry) => {
    const room = shortFanStudioLocation(entry.location);
    entriesByRoom.set(room, [...(entriesByRoom.get(room) ?? []), entry]);
  });

  return Array.from(entriesByRoom.entries())
    .sort(([left], [right]) => compareFanStudioLocations(left, right))
    .flatMap(([, roomEntries]) => sortByCharacterDisplayOrder(
      roomEntries,
      characters,
      (entry) => {
        const names = getEntryCharacterNames(entry);
        return names.length > 0 ? names : [fanStudioFallbackName(entry)];
      },
    ));
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
