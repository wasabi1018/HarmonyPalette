import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalCharacters,
  normalizeCharacterNamesInText,
} from "@/lib/official-import/character-name-normalizer";

function names(value: string) {
  return canonicalCharacters(value).map((character) => character.name);
}

test("マイスウィートピアノの表記揺れを正規化する", () => {
  assert.deepEqual(names("マイスウィートピアノ"), ["マイスウィートピアノ"]);
  assert.deepEqual(names("マイスイートピア"), ["マイスウィートピアノ"]);
});

test("バッドばつ丸の余分な文字を正規化する", () => {
  assert.deepEqual(names("バッドばつ丸"), ["バッドばつ丸"]);
  assert.deepEqual(names("バッドばぱつ丸"), ["バッドばつ丸"]);
});

test("シナモロールのお友だちを含む組み合わせを個別に取り込む", () => {
  assert.deepEqual(
    names("みるく・シフォン・カプチーノ・エスプレッソ"),
    ["みるく", "シフォン", "カプチーノ", "エスプレッソ"],
  );
  assert.deepEqual(names("モカ・シフォン・みるく"), ["モカ", "シフォン", "みるく"]);
});

test("ルビーの濁点誤認識を正規化する", () => {
  assert.deepEqual(names("ルビー"), ["ルビー"]);
  assert.deepEqual(names("ルピー"), ["ルビー"]);
});

test("ぼんぼんりぼんの濁点と重複の誤認識を正規化する", () => {
  assert.deepEqual(names("ぼんぼんりぼん"), ["ぼんぼんりぼん"]);
  assert.deepEqual(names("ぼんほんりほん"), ["ぼんぼんりぼん"]);
  assert.deepEqual(names("ぼんぼんりほぼん"), ["ぼんぼんりぼん"]);
});

test("複数の既知キャラクターを表示順のまま返す", () => {
  assert.deepEqual(
    names("マイメロディ・クロミ・マイスイートピアノ"),
    ["マイメロディ", "クロミ", "マイスウィートピアノ"],
  );
});

test("PDFの出演者行から既知キャラクターだけを抽出する", () => {
  assert.deepEqual(
    canonicalCharacters(
      "出演: マイスイートピア・ルピー・バッドばぱつ丸 ※キャラクターと並んでの撮影はできません。",
      { preserveUnknown: false },
    ).map((character) => character.name),
    ["マイスウィートピアノ", "ルビー", "バッドばつ丸"],
  );
});

test("予定名に含まれる誤認識も正規化する", () => {
  assert.equal(
    normalizeCharacterNamesInText("マイスイートピアとルピーのグリーティング"),
    "マイスウィートピアノとルビーのグリーティング",
  );
});

test("未登録名の取り込み互換性を維持する", () => {
  assert.deepEqual(names("ニャニィ・ニュニェニョン"), ["ニャニィ", "ニュニェニョン"]);
});
