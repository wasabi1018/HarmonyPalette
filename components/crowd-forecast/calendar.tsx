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
    <div id="crowd-forecast" className={styles.page}>
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
        <p>
          当サイトの混雑予想は、次の情報を独自の基準で組み合わせています。
        </p>
        <ul className={styles.aboutList}>
          <li>
            <strong>曜日・祝日</strong>
            <p>通常の平日、土日祝の前後にあたる平日、土曜日、日曜日、祝日を分けて予想します。祝日は内閣府の公表データを使用します。</p>
          </li>
          <li>
            <strong>連休</strong>
            <p>土日祝が3日以上続く期間は、連休の日数を考慮します。初日・最終日は、中日より補正を小さくしています。</p>
          </li>
          <li>
            <strong>学校休暇など</strong>
            <p>登録した学校休暇などの期間を反映します。期間が重なる場合や連休と重なる場合は、補正が過大にならないよう調整します。</p>
          </li>
          <li>
            <strong>営業時間</strong>
            <p>営業時間が長い日ほど、混雑寄りに調整します。営業時間を来園需要の手がかりとして扱う、当サイト独自の判断です。</p>
          </li>
          <li>
            <strong>ファンスタジオの開催予定</strong>
            <p>公開済みの開催枠数を基準と比較します。同じ部屋・同じ開始時刻は1枠と数え、営業時間による補正とは大きい方だけを採用します。</p>
          </li>
          <li>
            <strong>イベントの節目</strong>
            <p>登録したイベントの開始日・終了日、最初と最後の土日を考慮します。開催期間中という理由だけでは、一律に加算しません。条件が重なる場合は、大きい補正を採用します。</p>
          </li>
          <li>
            <strong>キャラクターの誕生日</strong>
            <p>キャラクターごとに設定した影響度を反映します。同日に複数の誕生日が重なる場合は、大きい補正だけを採用します。誕生日の表示があっても、混雑度への加算がない場合があります。</p>
          </li>
          <li>
            <strong>天気予報</strong>
            <p>気象庁の予報文をもとに、雨などによる影響を考慮します。計算日から2日先までは通常の補正、3〜6日先は補正を半分にし、7日先以降は反映しません。気温・降水確率を直接点数化することはありません。</p>
          </li>
          <li>
            <strong>個別の事情</strong>
            <p>特定の日に調整を行う場合は、その理由を掲載します。混雑区分を直接指定する場合もありますが、確認済みの休園情報を最優先します。</p>
          </li>
          <li>
            <strong>未公開・未確認の情報</strong>
            <p>予定が未公開の場合は、確認できた情報による「基本予想」を表示します。未公開を「開催なし」と判断しているわけではありません。営業状況が確認できない日は「予想準備中」とします。</p>
          </li>
          <li>
            <strong>更新と過去日の表示</strong>
            <p>予想は毎日19時ごろに更新します。過ぎた日は、当時公開した予想を表示します。</p>
          </li>
          <li>
            <strong>予想の性質</strong>
            <p>園内全体の混み具合を5段階で示す目安です。実際の入園者数や個別施設の待ち時間を示すものではありません。各要因の重み付けは独自設定で、実際の混雑との照合による予測精度は未検証です。</p>
          </li>
        </ul>
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
