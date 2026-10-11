export type InstagramMediaPage = {
  data?: Array<{ id?: unknown; permalink?: unknown }>;
  paging?: { next?: string; cursors?: { after?: string } };
};

export type ReelLookupResult =
  | { status: "found"; id: string; permalink: string }
  | { status: "invalid_url" | "not_found" | "limit_reached" | "timeout" | "invalid_response" };

const MAX_MEDIA_PAGES = 50;
const MAX_LOOKUP_MS = 100_000;

function shortcodeFromUrl(input: string, allowPost = false) {
  if (!input || input.length > 2048) return null;
  try {
    const url = new URL(input.trim());
    if (url.protocol !== "https:" || !["instagram.com", "www.instagram.com"].includes(url.hostname)
      || url.username || url.password || url.port) return null;
    const match = (allowPost ? /^\/(?:reel|p)\/([A-Za-z0-9_-]+)\/?$/ : /^\/reel\/([A-Za-z0-9_-]+)\/?$/).exec(url.pathname);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function isInstagramReelUrl(input: string) {
  return shortcodeFromUrl(input) !== null;
}

export async function findInstagramReelMedia(
  reelUrl: string,
  loadPage: (after?: string) => Promise<InstagramMediaPage>,
): Promise<ReelLookupResult> {
  const shortcode = shortcodeFromUrl(reelUrl);
  if (!shortcode) return { status: "invalid_url" };

  const startedAt = Date.now();
  let after: string | undefined;
  const seenCursors = new Set<string>();
  for (let pageNumber = 0; pageNumber < MAX_MEDIA_PAGES; pageNumber += 1) {
    if (Date.now() - startedAt > MAX_LOOKUP_MS) return { status: "timeout" };
    const page = await loadPage(after);
    if (!Array.isArray(page?.data)) return { status: "invalid_response" };
    for (const media of page.data) {
      if (typeof media?.id !== "string" || !/^\d{5,100}$/.test(media.id)
        || typeof media.permalink !== "string") continue;
      if (shortcodeFromUrl(media.permalink, true) === shortcode) {
        return { status: "found", id: media.id, permalink: media.permalink };
      }
    }
    if (!page.paging?.next) return { status: "not_found" };
    const nextCursor = page.paging.cursors?.after;
    if (!nextCursor || seenCursors.has(nextCursor)) return { status: "invalid_response" };
    seenCursors.add(nextCursor);
    after = nextCursor;
  }
  return { status: "limit_reached" };
}
