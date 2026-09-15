import type {
  OfficialUpdateHighlight,
  OfficialUpdateSection,
  OfficialUpdateSectionKey,
} from "@/lib/official-monitor/types";

const sectionLabels: Record<OfficialUpdateSectionKey, string> = {
  news: "お知らせ一覧",
  "harmonyland-schedule": "ハーモニーランドのスケジュール",
  "funstudio-schedule": "ファンスタジオのスケジュール",
};

const countLabels: Record<string, string> = {
  added: "追加",
  modified: "変更",
  removed: "削除候補",
  uncertain: "要確認",
};

type NewsEntry = {
  id: string;
  title: string;
  url: string;
  publishedAt: string;
  contentSha256: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function officialNewsUrl(value: unknown) {
  try {
    const url = new URL(String(value ?? ""));
    return url.protocol === "https:" && url.hostname === "www.harmonyland.jp" && /^\/news\/\d+\/?$/i.test(url.pathname)
      ? url.toString()
      : "";
  } catch {
    return "";
  }
}

function newsEntries(metadata: Record<string, unknown> | undefined): NewsEntry[] {
  if (!Array.isArray(metadata?.entries)) return [];
  return metadata.entries.flatMap((value) => {
    if (!isRecord(value)) return [];
    const id = String(value.id ?? "").trim();
    const title = String(value.title ?? "").trim();
    const url = officialNewsUrl(value.url);
    if (!id || !title || !url) return [];
    return [{
      id,
      title,
      url,
      publishedAt: String(value.publishedAt ?? ""),
      contentSha256: String(value.contentSha256 ?? ""),
    }];
  });
}

function highlight(prefix: string, entry: NewsEntry): OfficialUpdateHighlight {
  return { label: `${prefix}: ${entry.title}`, url: entry.url };
}

export function diffNewsMetadata(
  previous: Record<string, unknown> | undefined,
  current: Record<string, unknown>,
) {
  const before = new Map(newsEntries(previous).map((entry) => [entry.id, entry]));
  const after = new Map(newsEntries(current).map((entry) => [entry.id, entry]));
  const diffCounts: Record<string, number> = {};
  const highlights: OfficialUpdateHighlight[] = [];

  for (const [id, entry] of after) {
    const prior = before.get(id);
    if (!prior) {
      diffCounts.added = (diffCounts.added || 0) + 1;
      highlights.push(highlight("追加", entry));
    } else if (prior.title !== entry.title || prior.url !== entry.url || prior.contentSha256 !== entry.contentSha256) {
      diffCounts.modified = (diffCounts.modified || 0) + 1;
      highlights.push(highlight("変更", entry));
    }
  }
  for (const [id, entry] of before) {
    if (!after.has(id)) {
      diffCounts.removed = (diffCounts.removed || 0) + 1;
      highlights.push(highlight("削除候補", entry));
    }
  }

  return { diffCounts, highlights: highlights.slice(0, 5) };
}

export function officialUpdateSectionLabel(key: OfficialUpdateSectionKey) {
  return sectionLabels[key];
}

export function officialUpdateCountsText(counts: Record<string, number>) {
  const values = Object.entries(countLabels).flatMap(([key, label]) => counts[key] ? [`${label} ${counts[key]}件`] : []);
  return values.length ? values.join(" / ") : "変更あり";
}

export function officialUpdateDatesText(dates: string[]) {
  return dates.map((date) => {
    const [year, month, day] = date.split("-").map(Number);
    return `${year}年${month}月${day}日`;
  }).join("、");
}

export function buildOfficialUpdateSummary(sections: OfficialUpdateSection[]) {
  const labels = sections.map((section) => officialUpdateSectionLabel(section.key));
  if (labels.length === 0) return "公式サイトの更新を検出しました。";
  const targets = labels.length === 2 ? labels.join("と") : labels.join("、");
  return `${targets}が変更されました。`;
}

export function mergeOfficialUpdateSection(
  sections: OfficialUpdateSection[],
  incoming: OfficialUpdateSection,
) {
  const existing = sections.find((section) => section.key === incoming.key);
  if (!existing) {
    sections.push({
      ...incoming,
      dates: Array.from(new Set(incoming.dates)).sort(),
      highlights: incoming.highlights.slice(0, 5),
    });
    return;
  }
  existing.dates = Array.from(new Set([...existing.dates, ...incoming.dates])).sort();
  for (const [key, value] of Object.entries(incoming.diffCounts)) {
    existing.diffCounts[key] = (existing.diffCounts[key] || 0) + value;
  }
  existing.highlights = [...existing.highlights, ...incoming.highlights].slice(0, 5);
}

export function totalOfficialUpdateCounts(sections: OfficialUpdateSection[]) {
  return sections.reduce<Record<string, number>>((total, section) => {
    for (const [key, value] of Object.entries(section.diffCounts)) total[key] = (total[key] || 0) + value;
    return total;
  }, {});
}

export function readOfficialUpdateSections(metadata: Record<string, unknown>): OfficialUpdateSection[] {
  if (!Array.isArray(metadata.sections)) return [];
  return metadata.sections.flatMap((value) => {
    if (!isRecord(value) || !Object.hasOwn(sectionLabels, String(value.key))) return [];
    const diffCounts = isRecord(value.diffCounts)
      ? Object.fromEntries(Object.entries(value.diffCounts).flatMap(([key, count]) => Number.isFinite(Number(count)) ? [[key, Number(count)]] : []))
      : {};
    const highlights = Array.isArray(value.highlights) ? value.highlights.flatMap((item) => {
      if (!isRecord(item) || !String(item.label ?? "").trim()) return [];
      const url = officialNewsUrl(item.url);
      return [{ label: String(item.label), ...(url ? { url } : {}) }];
    }) : [];
    return [{
      key: String(value.key) as OfficialUpdateSectionKey,
      dates: Array.isArray(value.dates) ? value.dates.map(String).filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)) : [],
      diffCounts,
      highlights,
    }];
  });
}
