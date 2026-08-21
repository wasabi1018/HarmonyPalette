import "server-only";

import sanitizeHtml from "sanitize-html";
import { proxyArticleImageSources } from "@/lib/articles/media-url";

export type ArticleHeading = {
  id: string;
  level: 2 | 3 | 4;
  text: string;
};

function plainText(html: string) {
  return sanitizeHtml(html, {
    allowedTags: [],
    allowedAttributes: {},
  })
    .replace(/\s+/g, " ")
    .trim();
}

function headingId(text: string, index: number) {
  const normalized = text
    .normalize("NFKC")
    .toLocaleLowerCase("ja")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/[\s-]+/g, "-")
    .slice(0, 64);
  return normalized || `section-${index + 1}`;
}

export function prepareArticleContent(contentHtml: string) {
  const headings: ArticleHeading[] = [];
  const counts = new Map<string, number>();
  const htmlWithHeadings = contentHtml.replace(
    /<h([2-4])>([\s\S]*?)<\/h\1>/gi,
    (match, rawLevel: string, innerHtml: string) => {
      const text = plainText(innerHtml);
      if (!text) return match;
      const baseId = headingId(text, headings.length);
      const count = (counts.get(baseId) || 0) + 1;
      counts.set(baseId, count);
      const id = count === 1 ? baseId : `${baseId}-${count}`;
      const level = Number(rawLevel) as 2 | 3 | 4;
      headings.push({ id, level, text });
      return `<h${level} id="${id}">${innerHtml}</h${level}>`;
    },
  );
  const html = proxyArticleImageSources(htmlWithHeadings);

  return {
    html,
    headings,
    readingTimeMinutes: Math.max(1, Math.ceil(plainText(contentHtml).length / 500)),
  };
}
