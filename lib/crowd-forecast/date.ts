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
export function minutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
