import { Info } from "lucide-react";

export function OfficialNotice() {
  return <aside className="flex gap-3 rounded-2xl border border-[#f2d5df] bg-[#fff9fb] p-4 text-xs leading-6 text-ink/65" aria-label="非公式サイトについて">
    <Info size={18} className="mt-0.5 shrink-0 text-pink" aria-hidden="true" />
    <p><strong className="text-ink">Harmony Paletteは非公式ファンサイトです。</strong> 株式会社サンリオおよびハーモニーランドとは関係ありません。掲載内容には独自に整理・編集した情報を含みます。最新かつ正確な情報は、必ず公式サイトをご確認ください。</p>
  </aside>;
}
