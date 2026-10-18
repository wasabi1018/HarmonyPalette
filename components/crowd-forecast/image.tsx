import Image from "next/image";
import type { PublicForecast } from "@/lib/crowd-forecast/types";
import { ForecastMonthCalendar, ForecastPublicationNotice } from "./month";
import styles from "./forecast.module.css";

export const FORECAST_IMAGE_WIDTH = 1080;
export const FORECAST_IMAGE_HEIGHT = 1350;

export function CrowdForecastImage({ forecast, month }: { forecast: PublicForecast; month: string }) {
  return <article className={styles.imageCard} aria-label={`${month}の混雑予想画像`}>
    <header className={styles.imageHeading}>
      <Image src="/logo-compact.png" alt="Harmony Palette" width={300} height={80} unoptimized />
      <div><p>HARMONYLAND</p><h1>混雑予想</h1></div>
    </header>
    <ForecastPublicationNotice forecast={forecast} month={month} image />
    {forecast.delayed && <p className={styles.imageDelay}>更新に遅れが生じています</p>}
    <ForecastMonthCalendar forecast={forecast} month={month} image />
    <footer className={styles.imageFooter}>
      <p>混雑予想は目安です。最新情報はWebの混雑予想をご確認ください。</p>
      <p>天気の出典：気象庁（大分県中部）　翌日以降の予想を毎日19時ごろに更新</p>
      <span>Harmony Palette ｜ ハーモニーランドの非公式ファンサイト</span>
    </footer>
  </article>;
}
