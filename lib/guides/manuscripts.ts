import type { GuideArticle } from "./model";
import { starterGuideCatalog, starterGuideOptions } from "./starter-drafts";
import type { ParkGuide, ParkGuideCatalog } from "../park-guides";

type GuideManuscript = {
  id: string;
  title: string;
  href: string;
  status: GuideArticle["status"] | null;
  preview: ParkGuide;
};

export function guideManuscripts(guides: GuideArticle[]) {
  const included = new Set<string>();
  const saved = (guide: GuideArticle): GuideManuscript => ({
    id: guide.id,
    title: guide.title,
    href: `/admin/articles/${guide.id}`,
    status: guide.status,
    preview: { id: guide.id, title: guide.title, summary: guide.excerpt, contentHtml: guide.contentHtml || "<p>本文はまだありません。</p>" },
  });
  const entries = starterGuideOptions.map((starter): GuideManuscript => {
    const existing = guides.find((guide) => guide.slug === starter.slug || (starter.eventKey && guide.eventKey === starter.eventKey));
    if (existing) {
      included.add(existing.id);
      return saved(existing);
    }
    return {
      id: `starter-${starter.id}`,
      title: starter.title,
      href: `/admin/articles/new?type=strategy&mode=${starter.eventKey ? "event" : "custom"}&template=${starter.id}${starter.eventKey ? `&event=${encodeURIComponent(starter.eventKey)}` : ""}`,
      status: null,
      preview: starterGuideCatalog.groups[0].guides.find((guide) => guide.id === starter.id)!,
    };
  });
  entries.push(...guides.filter((guide) => !included.has(guide.id))
    .sort((a, b) => a.displayOrder - b.displayOrder || a.title.localeCompare(b.title, "ja") || a.id.localeCompare(b.id))
    .map(saved));
  const previewData: ParkGuideCatalog = {
    preparing: false,
    groups: [{ id: "manuscripts", name: "ガイド原稿", guides: entries.map((entry) => entry.preview) }],
  };
  return { entries, previewData };
}
