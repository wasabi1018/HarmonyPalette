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

// Keep retries on the existing 15-minute Cron ticks. The two slots after the
// scheduled daily run are the retry window; a sustained outage waits until the
// next regular run rather than invoking Vercel throughout the day.
export function nextMonitorRetryAt(scheduledTime: string, now = new Date()) {
  const nextRegular = nextRunAt(scheduledTime, now);
  const scheduled = Date.parse(nextRegular) - 86_400_000;
  const quarterHour = 15 * 60_000;
  const retry = (Math.floor(now.getTime() / quarterHour) + 1) * quarterHour;
  return retry <= scheduled + 2 * quarterHour
    ? new Date(retry).toISOString()
    : nextRegular;
}
