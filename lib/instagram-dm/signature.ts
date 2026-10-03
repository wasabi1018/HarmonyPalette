import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyMetaSignature(rawBody: string, signature: string | null, secret: string) {
  if (!signature?.startsWith("sha256=")) return false;
  const received = signature.slice(7);
  if (!/^[0-9a-f]{64}$/i.test(received)) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  return timingSafeEqual(expected, Buffer.from(received, "hex"));
}
