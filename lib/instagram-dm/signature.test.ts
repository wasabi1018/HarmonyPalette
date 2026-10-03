import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { verifyMetaSignature } from "./signature";

test("Meta webhook signature is checked against the unmodified raw body", () => {
  const body = '{"object":"instagram"}';
  const signature = `sha256=${createHmac("sha256", "test-secret").update(body).digest("hex")}`;
  assert.equal(verifyMetaSignature(body, signature, "test-secret"), true);
  assert.equal(verifyMetaSignature(`${body} `, signature, "test-secret"), false);
  assert.equal(verifyMetaSignature(body, "sha256=not-a-digest", "test-secret"), false);
  assert.equal(verifyMetaSignature(body, null, "test-secret"), false);
});
