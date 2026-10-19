"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronDown, ChevronRight, Umbrella } from "lucide-react";
import { LEVEL_LABELS, type PublicDay } from "@/lib/crowd-forecast/types";
import { WeatherIcon, formatForecastTime } from "./weather";
import { minutes } from "@/lib/crowd-forecast/date";
import styles from "./forecast.module.css";

export function DailyForecastSummary({ date }: { date: string }) {
  const [result, setResult] = useState<{
    date: string;
    day: PublicDay | null;
    failed?: boolean;
  } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/crowd-forecast?date=${date}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => setResult({ date, day: data.day }))
      .catch((error) => {
        if (error.name !== "AbortError")
          setResult({ date, day: null, failed: true });
      });
    return () => controller.abort();
  }, [date]);
  const day = result?.date === date ? result.day : null,
    weather = day?.weather;
  const loading = result?.date !== date;
  const hasLevel = day !== null && day.level !== "pending";
  const rain = weather?.rain.filter(
    (r) =>
      r.to > (day?.opening ? minutes(day.opening) / 60 : 6) &&
      r.from < (day?.closing ? minutes(day.closing) / 60 : 24),
  );
  return (
    <section
      className={styles.daily}
      aria-label="天気と混雑予想"
      aria-busy={loading}
    >
      <div className={styles.dailyHeader}>
        <div className={styles.dailyCrowd} aria-live="polite">
          <h3>混雑予想</h3>
          <p className={`${styles.dailyLevel} ${hasLevel ? "" : styles.dailyStatus}`}>
            {hasLevel && (
              <span
                className={`${styles.swatch} ${styles[day?.level ?? "pending"]}`}
                aria-hidden="true"
              />
            )}
            {day
              ? LEVEL_LABELS[day.level]
              : loading
                ? "読み込み中…"
                : result?.failed
                  ? "取得できませんでした"
                  : "予想準備中"}
          </p>
          {day?.provisional && <p className={styles.dailyNote}>基本予想</p>}
        </div>
        <Link href="/crowd-forecast" className={styles.calendarLink}>
          <CalendarDays size={14} aria-hidden="true" />
          混雑カレンダー
          <ChevronRight size={14} aria-hidden="true" />
        </Link>
      </div>
      {weather ? (
        <div className={styles.dailyForecast}>
          <div className={styles.dailyWeather}>
            <p>
              <WeatherIcon weather={weather} size={22} />
              <span>{weather.text}</span>
            </p>
            <dl className={styles.dailyTemperatures}>
              <div>
                <dt>最高</dt><dd>{weather.high ?? "—"}℃</dd>
              </div>
              <div>
                <dt>最低</dt><dd>{weather.low ?? "—"}℃</dd>
              </div>
            </dl>
          </div>
          <div className={styles.dailyRain}>
            <p>
              <Umbrella size={12} aria-hidden="true" />降水確率
            </p>
            <dl>
              {rain?.length ? (
                rain.map((r) => (
                  <div key={r.from}>
                    <dt>{r.from}〜{r.to}時</dt><dd>{r.probability}%</dd>
                  </div>
                ))
              ) : (
                <div>
                  <dt>日単位</dt><dd>{weather.dailyRain ?? "—"}%</dd>
                </div>
              )}
            </dl>
          </div>
          <details key={date} className={styles.dailyDetails}>
            <summary>
              <span>
                {weather.region}{day?.archived ? "・当時の予報" : "の予報"}
              </span>
              <span>
                詳細<ChevronDown size={12} aria-hidden="true" />
              </span>
            </summary>
            <p>
              気温：{weather.station}地点（園内のピンポイント予報ではありません）
              <br />
              出典：
              <a
                href="https://www.jma.go.jp/bosai/forecast/#area_type=class20s&area_code=4434100"
                target="_blank"
                rel="noreferrer"
              >
                気象庁
              </a>
              ・{formatForecastTime(weather.issuedAt)}発表
            </p>
          </details>
        </div>
      ) : (
        <p className={styles.dailyError}>
          {loading ? "天気予報を読み込み中…" : "天気予報対象外・未取得"}
        </p>
      )}
    </section>
  );
}
