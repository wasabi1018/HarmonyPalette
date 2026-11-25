import Link from "next/link";
import { ArrowRight, Hotel } from "lucide-react";
export function HotelGuideCta({
  source,
  compact = false,
}: {
  source: "home" | "crowd" | "plan" | "article";
  compact?: boolean;
}) {
  return (
    <aside
      aria-label="周辺ホテルのご案内"
      className={`mx-auto max-w-[1160px] px-4 ${compact ? "py-4" : "py-7"}`}
    >
      <Link
        href="/hotels"
        data-hotel-source={source}
        className="flex items-center gap-3 rounded-2xl border border-pink/20 bg-gradient-to-r from-[#fff0f5] to-[#fffaf0] p-4 sm:gap-4 sm:p-5"
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-[#b43e68]">
          <Hotel size={23} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <strong className="block text-sm font-black text-ink sm:text-base">
            {source === "plan"
              ? "来園日の宿泊先も探してみませんか？"
              : "ハーモニーランド旅行の、泊まる場所も。"}
          </strong>
          <span className="mt-1 block text-xs leading-5 text-ink/70">
            パークまでの移動時間や、子連れの過ごしやすさで比較。
          </span>
        </span>
        <span className="hidden text-xs font-bold text-[#a33760] sm:inline">
          周辺ホテルを探す
        </span>
        <ArrowRight
          size={19}
          className="shrink-0 text-[#a33760]"
          aria-hidden="true"
        />
      </Link>
    </aside>
  );
}
