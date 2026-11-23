import type { ArticleInput } from "@/lib/articles/types";
import { PARK_GUIDE_NOTE, type ParkGuideCatalog } from "@/lib/park-guides";
import { PARK_GUIDES } from "./starter-copy";

const slugs: Record<string, string> = {
  "fan-studio": "fan-studio-strategy-guide",
  attractions: "attractions-strategy-guide",
  "harmony-train": "harmony-train-strategy-guide",
  "kitty-castle": "kitty-castle-strategy-guide",
};

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export function createStarterGuideDraft(id: string): ArticleInput | null {
  const guide = PARK_GUIDES.find((item) => item.id === id);
  if (!guide) return null;
  const content: Record<string, unknown>[] = [];
  const html: string[] = [];
  for (const section of guide.sections ?? []) {
    content.push({ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: section.title }] });
    html.push(`<h2>${escapeHtml(section.title)}</h2>`);
    for (const text of section.paragraphs ?? []) {
      content.push({ type: "paragraph", content: [{ type: "text", text }] });
      html.push(`<p>${escapeHtml(text)}</p>`);
    }
    if (section.items) {
      content.push({ type: "bulletList", content: section.items.map((text) => ({ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text }] }] })) });
      html.push(`<ul>${section.items.map((text) => `<li><p>${escapeHtml(text)}</p></li>`).join("")}</ul>`);
    }
  }
  content.push({ type: "paragraph", content: [{ type: "text", text: PARK_GUIDE_NOTE }] });
  html.push(`<p>${escapeHtml(PARK_GUIDE_NOTE)}</p>`);
  return {
    title: guide.title, slug: slugs[id], excerpt: guide.summary,
    seoTitle: guide.title, seoDescription: guide.summary,
    contentJson: { type: "doc", content }, contentHtml: html.join(""), coverImageUrl: "",
    status: "draft", destination: "articles", publishedAt: null,
    tagIds: [], seriesId: null, seriesOrder: null,
    guide: { eventKey: id === "fan-studio" ? "harmonyland-funstudio" : null, categoryId: null, displayOrder: 100000 },
  };
}

export const starterGuideCatalog: ParkGuideCatalog = {
  preparing: false,
  groups: [{ id: "starter-drafts", name: "今回の原稿（未保存）", guides: [...PARK_GUIDES] }],
};

export const starterGuideOptions = PARK_GUIDES.map((guide) => ({ id: guide.id, title: guide.title, slug: slugs[guide.id], eventKey: guide.id === "fan-studio" ? "harmonyland-funstudio" : null }));
