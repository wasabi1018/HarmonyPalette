import "server-only";
import { parseDocument } from "htmlparser2";
import type { ArticleHeading } from "@/lib/articles/publishing";

// Only split at a root-level heading, keeping lists and blockquotes intact.
function rootHeadings(html: string) {
  return parseDocument(html, { withStartIndices: true }).children.filter((node) =>
    node.type === "tag" && /^h[2-4]$/.test(node.name) && node.attribs.id && (node.startIndex ?? 0) > 0,
  );
}

export function articleRakutenHeadings(html: string, headings: ArticleHeading[]) {
  const ids = new Set(rootHeadings(html).map((node) => node.type === "tag" ? node.attribs.id : ""));
  return headings.filter((heading) => ids.has(heading.id));
}

export function splitArticleHtmlBeforeHeading(html: string, headingId: string | undefined) {
  if (!headingId) return null;
  const target = rootHeadings(html).find((node) => node.type === "tag" && node.attribs.id === headingId);
  if (!target || target.startIndex == null) return null;
  return { before: html.slice(0, target.startIndex), after: html.slice(target.startIndex) };
}
