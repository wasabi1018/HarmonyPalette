"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { BookOpen, ChevronDown, ChevronRight, X } from "lucide-react";
import { PARK_GUIDE_NOTE, type ParkGuide, type ParkGuideCatalog } from "@/lib/park-guides";

export function ParkGuideContents({ guides }: { guides: readonly ParkGuide[] }) {
  return (
    <div className="space-y-3">
      {guides.map((guide) => (
        <details key={guide.id} data-guide-id={guide.id} className="group overflow-hidden rounded-2xl border border-pink/15 bg-white open:border-pink/35">
          <summary className="cursor-pointer list-none rounded-2xl p-4 outline-none transition-colors hover:bg-pink/[0.03] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pink sm:p-5 [&::-webkit-details-marker]:hidden">
            <h3 className="flex min-h-11 items-center gap-3">
              <span className="min-w-0 flex-1">
                <span className="block break-words text-[15px] font-black leading-6 text-ink [overflow-wrap:anywhere] sm:text-[16px]">{guide.title}</span>
                <span className="mt-1 block break-words text-[12px] font-medium leading-5 text-ink/60 [overflow-wrap:anywhere]">{guide.summary}</span>
              </span>
              <ChevronDown size={19} className="shrink-0 text-pink transition-transform motion-reduce:transition-none group-open:rotate-180" aria-hidden="true" />
            </h3>
          </summary>
          <div className="space-y-6 border-t border-pink/10 px-4 py-5 sm:px-5 sm:py-6">
            {guide.contentHtml && <div className="article-prose [&_h2]:text-[17px] [&_h3]:text-[15px] [&_p]:text-[13px] [&_li]:text-[13px]" dangerouslySetInnerHTML={{ __html: guide.contentHtml }} />}
            {guide.sections?.map((section) => (
              <section key={section.title}>
                <h4 className="text-[14px] font-black leading-6 text-ink">{section.title}</h4>
                <div className="mt-2 space-y-3 break-words text-[13px] leading-7 text-ink/75">
                  {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  {section.items && (
                    <ul className="list-disc space-y-2 pl-5 marker:text-pink">
                      {section.items.map((item) => <li key={item} className="pl-0.5">{item}</li>)}
                    </ul>
                  )}
                </div>
              </section>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}

export function ParkGuideCatalogContents({ data }: { data: ParkGuideCatalog }) {
  if (data.preparing) return <p className="rounded-2xl border border-pink/15 bg-white px-4 py-12 text-center font-bold text-ink/65">準備中</p>;
  if (!data.groups.length) return <p className="rounded-2xl border border-pink/15 bg-white px-4 py-10 text-center text-[13px] leading-7 text-ink/65">公開中の攻略ガイドはまだありません。</p>;
  return <div className="space-y-5">{data.groups.map((group) => <section key={group.id} aria-label={group.name}><p className="mb-2 px-1 text-[12px] font-black text-ink/60">{group.name}</p><ParkGuideContents guides={group.guides} /></section>)}</div>;
}

export function ParkGuideDialog({ onClose, previewData }: { onClose: () => void; previewData?: ParkGuideCatalog }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [data, setData] = useState<ParkGuideCatalog | null>(previewData ?? null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (previewData) return;
    const controller = new AbortController();
    setData(null);
    setError("");
    void fetch("/api/guides", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const result = await response.json() as { data?: ParkGuideCatalog; error?: string };
        if (!response.ok || !result.data) throw new Error(result.error || "攻略ガイドを読み込めませんでした。");
        if (!controller.signal.aborted) setData(result.data);
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "攻略ガイドを読み込めませんでした。");
      });
    return () => controller.abort();
  }, [previewData, retry]);

  function closeDialog() {
    dialogRef.current?.close();
    onClose();
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousOverflow = document.body.style.overflow;
    const previousPadding = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${parseFloat(getComputedStyle(document.body).paddingRight) + scrollbarWidth}px`;
    }
    document.body.style.overflow = "hidden";
    dialog.showModal();
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPadding;
    };
  }, []);

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onClose={(event) => {
        // A development Strict Mode cleanup may queue a close event before reopening.
        if (!event.currentTarget.open) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
          'button:not([disabled]), summary, a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        )).filter((element) => element.getClientRects().length > 0);
        const first = controls[0];
        const last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first && last) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last && first) {
          event.preventDefault();
          first.focus();
        }
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDialog();
      }}
      className="fixed inset-x-0 bottom-0 top-auto m-0 w-full max-w-none overflow-hidden rounded-t-[26px] border-0 bg-[#fffafd] p-0 text-ink shadow-2xl backdrop:bg-[#342637]/50 backdrop:backdrop-blur-sm sm:inset-0 sm:m-auto sm:w-[calc(100%_-_3rem)] sm:max-w-[820px] sm:rounded-[26px]"
    >
      <div className="flex max-h-[calc(100dvh_-_1rem)] flex-col sm:max-h-[min(820px,calc(100dvh_-_4rem))]">
        <header className="flex shrink-0 items-center gap-3 border-b border-pink/10 bg-white px-4 py-4 sm:px-6">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-pink/10 text-pink"><BookOpen size={22} aria-hidden="true" /></span>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-[20px] font-black text-ink">攻略ガイド</h2>
            <p id={descriptionId} className="mt-1 text-[12px] leading-5 text-ink/60">タイトルを選ぶと内容が開きます。複数のガイドを開いて読めます。</p>
          </div>
          <button ref={closeRef} type="button" onClick={closeDialog} aria-label="攻略ガイドを閉じる" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-pink/5 text-pink transition-colors hover:bg-pink/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink"><X size={21} aria-hidden="true" /></button>
        </header>
        <div className="min-h-0 overflow-y-auto overscroll-contain px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pt-5">
          {previewData || data ? <ParkGuideCatalogContents data={previewData ?? data!} /> : error ? <div role="alert" className="rounded-2xl bg-white p-5 text-[13px] leading-7 text-ink/70"><p>{error}</p><button type="button" onClick={() => setRetry((value) => value + 1)} className="mt-3 min-h-11 rounded-xl border border-pink/20 px-4 font-bold text-pink">もう一度読み込む</button></div> : <p role="status" className="py-12 text-center text-[13px] text-ink/60">ガイドを読み込んでいます…</p>}
          <p className="mt-5 text-[11px] leading-6 text-ink/60">{PARK_GUIDE_NOTE}</p>
        </div>
      </div>
    </dialog>,
    document.body,
  );
}

export function ParkGuideButton({ className = "", previewData, label = "攻略ガイド" }: { className?: string; previewData?: ParkGuideCatalog; label?: string }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function close() {
    setOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className={`flex min-h-14 w-full items-center gap-3 rounded-2xl border border-pink/20 bg-white px-4 py-3 text-left shadow-soft transition-colors hover:border-pink/40 hover:bg-[#fff7fa] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink focus-visible:ring-offset-2 ${className}`}
      >
        <BookOpen size={21} className="shrink-0 text-pink" aria-hidden="true" />
        <span className="min-w-0 flex-1 text-[14px] font-black text-ink">{label}</span>
        <span className="hidden text-[11px] font-medium text-ink/60 sm:inline">整理券・待ち時間・園内の回り方</span>
        <ChevronRight size={18} className="shrink-0 text-pink" aria-hidden="true" />
      </button>
      {open && <ParkGuideDialog onClose={close} previewData={previewData} />}
    </>
  );
}

export function ParkGuidePageLink({ className = "" }: { className?: string }) {
  return <Link href="/guides" className={`flex min-h-14 w-full items-center gap-3 rounded-2xl border border-pink/20 bg-white px-4 py-3 text-left shadow-soft transition-colors hover:border-pink/40 hover:bg-[#fff7fa] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink focus-visible:ring-offset-2 ${className}`}>
    <BookOpen size={21} className="shrink-0 text-pink" aria-hidden="true" />
    <span className="min-w-0 flex-1 text-[14px] font-black text-ink">攻略ガイド</span>
    <span className="hidden text-[11px] font-medium text-ink/60 sm:inline">整理券・待ち時間・園内の回り方</span>
    <ChevronRight size={18} className="shrink-0 text-pink" aria-hidden="true" />
  </Link>;
}
