"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CakeSlice,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  Moon,
  X,
} from "lucide-react";
import {
  addDays,
  datesBetween,
  formatDateRanges,
  weekday,
} from "@/lib/crowd-forecast/date";
import {
  LEVELS,
  LEVEL_LABELS,
  type PublicDay,
  type PublicForecast,
} from "@/lib/crowd-forecast/types";
import { WeatherDetails, WeatherIcon, formatForecastTime } from "./weather";
import styles from "./forecast.module.css";

function placeholder(date: string): PublicDay {
  return {
    date,
    level: "pending",
    opening: null,
    closing: null,
    schedule: "unconfirmed",
    fan: "unconfirmed",
    threeRooms: false,
    topics: [],
    weather: null,
    archived: false,
    updatedAt: "",
  };
}
function fullDate(date: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "long",
    day: "numeric",
    weekday: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}
function TopicLabel({
  text,
  night = false,
  compact = false,
}: {
  text: string;
  night?: boolean;
  compact?: boolean;
}) {
  const label = text.replace(/のお誕生日$/, "誕生日");
  const Icon = night ? Moon : label.endsWith("誕生日") ? CakeSlice : null;
  const units = Math.max(1, Array.from(label).length + (Icon ? 1.4 : 0));
  return (
    <span
      className={styles.topicLine}
      title={label}
      style={compact ? { fontSize: `min(1em, ${96 / units}cqi)` } : undefined}
    >
      {Icon && <Icon size={13} aria-hidden="true" />}
      <span>{label}</span>
    </span>
  );
}
function topicsFor(day: PublicDay) {
  const topics: { key: string; text: string; night?: boolean }[] = [];
  if (day.threeRooms)
    topics.push({ key: "fan", text: "ファンスタ3部屋" });
  if (day.closing && day.closing >= "18:00" && day.level !== "closed")
    topics.push({ key: "night", text: "ナイト営業日", night: true });
  day.topics.forEach((text, index) =>
    topics.push({ key: `topic-${index}`, text }),
  );
  return topics;
}
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
  const first = `${month}-01`,
    last = new Date(
      Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0),
    )
      .toISOString()
      .slice(0, 10);
  const dates = datesBetween(first, last),
    byDate = new Map(forecast.days.map((d) => [d.date, d]));
  const selectedDay = byDate.get(selected) ?? placeholder(selected);
  const start = addDays(first, -weekday(first)),
    end = addDays(last, 6 - weekday(last));
  const cells = datesBetween(start, end),
    monthIndex = forecast.months.indexOf(month);
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
  const notices = (["schedule", "fan"] as const)
    .flatMap((key) =>
      (["unpublished", "unconfirmed", "failed"] as const).map((state) => {
        const matches = dates.filter(
          (date) =>
            (byDate.get(date)?.[key] ?? "unconfirmed") === state &&
            byDate.get(date)?.level !== "closed",
        );
        return matches.length
          ? {
              key: `${key}-${state}`,
              label: `${key === "schedule" ? "スケジュール" : "ファンスタスケジュール"}${state === "unpublished" ? "未公開" : state === "failed" ? "取得遅延" : "公開状況確認中"}`,
              dates: formatDateRanges(matches),
            }
          : null;
      }),
    )
    .filter(Boolean);
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
      {notices.length > 0 && (
        <section className={styles.notice} aria-labelledby="publication-title">
          <CircleAlert size={24} aria-hidden="true" />
          <div>
            <h2 id="publication-title">スケジュール公開状況</h2>
            {notices.map(
              (n) =>
                n && (
                  <p key={n.key}>
                    <strong>{n.label}：</strong>
                    {n.dates}
                  </p>
                ),
            )}
            {dates.some((date) => byDate.get(date)?.provisional) && (
              <p>未公開・未確認の予定は反映しない基本予想を表示しています。</p>
            )}
          </div>
        </section>
      )}
      <div className={styles.layout}>
        <section className={styles.calendar} aria-label="月別の混雑予想">
          <div className={styles.calendarTop}>
            <div className={styles.monthHeading}>
              <h2 aria-live="polite">
                {month.slice(0, 4)}年 {Number(month.slice(5, 7))}月
              </h2>
              <div>
                <button
                  disabled={monthIndex === 0}
                  onClick={() => changeMonth(monthIndex - 1)}
                  aria-label="前の月"
                >
                  <ChevronLeft size={22} />
                </button>
                <button
                  disabled={monthIndex === forecast.months.length - 1}
                  onClick={() => changeMonth(monthIndex + 1)}
                  aria-label="次の月"
                >
                  <ChevronRight size={22} />
                </button>
              </div>
            </div>
            <ul className={styles.legend} aria-label="混雑度の凡例">
              {[...LEVELS, "closed" as const].map((level) => (
                <li key={level}>
                  <span className={`${styles.swatch} ${styles[level]}`} />
                  {LEVEL_LABELS[level]}
                </li>
              ))}
            </ul>
          </div>
          <div className={styles.weekdays}>
            {["日", "月", "火", "水", "木", "金", "土"].map((day, i) => (
              <span
                key={day}
                className={
                  i === 0 ? styles.sunday : i === 6 ? styles.saturday : ""
                }
              >
                {day}
              </span>
            ))}
          </div>
          <div className={styles.grid}>
            {cells.map((date) => {
              if (date.slice(0, 7) !== month)
                return (
                  <div key={date} className={styles.blank} aria-hidden="true" />
                );
              const day = byDate.get(date) ?? placeholder(date);
              const holiday = forecast.holidays?.[date];
              const dateColor =
                holiday || weekday(date) === 0
                  ? styles.holidayDate
                  : weekday(date) === 6
                    ? styles.saturdayDate
                    : undefined;
              return (
                <button
                  key={date}
                  type="button"
                  className={`${styles.day} ${styles[day.level]} ${date === selected ? styles.selected : ""} ${date === forecast.today ? styles.today : ""}`}
                  aria-label={`${fullDate(date)}${holiday ? `（${holiday}）` : ""}、${LEVEL_LABELS[day.level]}${day.weather ? `、${day.weather.text}` : ""}`}
                  aria-pressed={date === selected}
                  onClick={(e) => choose(date, e.currentTarget)}
                >
                  <span className={styles.cellTop}>
                    <b className={dateColor} title={holiday}>
                      {Number(date.slice(8, 10))}
                    </b>
                    {day.weather ? (
                      <WeatherIcon weather={day.weather} size={20} />
                    ) : (
                      <span
                        className={styles.noWeather}
                        aria-label="天気予報対象外"
                      >
                        —
                      </span>
                    )}
                  </span>
                  {date === forecast.today && (
                    <span className={styles.todayLabel}>今日</span>
                  )}
                  <span className={styles.cellTopics}>
                    {topicsFor(day).map((topic) => (
                      <TopicLabel
                        key={topic.key}
                        text={topic.text}
                        night={topic.night}
                        compact
                      />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
          <div className={styles.calendarFoot}>
            <p>
              — 天気予報対象外　・　白色は予想準備中
              <br className={styles.mobileBreak} />
              日付を選ぶと、その日の詳細を確認できます。
            </p>
            <p className={styles.lastUpdated}>
              最終更新 {formatForecastTime(forecast.updatedAt)}
            </p>
          </div>
        </section>
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
