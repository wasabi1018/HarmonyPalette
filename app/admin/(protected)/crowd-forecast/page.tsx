import type { Metadata } from "next";
import { CrowdForecastSettings } from "@/components/admin/crowd-forecast-settings";
export const metadata: Metadata = { title: "混雑予想の設定" };
export default function CrowdForecastSettingsPage() {
  return (
    <div className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8">
      <p className="mb-2 text-xs font-bold text-pink">混雑予想</p>
      <h1 className="text-2xl font-black text-ink">混雑予想の設定</h1>
      <p className="mb-6 mt-2 text-sm leading-7 text-ink/60">
        加点や天気の補正を調整し、公開前に予想を確認できます。点数と内部メモは公開されません。
      </p>
      <CrowdForecastSettings />
    </div>
  );
}
