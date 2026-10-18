import { Cloud, CloudRain, CloudSun, Sun, Umbrella } from "lucide-react";
import type { PublicDay, Weather } from "@/lib/crowd-forecast/types";
import { minutes } from "@/lib/crowd-forecast/date";
import styles from "./forecast.module.css";

export function WeatherIcon({
  weather,
  size = 22,
}: {
  weather: Weather;
  size?: number;
}) {
  const Icon =
    weather.kind.includes("Rain") || weather.kind === "rain"
      ? CloudRain
      : weather.kind === "cloud"
        ? Cloud
        : /くもり|曇/.test(weather.text)
          ? CloudSun
          : Sun;
  return (
    <Icon
      size={size}
      aria-hidden="true"
      className={styles[`weather_${weather.kind}`]}
      strokeWidth={1.6}
    />
  );
}
export function formatForecastTime(at: string | null) {
  return at
    ? new Intl.DateTimeFormat("ja-JP", {
        timeZone: "Asia/Tokyo",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).format(new Date(at))
    : "未更新";
}
export function WeatherDetails({ day }: { day: PublicDay }) {
  const w = day.weather;
  if (!w)
    return (
      <p className={styles.muted}>
        天気予報の対象外、または予報を取得できていません。
      </p>
    );
  const from = day.opening ? minutes(day.opening) / 60 : 6,
    to = day.closing ? minutes(day.closing) / 60 : 24;
  const rain = w.rain.filter((r) => r.to > from && r.from < to);
  return (
    <div className={styles.weatherDetails}>
      <div className={styles.weatherHeadline}>
        <WeatherIcon weather={w} size={34} />
        <strong>{w.text}</strong>
      </div>
      <div className={styles.temperatures}>
        <span>
          最高{" "}
          <b>
            {w.high ?? "—"}
            <small>℃</small>
          </b>
        </span>
        <span>
          最低{" "}
          <b>
            {w.low ?? "—"}
            <small>℃</small>
          </b>
        </span>
      </div>
      <div className={styles.precipitation}>
        <p>
          <Umbrella size={14} aria-hidden="true" />
          降水確率
        </p>
        <div>
          {rain.length ? (
            rain.map((r) => (
              <span key={r.from}>
                {r.from}〜{r.to}時{" "}
                <b>
                  {r.probability}
                  <small>%</small>
                </b>
              </span>
            ))
          ) : (
            <span>
              日単位{" "}
              <b>
                {w.dailyRain ?? "—"}
                <small>%</small>
              </b>
            </span>
          )}
        </div>
      </div>
      <p className={styles.source}>
        {day.archived ? "当時の予報・" : ""}
        {w.region}／気温：{w.station}地点
        <br />
        出典：
        <a
          href="https://www.jma.go.jp/bosai/forecast/#area_type=class20s&area_code=4434100"
          target="_blank"
          rel="noreferrer"
        >
          気象庁
        </a>
        ・{formatForecastTime(w.issuedAt)}発表
      </p>
    </div>
  );
}
