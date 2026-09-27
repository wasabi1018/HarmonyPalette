import assert from "node:assert/strict";
import test from "node:test";
import type { Character } from "@/data/types";
import { sortFanStudioEntriesByRoom } from "@/lib/schedule-display";
import type { ScheduleEntry } from "@/lib/schedule-store";

function character(id: string, name: string, displayOrder: number): Character {
  return {
    id,
    slug: id,
    name,
    nameKana: name,
    image: "",
    description: "",
    officialUrl: "",
    isFanStudioRegular: false,
    themeColor: "#eb6e98",
    displayOrder,
    birthdayMonth: null,
    birthdayDay: null,
  };
}

function entry(id: string, name: string, room: number): ScheduleEntry {
  return {
    id,
    kind: "greeting",
    title: `${name} ファンスタジオグリーティング`,
    date: "2026-09-28",
    startTime: "10:00",
    endTime: "10:30",
    characterIds: [],
    characterNames: [name],
    scheduleType: "ファンスタジオグリーティング",
    location: `ファンスタジオ${room}号室`,
    description: "",
    officialUrl: "",
    sourceName: "テスト",
    updatedAt: "2026-09-28T00:00:00.000Z",
    status: "upcoming",
    isSample: false,
  };
}

test("同時刻のファンスタジオは部屋番号順、同じ部屋ではキャラクター表示順に並べる", () => {
  const first = character("first", "表示順1", 1);
  const second = character("second", "表示順2", 2);
  const third = character("third", "表示順3", 3);
  const entries = [
    entry("room-102-first", first.name, 102),
    entry("room-101-third", third.name, 101),
    entry("room-101-second", second.name, 101),
  ];

  assert.deepEqual(
    sortFanStudioEntriesByRoom(entries, [third, first, second]).map((item) => item.id),
    ["room-101-second", "room-101-third", "room-102-first"],
  );
});
