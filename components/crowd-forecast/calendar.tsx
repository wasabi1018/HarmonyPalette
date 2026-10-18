"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  X,
} from "lucide-react";
import {
  LEVEL_LABELS,
  type PublicDay,
  type PublicForecast,
} from "@/lib/crowd-forecast/types";
import { WeatherDetails, WeatherIcon } from "./weather";
import { fullDate, placeholderDay, topicsFor } from "@/lib/crowd-forecast/presentation";
import { ForecastMonthCalendar, ForecastPublicationNotice, TopicLabel } from "./month";
import styles from "./forecast.module.css";

function DayDetail({ day, titleId }: { day: PublicDay; titleId: string }) {
  const topics = topicsFor(day);
  return (
    <>
      <p className={styles.eyebrow}>選択した日</p>
      <h2 id={titleId} className={styles.selectedDate}>
        {fullDate(day.date)}
      </h2>
      <div className={styles.detailLevel}>
        <span className={`${styles.swatch} ${styles[day.level]}`} />
        <strong>{LEVEL_LABELS[day.level]}</strong>
        {day.weather && (
          <span className={styles.mobileWeather}>
            <WeatherIcon weather={day.weather} size={29} />
            <b>{day.weather.text}</b>
          </span>
        )}
      </div>
      {day.provisional && (
        <p className={styles.muted}>
          基本予想：未公開・未確認の予定は反映していません。
        </p>
      )}
      <WeatherDetails day={day} />
      <dl className={styles.dayFacts}>
        <div>
          <dt>
            <Clock3 size={14} aria-hidden="true" />
            営業時間
          </dt>
          <dd>
            {day.level === "closed"
              ? "休園日"
              : day.opening && day.closing
                ? `${day.opening}〜${day.closing}`
                : "未公開・確認中"}
          </dd>
        </div>
        {topics.length > 0 && (
          <div>
            <dt>この日のトピックス</dt>
            <dd>
              <ul className={styles.topics} aria-label="この日のトピックス">
                {topics.map((topic) => (
                  <li key={topic.key}>
                    <TopicLabel text={topic.text} night={topic.night} />
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        )}
      </dl>
      <Link
        href={`/daily-schedule?date=${day.date}`}
        className={styles.scheduleLink}
      >
        この日のスケジュールを見る
        <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </>
  );
}
export function CrowdForecastCalendar({
  forecast,
}: {
  forecast: PublicForecast;
}) {
  const [month, setMonth] = useState(forecast.months[0]);
  const [selected, setSelected] = useState(forecast.today),
    [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null),
    selectedButton = useRef<HTMLButtonElement | null>(null);
  const byDate = new Map(forecast.days.map((day) => [day.date, day]));
  const selectedDay = byDate.get(selected) ?? placeholderDay(selected);
  const monthIndex = forecast.months.indexOf(month);
  useEffect(() => {
    if (!open) return;
    const el = dialog.current,
      overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    el?.showModal();
    const resize = () => {
      if (window.matchMedia("(min-width: 1024px)").matches) setOpen(false);
    };
    window.addEventListener("resize", resize);
    return () => {
      el?.close();
      document.body.style.overflow = overflow;
      window.removeEventListener("resize", resize);
      selectedButton.current?.focus();
    };
  }, [open]);
  function choose(day: string, button: HTMLButtonElement) {
    selectedButton.current = button;
    setSelected(day);
    if (window.matchMedia("(max-width: 1023px)").matches) setOpen(true);
  }
  function changeMonth(index: number) {
    const next = forecast.months[index];
    if (next) {
      setMonth(next);
      setSelected(
        next === forecast.today.slice(0, 7) ? forecast.today : `${next}-01`,
      );
    }
  }
  return (
    <div className={styles.page}>
      <header className={styles.pageHeading}>
        <div>
          <p className={styles.eyebrow}>
            <CalendarDays size={14} aria-hidden="true" />
            HARMONYLAND
          </p>
          <h1>混雑予想</h1>
          <p>お出かけ前に、混み具合をチェック。</p>
        </div>
        {forecast.delayed && (
          <div className={styles.update}>
            <p role="status">更新に遅れが生じています</p>
          </div>
        )}
      </header>
      <ForecastPublicationNotice forecast={forecast} month={month} />
      <div className={styles.layout}>
        <ForecastMonthCalendar forecast={forecast} month={month} selected={selected} onSelect={choose}
          controls={<div>
            <button disabled={monthIndex === 0} onClick={() => changeMonth(monthIndex - 1)} aria-label="前の月"><ChevronLeft size={22} /></button>
            <button disabled={monthIndex === forecast.months.length - 1} onClick={() => changeMonth(monthIndex + 1)} aria-label="次の月"><ChevronRight size={22} /></button>
          </div>}
        />
        <aside className={styles.sidebar} aria-label="選択日の詳細">
          <DayDetail day={selectedDay} titleId="desktop-day-title" />
        </aside>
      </div>
      <section className={styles.about}>
        <h2>混雑予想について</h2>
        <p>翌日以降の予想を毎日19時ごろに更新します。</p>
        <p>
          曜日・連休・営業時間・グリーティングの予定・イベントの開始や終了・キャラクターのお誕生日などを参考に予想しています。直近の日程には天気予報も考慮しています。
        </p>
        <p>
          予想は目安であり、実際の混雑とは異なる場合があります。過ぎた日は当時公開した予想を表示しています。
        </p>
        <p>
          天気の出典：
          <a href="https://www.jma.go.jp/" target="_blank" rel="noreferrer">
            気象庁
          </a>
        </p>
      </section>
      <dialog
        ref={dialog}
        className={styles.dialog}
        aria-labelledby="modal-day-title"
        onCancel={() => setOpen(false)}
        onClose={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key !== "Tab") return;
          const items = [
            ...e.currentTarget.querySelectorAll<HTMLElement>(
              'button:not(:disabled), a[href], [tabindex="0"]',
            ),
          ].filter((el) => el.getClientRects().length > 0);
          const first = items[0],
            last = items.at(-1);
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(false);
        }}
      >
        <div className={styles.sheet}>
          <span className={styles.handle} aria-hidden="true" />
          <button
            type="button"
            className={styles.close}
            aria-label="詳細を閉じる"
            autoFocus
            onClick={() => setOpen(false)}
          >
            <X size={25} />
          </button>
          <DayDetail day={selectedDay} titleId="modal-day-title" />
        </div>
      </dialog>
    </div>
  );
}
