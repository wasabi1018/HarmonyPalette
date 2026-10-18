import type { ReactNode } from "react";
import { CakeSlice, CircleAlert, Moon } from "lucide-react";
import { weekday } from "@/lib/crowd-forecast/date";
import { forecastMonth, fullDate, placeholderDay, topicsFor } from "@/lib/crowd-forecast/presentation";
import { LEVELS, LEVEL_LABELS, type PublicForecast } from "@/lib/crowd-forecast/types";
import { WeatherIcon, formatForecastTime } from "./weather";
import styles from "./forecast.module.css";

export function TopicLabel({ text, night = false, compact = false }: {
  text: string; night?: boolean; compact?: boolean;
}) {
  const label = text.replace(/のお誕生日$/, "誕生日");
  const Icon = night ? Moon : label.endsWith("誕生日") ? CakeSlice : null;
  const units = Math.max(1, Array.from(label).length + (Icon ? 1.4 : 0));
  return <span className={styles.topicLine} title={label} data-forecast-topic={compact ? "" : undefined}
    style={compact ? { fontSize: `min(1em, ${96 / units}cqi)` } : undefined}>
    {Icon && <Icon size={13} aria-hidden="true" />}<span>{label}</span>
  </span>;
}

export function ForecastPublicationNotice({ forecast, month, image = false }: {
  forecast: PublicForecast; month: string; image?: boolean;
}) {
  const { notices, provisional } = forecastMonth(forecast, month);
  if (!notices.length) return null;
  return <section className={`${styles.notice} ${image ? styles.imageNotice : ""}`} aria-label="スケジュール公開状況">
    <CircleAlert size={24} aria-hidden="true" />
    <div><h2>スケジュール公開状況</h2>
      {notices.map((notice) => <p key={notice.key}><strong>{notice.label}：</strong>{notice.dates}</p>)}
      {provisional && <p>未公開・未確認の予定は反映しない基本予想を表示しています。</p>}
    </div>
  </section>;
}

export function ForecastMonthCalendar({ forecast, month, selected, onSelect, controls, image = false }: {
  forecast: PublicForecast; month: string; selected?: string;
  onSelect?: (date: string, button: HTMLButtonElement) => void;
  controls?: ReactNode; image?: boolean;
}) {
  const { cells, byDate, weekCount } = forecastMonth(forecast, month);
  return <section className={`${styles.calendar} ${image ? styles.imageCalendar : ""}`} aria-label="月別の混雑予想">
    <div className={styles.calendarTop}>
      <div className={styles.monthHeading}>
        <h2 aria-live={image ? undefined : "polite"}>{month.slice(0, 4)}年 {Number(month.slice(5, 7))}月</h2>
        {controls}
      </div>
      <ul className={styles.legend} aria-label="混雑度の凡例">
        {[...LEVELS, "closed" as const].map((level) => <li key={level}>
          <span className={`${styles.swatch} ${styles[level]}`} />{LEVEL_LABELS[level]}
        </li>)}
      </ul>
    </div>
    <div className={styles.weekdays}>{["日", "月", "火", "水", "木", "金", "土"].map((day, i) =>
      <span key={day} className={i === 0 ? styles.sunday : i === 6 ? styles.saturday : ""}>{day}</span>,
    )}</div>
    <div className={styles.grid} style={image ? { gridTemplateRows: `repeat(${weekCount}, minmax(0, 1fr))` } : undefined}>
      {cells.map((date) => {
        if (date.slice(0, 7) !== month) return <div key={date} className={styles.blank} aria-hidden="true" />;
        const day = byDate.get(date) ?? placeholderDay(date);
        const holiday = forecast.holidays?.[date];
        const dateColor = holiday || weekday(date) === 0 ? styles.holidayDate : weekday(date) === 6 ? styles.saturdayDate : undefined;
        const className = `${styles.day} ${styles[day.level]} ${date === selected ? styles.selected : ""} ${date === forecast.today ? styles.today : ""}`;
        const label = `${fullDate(date)}${holiday ? `（${holiday}）` : ""}、${LEVEL_LABELS[day.level]}${day.weather ? `、${day.weather.text}` : ""}`;
        const content = <><span className={styles.cellTop}>
          <b className={dateColor} title={holiday}>{Number(date.slice(8, 10))}</b>
          {day.weather ? <WeatherIcon weather={day.weather} size={20} /> : <span className={styles.noWeather} aria-label="天気予報対象外">—</span>}
        </span>
          {date === forecast.today && <span className={styles.todayLabel}>今日</span>}
          <span className={styles.cellTopics}>{topicsFor(day).map((topic) =>
            <TopicLabel key={topic.key} text={topic.text} night={topic.night} compact />,
          )}</span></>;
        return onSelect ? <button key={date} type="button" className={className} aria-label={label}
          aria-pressed={date === selected} onClick={(event) => onSelect(date, event.currentTarget)}>{content}</button>
          : <div key={date} className={className} aria-label={label} data-forecast-date={date}>{content}</div>;
      })}
    </div>
    <div className={styles.calendarFoot}><p>— 天気予報対象外　・　白色は予想準備中
      {!image && <><br className={styles.mobileBreak} />日付を選ぶと、その日の詳細を確認できます。</>}
    </p><p className={styles.lastUpdated}>最終更新 {formatForecastTime(forecast.updatedAt)}</p></div>
  </section>;
}
