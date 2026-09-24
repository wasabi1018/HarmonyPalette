import type { Metadata } from "next";
import { HomeTodaySections } from "@/components/home-today-sections";
import {
  getInitialCharacterData,
  getInitialParkOperatingDayData,
  getInitialScheduleData,
} from "@/lib/supabase/initial-data";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "予定検索",
  description: "日付を選んで、ハーモニーランドのイベントとファンスタジオの予定を時間順に確認できます。",
  alternates: { canonical: "/daily-schedule" },
};

function validDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
    ? value
    : undefined;
}

export default async function DailySchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const [initialScheduleData, initialCharacterData, initialOperatingDayData] = await Promise.all([
    getInitialScheduleData(),
    getInitialCharacterData(),
    getInitialParkOperatingDayData(),
  ]);

  return (
    <>
      <h1 className="sr-only">日ごとの予定検索</h1>
      <HomeTodaySections
        mode="search"
        initialDate={validDate(date)}
        initialScheduleData={initialScheduleData}
        initialCharacterData={initialCharacterData}
        initialOperatingDayData={initialOperatingDayData}
      />
    </>
  );
}
