import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CharacterRecommendationCard } from "@/components/admin/character-recommendation-studio";
import type { Character } from "@/data/types";
import { buildCharacterRecommendations } from "@/lib/character-recommendation";
import type { ScheduleEntry } from "@/lib/schedule-store";

const character: Character = {
  id: "cinnamon",
  slug: "cinnamon",
  name: "シナモロール",
  nameKana: "しなもろーる",
  image: "",
  description: "",
  officialUrl: "",
  isFanStudioRegular: false,
  themeColor: "#68acd3",
  birthdayMonth: 3,
  birthdayDay: 6,
};

function entry(id: string, date: string, time: string, title: string, location: string): ScheduleEntry {
  return {
    id,
    kind: "greeting",
    title,
    date,
    startTime: time,
    characterIds: [character.id],
    characterNames: [character.name],
    scheduleType: "グリーティング",
    location,
    description: "",
    officialUrl: "",
    sourceName: "QA",
    updatedAt: "2026-08-26",
    status: "upcoming",
    isSample: false,
  };
}

const entries = [
  entry("best-1", "2026-09-12", "10:00", "お出迎えグリーティング", "ハーモニービレッジ"),
  entry("best-2", "2026-09-12", "12:30", "シナモロール スペシャルグリーティング", "プラザステージ"),
  entry("best-3", "2026-09-12", "14:30", "ハイタッチグリーティング", "ホワイトバーズスクエア"),
  entry("best-4", "2026-09-12", "16:00", "ファンスタジオグリーティング", "ファンスタジオ101号室"),
  entry("second-1", "2026-09-20", "10:30", "お出迎えグリーティング", "ハーモニービレッジ"),
  entry("second-2", "2026-09-20", "15:00", "ファンスタジオグリーティング", "ファンスタジオ102号室"),
  entry("third-1", "2026-09-23", "13:00", "ハイタッチグリーティング", "プラザ"),
];

const days = buildCharacterRecommendations("2026-09", character, entries);
const markup = renderToStaticMarkup(
  <CharacterRecommendationCard month="2026-09" character={character} days={days} />,
);

const html = `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Character Recommendation QA</title>
    <style>
      * { box-sizing: border-box; }
      html, body { margin: 0; background: #dcd5dd; }
      body { width: 1080px; min-height: 1350px; }
      svg { display: block; }
    </style>
  </head>
  <body>${markup}</body>
</html>`;

writeFileSync(resolve(process.cwd(), "audit", "character-recommendation-qa.html"), html, "utf8");
