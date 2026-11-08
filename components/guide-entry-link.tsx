import Link from "next/link";
import { BookOpen, ChevronRight } from "lucide-react";

export function GuideEntryLink({ className = "" }: { className?: string }) {
  return <Link href="/guides" className={`flex min-h-12 items-center gap-3 rounded-xl border border-lavender/30 bg-white px-4 py-3 text-[14px] font-black text-ink shadow-soft transition-colors hover:border-pink/50 hover:text-pink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink ${className}`}>
    <BookOpen size={21} className="shrink-0 text-lavender" aria-hidden="true" />
    <span>攻略ガイド</span><ChevronRight size={19} className="ml-auto shrink-0 text-lavender" aria-hidden="true" />
  </Link>;
}
