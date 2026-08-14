export function nextRunAt(scheduledTime: string, now = new Date()) {
  const [hour, minute] = scheduledTime.split(":").map(Number);
  const japanNow = new Date(now.getTime() + 9 * 60 * 60_000);
  let target = new Date(Date.UTC(
    japanNow.getUTCFullYear(),
    japanNow.getUTCMonth(),
    japanNow.getUTCDate(),
    hour - 9,
    minute,
  ));
  if (target.getTime() <= now.getTime()) target = new Date(target.getTime() + 86_400_000);
  return target.toISOString();
}
