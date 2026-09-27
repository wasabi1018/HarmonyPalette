import assert from "node:assert/strict";
import test from "node:test";
import type { Character } from "@/data/types";
import { sortByCharacterDisplayOrder, sortCharacterNames } from "@/lib/character-store";

function character(id: string, name: string, displayOrder: number): Character {
  return {
    id,
    slug: id,
    name,
    nameKana: name,
    image: "/character-placeholder.svg",
    description: "",
    officialUrl: "",
    isFanStudioRegular: false,
    themeColor: "#ef8099",
    displayOrder,
    birthdayMonth: null,
    birthdayDay: null,
  };
}

const catalog = [
  character("second", "ふたば", 20),
  character("first", "いちか", 10),
];

test("キャラクター名を設定済みの表示順で並べる", () => {
  assert.deepEqual(
    sortCharacterNames(["未登録B", "ふたば", "いちか", "未登録A", "いちか"], catalog),
    ["いちか", "ふたば", "未登録A", "未登録B"],
  );
});

test("スケジュール項目を含まれるキャラクターの表示順で並べる", () => {
  const items = [
    { id: "unknown", names: ["未登録"] },
    { id: "second", names: ["ふたば"] },
    { id: "first", names: ["いちか"] },
    { id: "no-character", names: [] },
  ];

  assert.deepEqual(
    sortByCharacterDisplayOrder(items, catalog, (item) => item.names).map((item) => item.id),
    ["first", "second", "unknown", "no-character"],
  );
});
