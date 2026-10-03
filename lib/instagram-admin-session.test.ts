import assert from "node:assert/strict";
import test from "node:test";
import { createInstagramSessionStore } from "./instagram-admin-session";

test("navigation retains edits without notifying other tools", () => {
  const store = createInstagramSessionStore();
  let firstNotifications = 0;
  let otherNotifications = 0;
  const unsubscribe = store.subscribe("crowd", () => firstNotifications++);
  store.subscribe("settings", () => otherNotifications++);
  store.write("crowd", { level: "normal" }, { level: "busy" });
  unsubscribe();
  assert.deepEqual(store.read("crowd", { level: "normal" }), { level: "busy" });
  assert.equal(firstNotifications, 1);
  assert.equal(otherNotifications, 0);
  assert.deepEqual(createInstagramSessionStore().read("crowd", { level: "normal" }), { level: "normal" });
});

test("pending DM files survive navigation and clear after registration", () => {
  const store = createInstagramSessionStore();
  const file = new File(["png fixture"], "ranking.png", { type: "image/png" });
  store.write<File | null>("dm.file", null, file);
  assert.equal(store.read<File | null>("dm.file", null), file);
  store.markUnsaved("dm", true);
  store.markUnsaved("settings", true);
  store.write<File | null>("dm.file", null, null);
  store.markUnsaved("dm", false);
  assert.equal(store.hasUnsaved(), true);
  store.markUnsaved("settings", false);
  assert.equal(store.hasUnsaved(), false);
});
