"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
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
  const rain = weather?.rain.filter(
    (r) =>
      r.to > (day?.opening ? minutes(day.opening) / 60 : 6) &&
      r.from < (day?.closing ? minutes(day.closing) / 60 : 24),
  );
  return (
    <section className={styles.daily} aria-label="天気と混雑予想">
      <div>
        <h3>混雑予想</h3>
        <p className={styles.dailyLevel}>
          <span
            className={`${styles.swatch} ${styles[day?.level ?? "pending"]}`}
          />
          {day
            ? LEVEL_LABELS[day.level]
            : result?.date === date
              ? result.failed
                ? "取得できませんでした"
                : "予想準備中"
              : "読み込み中…"}
          {day?.provisional && "（基本予想）"}
        </p>
      </div>
      {weather ? (
        <div>
          <h3>
            天気・{weather.region}
            {day?.archived ? "（当時の予報）" : ""}
          </h3>
          <div className={styles.dailyWeather}>
            <p>
              <WeatherIcon weather={weather} size={22} />
              {weather.text}
            </p>
            <p>
              最高 {weather.high ?? "—"}℃／最低 {weather.low ?? "—"}℃
            </p>
          </div>
          <p className={styles.dailyRain}>
            降水確率{" "}
            {rain?.length
              ? rain
                  .map((r) => `${r.from}〜${r.to}時 ${r.probability}%`)
                  .join(" ／ ")
              : `日単位 ${weather.dailyRain ?? "—"}%`}
            ・気温：{weather.station}地点
            <br />
            出典：気象庁・{formatForecastTime(weather.issuedAt)}発表
          </p>
        </div>
      ) : (
        <p className={styles.dailyError}>天気予報対象外・未取得</p>
      )}
      <Link href="/crowd-forecast">混雑カレンダー</Link>
    </section>
  );
}
