const ENGLISH_MONTHS = new Map([
  ["january", 1],
  ["february", 2],
  ["march", 3],
  ["april", 4],
  ["may", 5],
  ["june", 6],
  ["july", 7],
  ["august", 8],
  ["september", 9],
  ["october", 10],
  ["november", 11],
  ["december", 12],
]);

export type DatedArticlePeriod = {
  year: number;
  month: number;
};

function currentJapanPeriod(now: Date): DatedArticlePeriod {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "numeric",
  }).formatToParts(now);
  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
  };
}

export function datedArticlePeriod(slug: string): DatedArticlePeriod | null {
  const numeric = slug.match(/^(\d{4})-(\d{1,2})$/);
  if (numeric) {
    const month = Number(numeric[2]);
    return month >= 1 && month <= 12
      ? { year: Number(numeric[1]), month }
      : null;
  }

  const named = slug.match(/(?:^|-)(january|february|march|april|may|june|july|august|september|october|november|december)-(\d{4})(?:-|$)/i);
  if (!named) return null;
  return {
    year: Number(named[2]),
    month: ENGLISH_MONTHS.get(named[1].toLowerCase()) || 0,
  };
}

export function datedArticleStatus(slug: string, now = new Date()) {
  const period = datedArticlePeriod(slug);
  if (!period) return null;
  const current = currentJapanPeriod(now);
  const periodValue = period.year * 12 + period.month;
  const currentValue = current.year * 12 + current.month;
  return {
    ...period,
    isPast: periodValue < currentValue,
    isCurrent: periodValue === currentValue,
  };
}

export function shouldIndexPublishedArticle(slug: string, now = new Date()) {
  return datedArticleStatus(slug, now)?.isPast !== true;
}
