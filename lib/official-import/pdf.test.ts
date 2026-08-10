import assert from "node:assert/strict";
import test from "node:test";

import { ensurePdfJsNodeGlobals } from "@/lib/official-import/pdf";

test("PDF.js が必要とする Node.js の Canvas API を初期化する", async () => {
  const originalGlobals = {
    DOMMatrix: globalThis.DOMMatrix,
    ImageData: globalThis.ImageData,
    Path2D: globalThis.Path2D,
  };

  try {
    Object.assign(globalThis, {
      DOMMatrix: undefined,
      ImageData: undefined,
      Path2D: undefined,
    });

    await ensurePdfJsNodeGlobals();

    assert.equal(typeof globalThis.DOMMatrix, "function");
    assert.equal(typeof globalThis.ImageData, "function");
    assert.equal(typeof globalThis.Path2D, "function");
  } finally {
    Object.assign(globalThis, originalGlobals);
  }
});
