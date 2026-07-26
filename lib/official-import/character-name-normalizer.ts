import { normalizeSpace } from "@/lib/official-import/utils";
import type { ImportedCharacter } from "@/lib/official-import/types";

type CharacterAlias = {
  patterns: RegExp[];
  name: string;
  id?: string;
};

const CHARACTER_ALIASES: CharacterAlias[] = [
  { patterns: [/マイ\s*メロディ/], name: "マイメロディ", id: "my-melody" },
  {
    patterns: [/マイ\s*ス(?:ウィ|ィ|イ)\s*ー?\s*ト\s*ピ\s*ア(?:\s*ノ)?/],
    name: "マイスウィートピアノ",
  },
  { patterns: [/クロミ/], name: "クロミ", id: "kuromi" },
  { patterns: [/シナモ(?:ロール)?/], name: "シナモロール", id: "cinnamoroll" },
  { patterns: [/ポムポム\s*プリン/], name: "ポムポムプリン", id: "pompompurin" },
  { patterns: [/ハロー\s*キティ/], name: "ハローキティ", id: "hello-kitty" },
  { patterns: [/ハロー\s*ミミィ/], name: "ハローミミィ" },
  { patterns: [/ディア\s*ダニエル/], name: "ディアダニエル", id: "daniel" },
  { patterns: [/ウサハナ/], name: "ウサハナ" },
  { patterns: [/あひる\s*の?\s*ペックル/], name: "あひるのペックル" },
  { patterns: [/ウィッシュ\s*ミー\s*メル/], name: "ウィッシュミーメル" },
  { patterns: [/リトル\s*ツイン\s*スターズ/], name: "リトルツインスターズ" },
  { patterns: [/コロコロ\s*[グク]リリン/], name: "コロコロクリリン" },
  { patterns: [/けろけろ\s*けろっぴ/], name: "けろけろけろっぴ" },
  { patterns: [/ハンギョドン/], name: "ハンギョドン" },
  { patterns: [/ポチャッコ/], name: "ポチャッコ" },
  { patterns: [/バ\s*ッ?\s*ド\s*ば\s*(?:ぱ\s*)?つ\s*丸/], name: "バッドばつ丸" },
  { patterns: [/タキシード\s*サム/], name: "タキシードサム" },
  {
    patterns: [/[ぼほ]\s*ん\s*[ぼほ]\s*ん\s*り\s*[ぼほ](?:\s*[ぼほ])?\s*ん/],
    name: "ぼんぼんりぼん",
  },
  { patterns: [/ル\s*[ビピ]\s*ー/], name: "ルビー" },
  { patterns: [/み\s*る\s*く/], name: "みるく" },
  { patterns: [/シ\s*フ\s*[ォオ]?\s*ン/], name: "シフォン" },
  { patterns: [/カ\s*プ\s*チ\s*ー?\s*ノ/], name: "カプチーノ" },
  { patterns: [/エ\s*ス\s*プ\s*レ\s*ッ?\s*ソ/], name: "エスプレッソ" },
  { patterns: [/モカ/], name: "モカ" },
  { patterns: [/キキ/], name: "キキ" },
  { patterns: [/ララ/], name: "ララ" },
  { patterns: [/モップ/], name: "モップ" },
  { patterns: [/しろうさ/], name: "しろうさ" },
  { patterns: [/くろうさ/], name: "くろうさ" },
  { patterns: [/いちご\s*の\s*王さま/], name: "いちごの王さま" },
  { patterns: [/メアリー/], name: "メアリー" },
  { patterns: [/ジョージ/], name: "ジョージ" },
];

function fallbackCharacterName(raw: string) {
  return normalizeSpace(raw)
    .replace(/[※★☆●○◎]/g, "")
    .replace(/[^ぁ-んァ-ヶ一-龠ーA-Za-z]/g, " ")
    .trim();
}

function findKnownCharacters(raw: string) {
  return CHARACTER_ALIASES
    .flatMap((alias) => {
      const matches = alias.patterns
        .map((pattern) => raw.match(pattern))
        .filter((match): match is RegExpMatchArray => Boolean(match))
        .sort((left, right) => (left.index ?? 0) - (right.index ?? 0));
      const firstMatch = matches[0];
      return firstMatch
        ? [{ index: firstMatch.index ?? 0, character: { name: alias.name, id: alias.id } }]
        : [];
    })
    .sort((left, right) => left.index - right.index)
    .map(({ character }) => character);
}

export function canonicalCharacters(
  raw: string,
  { preserveUnknown = true }: { preserveUnknown?: boolean } = {},
): ImportedCharacter[] {
  const normalized = normalizeSpace(raw.normalize("NFKC"));
  const segments = normalized.split(/[・、,，／/&＆＋+|｜]+/);
  const characters = segments.flatMap((segment) => {
    const knownCharacters = findKnownCharacters(segment);
    if (knownCharacters.length > 0) return knownCharacters;
    if (!preserveUnknown) return [];
    const name = fallbackCharacterName(segment);
    return name ? [{ name }] : [];
  });
  return Array.from(new Map(characters.map((character) => [character.name, character])).values());
}

export function normalizeCharacterNamesInText(raw: string) {
  let normalized = normalizeSpace(raw.normalize("NFKC"));
  for (const alias of CHARACTER_ALIASES) {
    for (const pattern of alias.patterns) {
      normalized = normalized.replace(pattern, alias.name);
    }
  }
  return normalized;
}
