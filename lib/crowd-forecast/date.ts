export function japanDay(now = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(
    now,
  );
}
export function addDays(date: string, count: number) {
  return new Date(Date.parse(`${date}T00:00:00Z`) + count * 86400000)
    .toISOString()
    .slice(0, 10);
}
export function weekday(date: string) {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}
export function validDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    addDays(value, 0) === value
  );
}
export function monthRange(today: string, count: number) {
  return Array.from({ length: count }, (_, i) =>
    new Date(
      Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1 + i, 1),
    )
      .toISOString()
      .slice(0, 7),
  );
}
export function datesBetween(from: string, to: string) {
  const result: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) result.push(d);
  return result;
}
export function formatDateRanges(dates: string[]) {
  const ranges: { from: string; to: string }[] = [];
  for (const date of [...new Set(dates)].sort()) {
    const previous = ranges.at(-1);
    if (previous && addDays(previous.to, 1) === date) previous.to = date;
    else ranges.push({ from: date, to: date });
  }
  const shortDate = (date: string) =>
    `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;
  return ranges
    .map(({ from, to }) =>
      from === to ? shortDate(from) : `${shortDate(from)}～${shortDate(to)}`,
    )
    .join("、");
}
export function minutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
