import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { optimizeArticleImage } from "@/lib/articles/image-optimization";

test("article uploads are resized and converted to WebP when that saves space", async () => {
  const source = await sharp({
    create: {
      width: 3200,
      height: 1800,
      channels: 3,
      background: { r: 235, g: 110, b: 152 },
    },
  }).png().toBuffer();
  const result = await optimizeArticleImage(source, "image/png");
  assert.equal(result.contentType, "image/webp");
  assert.equal(result.extension, "webp");
  assert.equal(result.width, 2400);
  assert.equal(result.height, 1350);
  assert.ok(result.buffer.byteLength < source.byteLength);
});

test("GIF uploads keep their original format", async () => {
  const source = await sharp({
    create: {
      width: 32,
      height: 32,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  }).gif().toBuffer();
  const result = await optimizeArticleImage(source, "image/gif");
  assert.equal(result.contentType, "image/gif");
  assert.deepEqual(result.buffer, source);
});
