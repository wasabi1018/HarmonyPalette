import assert from "node:assert/strict";
import test from "node:test";
import { sameOriginAdminRequest } from "./admin-request";

test("admin writes reject a foreign Origin", () => {
  assert.equal(sameOriginAdminRequest(new Request("https://harmonypalette.jp/api/admin/instagram-dm/assets", {
    headers: { origin: "https://harmonypalette.jp" },
  })), true);
  assert.equal(sameOriginAdminRequest(new Request("https://harmonypalette.jp/api/admin/instagram-dm/assets", {
    headers: { origin: "https://other.example" },
  })), false);
});
