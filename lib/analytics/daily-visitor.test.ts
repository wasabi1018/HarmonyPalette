import assert from "node:assert/strict";
import test from "node:test";
import {
  DAILY_VISITOR_STORAGE_KEY,
  getOrCreateDailyVisitorState,
  japanCalendarDate,
  markDailyVisitorRecorded,
  parseDailyVisitorState,
} from "./daily-visitor";

const TOKEN = "f4ef6df6-0615-4f4c-9f9b-3ef5ed6ba5dc";

function createStorage(initialValue: string | null = null) {
  let value = initialValue;
  return {
    getItem(key: string) {
      assert.equal(key, DAILY_VISITOR_STORAGE_KEY);
      return value;
    },
    setItem(key: string, nextValue: string) {
      assert.equal(key, DAILY_VISITOR_STORAGE_KEY);
      value = nextValue;
    },
    value() {
      return value;
    },
  };
}

test("日本時間の日付境界で日付を切り替える", () => {
  assert.equal(japanCalendarDate(new Date("2026-09-29T14:59:59Z")), "2026-09-29");
  assert.equal(japanCalendarDate(new Date("2026-09-29T15:00:00Z")), "2026-09-30");
});

test("同じ日の有効な状態を再利用する", () => {
  const stored = JSON.stringify({ version: 1, date: "2026-09-29", token: TOKEN, recorded: false });
  const storage = createStorage(stored);
  const state = getOrCreateDailyVisitorState(storage, "2026-09-29", () => {
    throw new Error("既存トークンがある場合は生成しない");
  });

  assert.deepEqual(state, { version: 1, date: "2026-09-29", token: TOKEN, recorded: false });
  assert.equal(storage.value(), stored);
});

test("日付が変わると新しい状態へ置き換える", () => {
  const storage = createStorage(JSON.stringify({
    version: 1,
    date: "2026-09-28",
    token: TOKEN,
    recorded: true,
  }));
  const nextToken = "514f228a-9a8a-46f4-b4fc-0502148242d9";
  const state = getOrCreateDailyVisitorState(storage, "2026-09-29", () => nextToken);

  assert.deepEqual(state, {
    version: 1,
    date: "2026-09-29",
    token: nextToken,
    recorded: false,
  });
});

test("壊れた保存値は破棄して作り直す", () => {
  const storage = createStorage("not-json");
  const state = getOrCreateDailyVisitorState(storage, "2026-09-29", () => TOKEN);

  assert.equal(state.token, TOKEN);
  assert.equal(parseDailyVisitorState(storage.value(), "2026-09-29")?.recorded, false);
});

test("同じ日付とトークンの場合だけ記録済みにする", () => {
  const state = { version: 1 as const, date: "2026-09-29", token: TOKEN, recorded: false };
  const storage = createStorage(JSON.stringify(state));

  assert.equal(markDailyVisitorRecorded(storage, state), true);
  assert.equal(parseDailyVisitorState(storage.value(), state.date)?.recorded, true);

  assert.equal(markDailyVisitorRecorded(storage, {
    ...state,
    token: "514f228a-9a8a-46f4-b4fc-0502148242d9",
  }), false);
});
