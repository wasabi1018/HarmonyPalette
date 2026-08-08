import type { Metadata } from "next";
import { DailyPlanBuilder } from "@/components/daily-plan-builder";
import type { PlanOptions } from "@/lib/plan-options";
import { getInitialScheduleData } from "@/lib/supabase/initial-data";
import { getPublicPlanOptions } from "@/lib/supabase/plan-options-repository";

export const metadata: Metadata = {
  title: "マイプラン",
  description: "公式スケジュールと自由予定を組み合わせて、自分だけの一日プランを作成できます。",
  robots: { index: false, follow: false },
};

function todayInJapan() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
}

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string | string[] }>;
}) {
  const params = await searchParams;
  const candidate = Array.isArray(params.date) ? params.date[0] : params.date;
  const initialDate = candidate && /^\d{4}-\d{2}-\d{2}$/.test(candidate)
    ? candidate
    : todayInJapan();

  const [initialScheduleData, planOptionsResult] = await Promise.all([
    getInitialScheduleData(),
    getPublicPlanOptions()
      .then((options) => ({ options, error: "" }))
      .catch(() => ({ options: null, error: "登録候補を読み込めませんでした。自由入力は利用できます。" })),
  ]);
  const initialPlanOptions: PlanOptions = planOptionsResult.options ?? {
    attractions: [],
    facilities: [],
  };

  return (
    <DailyPlanBuilder
      initialDate={initialDate}
      initialScheduleData={initialScheduleData}
      initialPlanOptions={initialPlanOptions}
      initialPlanOptionsError={planOptionsResult.error}
    />
  );
}
