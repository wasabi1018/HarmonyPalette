/** Cabinet Office's published dates, including substitute and sandwiched holidays. */
export function parseHolidays(csv: string) {
  const holidays: Record<string, string> = {};
  for (const line of csv.trim().split(/\r?\n/).slice(1)) {
    const match = line.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2}),(.+)$/);
    if (!match || Number(match[1]) < 2025) continue;
    const [, year, month, day, name] = match;
    holidays[`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`] =
      name.trim();
  }
  if (Object.keys(holidays).length < 16)
    throw new Error("祝日データの形式を確認できません。");
  return {
    holidays,
    holidayThrough: Math.max(
      ...Object.keys(holidays).map((d) => Number(d.slice(0, 4))),
    ),
  };
}
export async function fetchHolidays() {
  const response = await fetch(
    "https://www8.cao.go.jp/chosei/shukujitsu/syukujitsu.csv",
    { cache: "no-store", signal: AbortSignal.timeout(12000) },
  );
  if (!response.ok) throw new Error("祝日データを取得できません。");
  return parseHolidays(
    new TextDecoder("shift_jis").decode(await response.arrayBuffer()),
  );
}
