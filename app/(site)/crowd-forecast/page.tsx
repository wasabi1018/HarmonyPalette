import type { Metadata } from "next";
import { CrowdForecastCalendar } from "@/components/crowd-forecast/calendar";
import { SiteEventTracker } from "@/components/site-event-tracker";
import { readPublicForecast } from "@/lib/crowd-forecast/repository";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "混雑予想",
  description:
    "ハーモニーランドの混雑予想をカレンダーで確認。営業時間やグリーティングの予定、天気予報を参考に来園日を選べます。",
  alternates: { canonical: "/crowd-forecast" },
};
export default async function CrowdForecastPage() {
  const forecast = await readPublicForecast();
  return (
    <>
      <SiteEventTracker eventName="crowd_forecast_view" sessionKey="crowd-forecast-view" />
      <CrowdForecastCalendar forecast={forecast} />
    </>
  );
}
