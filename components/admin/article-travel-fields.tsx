"use client";
import type { ArticleTravel } from "@/lib/travel/spots";
export function ArticleTravelFields({ value, onChange }: { value: ArticleTravel; onChange: (value: ArticleTravel) => void }) {
  return (
    <section className="mt-6 rounded-xl border border-pink/15 bg-white p-4">
      <h2 className="text-sm font-black text-ink">周辺ホテルへの案内</h2>
      <label className="mt-3 flex min-h-11 items-center gap-2 text-xs font-bold text-ink">
        <input type="checkbox" checked={value.showHotelGuide === true} onChange={e => onChange({ ...value, showHotelGuide: e.target.checked })} />
        記事末尾に「周辺ホテルを探す」の案内を表示する
      </label>
    </section>
  );
}
