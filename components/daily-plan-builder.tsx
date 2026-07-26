"use client";

import {
  DndContext,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { toBlob } from "html-to-image";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  ImageDown,
  ListPlus,
  LoaderCircle,
  LockKeyhole,
  MapPin,
  Plus,
  Share2,
  Sparkles,
  Trash2,
  TriangleAlert,
  Utensils,
  Footprints,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { PlanItemCard } from "@/components/plan-item-card";
import {
  addCustomPlanItem,
  addScheduleToPlan,
  clearPlan,
  type CustomPlanItemInput,
  type DailyPlanItem,
  isScheduleInPlan,
  minutesToTime,
  removePlanItem,
  removeScheduleFromPlan,
  shiftCustomPlanItem,
  timeToMinutes,
  updateCustomPlanItem,
  useDailyPlans,
} from "@/lib/daily-plan-store";
import { getEntryCharacterNames, useScheduleEntries } from "@/lib/schedule-store";

const DRAG_MINUTES_PER_PIXEL = 0.5;
const DEFAULT_CUSTOM_FORM: CustomPlanItemInput = {
  title: "",
  startTime: "12:00",
  endTime: "12:45",
  location: "",
  note: "",
};

function todayInJapan() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function formatDate(date: string, withYear = true) {
  return new Intl.DateTimeFormat("ja-JP", {
    ...(withYear ? { year: "numeric" as const } : {}),
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(`${date}T00:00:00`));
}

function snapMinutes(value: number) {
  return Math.round(value / 5) * 5;
}

function overlappingIds(items: DailyPlanItem[]) {
  const ids = new Set<string>();
  const sorted = [...items].sort((left, right) => left.startTime.localeCompare(right.startTime));
  for (let leftIndex = 0; leftIndex < sorted.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < sorted.length; rightIndex += 1) {
      const left = sorted[leftIndex];
      const right = sorted[rightIndex];
      if (timeToMinutes(right.startTime) >= timeToMinutes(left.endTime)) break;
      ids.add(left.id);
      ids.add(right.id);
    }
  }
  return ids;
}

function nextSuggestedForm(items: DailyPlanItem[]): CustomPlanItemInput {
  const latestEnd = items
    .map((item) => timeToMinutes(item.endTime))
    .sort((left, right) => right - left)[0] ?? (12 * 60);
  const start = Math.min(latestEnd + (items.length > 0 ? 10 : 0), (22 * 60));
  return {
    ...DEFAULT_CUSTOM_FORM,
    startTime: minutesToTime(start),
    endTime: minutesToTime(Math.min(start + 45, (23 * 60) + 59)),
  };
}

const EXPORT_ASSET_WAIT_MS = 2000;
const EXPORT_RENDER_WAIT_MS = 20000;

function waitForImage(image: HTMLImageElement) {
  if (image.complete) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const timer = window.setTimeout(finish, EXPORT_ASSET_WAIT_MS);
    function finish() {
      image.removeEventListener("load", finish);
      image.removeEventListener("error", finish);
      window.clearTimeout(timer);
      resolve();
    }
    image.addEventListener("load", finish, { once: true });
    image.addEventListener("error", finish, { once: true });
  });
}

function waitAtMost<T>(promise: PromiseLike<T>, timeoutMs: number, message: string) {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), timeoutMs);
    Promise.resolve(promise).then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function PrintablePlan({ date, items }: { date: string; items: DailyPlanItem[] }) {
  const overlaps = overlappingIds(items);

  return (
    <div className="w-[720px] bg-[#fff8fb] p-10 text-ink">
      <div className="rounded-[32px] border border-pink/15 bg-white p-8 shadow-card">
        <div className="flex items-center justify-between gap-6 border-b border-pink/10 pb-6">
          <div>
            <p className="text-[13px] font-black tracking-[0.18em] text-pink">HARMONY PALETTE</p>
            <h1 className="mt-2 text-[34px] font-black leading-tight">わたしのマイプラン</h1>
            <p className="mt-2 text-[18px] font-bold text-ink/55">{formatDate(date)}</p>
          </div>
          <Image src="/logo.png" alt="" width={135} height={90} loading="eager" unoptimized className="h-[90px] w-[135px] rounded-2xl object-cover" />
        </div>

        <div className="mt-6 grid gap-2.5">
          {items.length > 0 ? items.map((item) => (
            <div key={item.id} className={`rounded-[18px] border border-l-[5px] bg-white px-4 py-3.5 ${item.kind === "official" ? "border-pink/15 border-l-pink/45" : "border-mint/25 border-l-mint"}`}>
              <div className="flex items-start gap-4">
                <div className="w-[72px] shrink-0 pt-0.5">
                  <p className="flex items-center gap-1.5 text-[17px] font-black tabular-nums leading-5">
                    {item.startTime}
                    {item.timeLocked && <LockKeyhole size={12} className="text-pink" aria-hidden="true" />}
                  </p>
                  <p className="mt-1 text-[11px] font-bold tabular-nums leading-4 text-ink/35">〜{item.endTime}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-[18px] font-black leading-6">{item.title}</h2>
                  {(item.characterNames.length > 0 || item.location || overlaps.has(item.id)) && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-bold leading-4 text-ink/45">
                      {item.characterNames.length > 0 && (
                        <span className="inline-flex items-center gap-1.5 text-pink">
                          <Users size={12} aria-hidden="true" />
                          {item.characterNames.join("・")}
                        </span>
                      )}
                      {item.location && (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin size={12} className="text-lavender" aria-hidden="true" />
                          {item.location}
                        </span>
                      )}
                      {overlaps.has(item.id) && (
                        <span className="inline-flex items-center gap-1.5 font-black text-[#9a6512]">
                          <TriangleAlert size={12} aria-hidden="true" />
                          時間が重複
                        </span>
                      )}
                    </div>
                  )}
                  {item.note && <p className="mt-2 line-clamp-2 rounded-lg bg-[#fffafd] px-2.5 py-1.5 text-[11px] font-bold leading-4 text-ink/45">{item.note}</p>}
                </div>
              </div>
            </div>
          )) : (
            <p className="rounded-[22px] border border-dashed border-pink/20 px-5 py-12 text-center text-[15px] font-bold text-ink/45">まだ予定がありません。</p>
          )}
        </div>

        <p className="mt-7 border-t border-pink/10 pt-5 text-[11px] font-bold leading-5 text-ink/40">
          公式スケジュールは変更される場合があります。来園前に公式サイトの最新情報もご確認ください。
        </p>
      </div>
    </div>
  );
}

export function DailyPlanBuilder({ initialDate }: { initialDate: string }) {
  const today = useMemo(todayInJapan, []);
  const [selectedDate, setSelectedDate] = useState(/^\d{4}-\d{2}-\d{2}$/.test(initialDate) ? initialDate : today);
  const plans = useDailyPlans();
  const plan = plans[selectedDate];
  const items = useMemo(() => plan?.items ?? [], [plan]);
  const scheduleState = useScheduleEntries();
  const [addOpen, setAddOpen] = useState(false);
  const [addTab, setAddTab] = useState<"official" | "custom">("official");
  const [customForm, setCustomForm] = useState<CustomPlanItemInput>(DEFAULT_CUSTOM_FORM);
  const [editingItem, setEditingItem] = useState<DailyPlanItem | null>(null);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [dragDelta, setDragDelta] = useState(0);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFile, setExportFile] = useState<File | null>(null);
  const [exportPreviewUrl, setExportPreviewUrl] = useState("");
  const [exportStatus, setExportStatus] = useState<"idle" | "preparing" | "ready" | "error">("idle");
  const [exportAttempt, setExportAttempt] = useState(0);
  const printableRef = useRef<HTMLDivElement>(null);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );
  const overlaps = useMemo(() => overlappingIds(items), [items]);
  const planDates = useMemo(() => Array.from(new Set([selectedDate, ...Object.keys(plans)])).sort(), [plans, selectedDate]);
  const officialCandidates = useMemo(() => scheduleState.entries
    .filter((entry) => entry.date <= selectedDate && (entry.endDate ?? entry.date) >= selectedDate)
    .sort((left, right) => left.startTime.localeCompare(right.startTime)), [scheduleState.entries, selectedDate]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("date", selectedDate);
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, [selectedDate]);

  useEffect(() => {
    if (!exportOpen) return;
    let active = true;
    let previewUrl = "";
    setExportStatus("preparing");
    setExportFile(null);
    setExportPreviewUrl("");

    const prepare = async () => {
      try {
        if (document.fonts) {
          await Promise.race([
            document.fonts.ready,
            new Promise<void>((resolve) => window.setTimeout(resolve, EXPORT_ASSET_WAIT_MS)),
          ]);
        }
        const printable = printableRef.current;
        if (!printable) throw new Error("画像の準備に失敗しました。");
        await Promise.all(Array.from(printable.querySelectorAll("img")).map(waitForImage));
        await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
        const blob = await waitAtMost(
          toBlob(printable, {
            backgroundColor: "#fff8fb",
            width: printable.scrollWidth,
            height: printable.scrollHeight,
            pixelRatio: 1.5,
          }),
          EXPORT_RENDER_WAIT_MS,
          "画像の生成がタイムアウトしました。",
        );
        if (!blob) throw new Error("画像の準備に失敗しました。");
        const file = new File([blob], `harmony-palette-${selectedDate}.png`, { type: "image/png" });
        previewUrl = URL.createObjectURL(file);
        if (!active) {
          URL.revokeObjectURL(previewUrl);
          return;
        }
        setExportFile(file);
        setExportPreviewUrl(previewUrl);
        setExportStatus("ready");
      } catch {
        if (active) setExportStatus("error");
      }
    };
    void prepare();
    return () => {
      active = false;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [exportAttempt, exportOpen, items, selectedDate]);

  const changeDate = (date: string) => {
    setSelectedDate(date);
    setNotice("");
  };

  const openEdit = (item: DailyPlanItem) => {
    setEditingItem(item);
    setCustomForm({
      title: item.title,
      startTime: item.startTime,
      endTime: item.endTime,
      location: item.location,
      note: item.note,
    });
    setFormError("");
    setAddTab("custom");
    setAddOpen(true);
  };

  const closeAdd = () => {
    setAddOpen(false);
    setEditingItem(null);
    setFormError("");
  };

  const saveCustom = () => {
    try {
      if (editingItem) {
        updateCustomPlanItem(selectedDate, editingItem.id, customForm);
        setNotice("自由予定を更新しました。");
      } else {
        addCustomPlanItem(selectedDate, customForm);
        setNotice(`${formatDate(selectedDate, false)}のプランに追加しました。`);
      }
      closeAdd();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "予定を保存できませんでした。");
    }
  };

  const applyTemplate = (title: string, duration: number) => {
    const suggested = nextSuggestedForm(items);
    setCustomForm({
      ...suggested,
      title,
      endTime: minutesToTime(timeToMinutes(suggested.startTime) + duration),
    });
  };

  const toggleOfficialSchedule = (scheduleId: string) => {
    const entry = officialCandidates.find((candidate) => candidate.id === scheduleId);
    if (!entry) return;

    if (isScheduleInPlan(plans, entry.id, selectedDate)) {
      removeScheduleFromPlan(selectedDate, entry.id);
      setNotice(`${formatDate(selectedDate, false)}のプランから取り消しました。`);
      return;
    }

    addScheduleToPlan(entry, selectedDate);
    setNotice(`${formatDate(selectedDate, false)}のプランに追加しました。`);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
    setDragDelta(0);
  };

  const handleDragMove = (event: DragMoveEvent) => {
    setDragDelta(snapMinutes(event.delta.y * DRAG_MINUTES_PER_PIXEL));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const id = String(event.active.id);
    const deltaMinutes = snapMinutes(event.delta.y * DRAG_MINUTES_PER_PIXEL);
    if (deltaMinutes !== 0) {
      const updated = shiftCustomPlanItem(selectedDate, id, deltaMinutes);
      if (updated) setNotice(`${updated.startTime}開始に変更しました。`);
    }
    setActiveDragId(null);
    setDragDelta(0);
  };

  const activePreview = useMemo(() => {
    if (!activeDragId) return undefined;
    const item = items.find((candidate) => candidate.id === activeDragId);
    if (!item) return undefined;
    const duration = timeToMinutes(item.endTime) - timeToMinutes(item.startTime);
    const nextStart = Math.max(0, Math.min((24 * 60) - duration - 1, timeToMinutes(item.startTime) + dragDelta));
    return { startTime: minutesToTime(nextStart), endTime: minutesToTime(nextStart + duration) };
  }, [activeDragId, dragDelta, items]);

  const downloadImage = () => {
    if (!exportFile) return;
    const url = URL.createObjectURL(exportFile);
    const link = document.createElement("a");
    link.href = url;
    link.download = exportFile.name;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const shareImage = async () => {
    if (!exportFile) return;
    try {
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [exportFile] }))) {
        await navigator.share({
          title: `${formatDate(selectedDate)}のマイプラン`,
          text: "Harmony Paletteで作ったマイプランです。",
          files: [exportFile],
        });
        return;
      }
      downloadImage();
      setNotice("共有機能に対応していないため、画像を保存しました。");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setNotice("共有できませんでした。画像として保存してお試しください。");
    }
  };

  return (
    <>
      <div className="mx-auto max-w-[980px] px-4 pb-10 pt-5 sm:px-6 lg:px-8 lg:pt-8">
        <nav aria-label="パンくずリスト" className="mb-3 flex items-center gap-1 text-[11px] font-bold text-ink/40">
          <Link href="/" className="hover:text-pink">ホーム</Link>
          <ChevronRight size={12} aria-hidden="true" />
          <span aria-current="page">マイプラン</span>
        </nav>

        <section className="relative overflow-hidden rounded-[26px] border border-pink/10 bg-gradient-to-br from-[#fff0f5] via-white to-[#eefaf4] px-5 py-6 sm:px-8 sm:py-8">
          <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/65" aria-hidden="true" />
          <div className="relative">
            <p className="flex items-center gap-2 text-[11px] font-black tracking-[0.18em] text-pink"><Sparkles size={14} aria-hidden="true" />MY DAY PLAN</p>
            <h1 className="mt-2 font-display text-[28px] font-semibold leading-tight text-ink sm:text-[38px]">今日を、わたしらしく組み立てよう。</h1>
            <p className="mt-3 max-w-2xl text-[13px] font-bold leading-6 text-ink/60 sm:text-[14px]">公式予定と休憩・移動をひとつにまとめて、この端末だけに保存します。</p>
          </div>
        </section>

        <section className="mt-5 rounded-[24px] border border-pink/10 bg-white p-4 shadow-soft sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[13px] font-black text-ink/60">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-pink/10 text-pink"><CalendarDays size={17} aria-hidden="true" /></span>
              プランの日付
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => changeDate(addDays(selectedDate, -1))} aria-label="前日" className="grid h-10 w-10 place-items-center rounded-xl border border-ink/10 text-ink/60 hover:border-pink/30 hover:text-pink"><ChevronLeft size={17} aria-hidden="true" /></button>
              <input type="date" value={selectedDate} onChange={(event) => event.target.value && changeDate(event.target.value)} className="min-h-10 min-w-0 rounded-xl border border-ink/10 bg-[#fffafd] px-3 text-[12px] font-black text-ink outline-none focus:border-pink" aria-label="プランの日付" />
              <button type="button" onClick={() => changeDate(addDays(selectedDate, 1))} aria-label="翌日" className="grid h-10 w-10 place-items-center rounded-xl border border-ink/10 text-ink/60 hover:border-pink/30 hover:text-pink"><ChevronRight size={17} aria-hidden="true" /></button>
            </div>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {planDates.map((date) => (
              <button key={date} type="button" onClick={() => changeDate(date)} className={`min-h-9 shrink-0 rounded-full px-3 text-[11px] font-black ${selectedDate === date ? "bg-pink text-white" : "bg-pink/5 text-pink"}`}>
                {date === today ? "今日・" : ""}{formatDate(date, false)}{plans[date] ? `・${plans[date].items.length}件` : ""}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-black tracking-[0.16em] text-pink">YOUR TIMELINE</p>
              <h2 className="mt-1 font-display text-[23px] font-semibold text-ink">{formatDate(selectedDate, false)}のマイプラン</h2>
              <p className="mt-1 text-[11px] font-bold text-ink/45">
                {items.length}件の予定
                {overlaps.size > 0 ? "・時間の重複があります" : ""}
                {items.some((item) => !item.timeLocked) ? "・自由予定はハンドルを長押しして時刻変更" : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => { setAddTab("official"); setAddOpen(true); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-pink px-4 text-[12px] font-black text-white shadow-soft">
                <ListPlus size={16} aria-hidden="true" />
                予定を追加
              </button>
              <button type="button" onClick={() => setExportOpen(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-pink/20 bg-white px-4 text-[12px] font-black text-pink shadow-soft">
                <ImageDown size={16} aria-hidden="true" />
                画像・共有
              </button>
            </div>
          </div>

          {items.length > 0 ? (
            <DndContext
              sensors={sensors}
              modifiers={[restrictToVerticalAxis]}
              onDragStart={handleDragStart}
              onDragMove={handleDragMove}
              onDragEnd={handleDragEnd}
              onDragCancel={() => { setActiveDragId(null); setDragDelta(0); }}
            >
              <div className="relative grid gap-3 before:absolute before:bottom-7 before:left-[45px] before:top-7 before:w-px before:bg-pink/15 before:content-['']">
                {items.map((item) => (
                  <PlanItemCard
                    key={item.id}
                    item={item}
                    previewTime={activeDragId === item.id ? activePreview : undefined}
                    hasOverlap={overlaps.has(item.id)}
                    onEdit={() => openEdit(item)}
                    onRemove={() => {
                      removePlanItem(selectedDate, item.id);
                      setNotice("予定をマイプランから削除しました。");
                    }}
                  />
                ))}
              </div>
            </DndContext>
          ) : (
            <div className="rounded-[24px] border border-dashed border-pink/20 bg-white px-5 py-12 text-center shadow-soft">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-pink/10 text-pink"><CalendarDays size={25} aria-hidden="true" /></span>
              <h3 className="mt-4 text-[16px] font-black text-ink">この日のプランはまだ空です</h3>
              <p className="mx-auto mt-2 max-w-md text-[12px] font-bold leading-6 text-ink/50">公式スケジュールを選ぶか、お昼休憩などの自由予定を追加してみましょう。</p>
              <button type="button" onClick={() => { setAddTab("official"); setAddOpen(true); }} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-pink px-5 text-[12px] font-black text-white">
                <Plus size={16} aria-hidden="true" />
                最初の予定を追加
              </button>
            </div>
          )}

          {items.length > 0 && (
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={() => { if (window.confirm(`${formatDate(selectedDate, false)}のプランをすべて削除しますか？`)) clearPlan(selectedDate); }} className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-[11px] font-black text-ink/40 hover:bg-pink/5 hover:text-pink">
                <Trash2 size={14} aria-hidden="true" />
                この日のプランを空にする
              </button>
            </div>
          )}
        </section>
      </div>

      {notice && (
        <div className="fixed inset-x-4 bottom-24 z-[90] mx-auto flex max-w-md items-center gap-2 rounded-2xl bg-ink px-4 py-3 text-[12px] font-bold text-white shadow-[0_16px_44px_rgba(62,53,64,0.28)] lg:bottom-6" role="status" aria-live="polite">
          <Check size={16} className="shrink-0 text-mint" aria-hidden="true" />
          {notice}
        </div>
      )}

      {addOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center overflow-x-hidden bg-ink/35 p-0 sm:items-center sm:p-5" role="presentation">
          <div role="dialog" aria-modal="true" aria-labelledby="add-plan-title" className="max-h-[88dvh] w-full max-w-full overflow-hidden rounded-t-[28px] bg-white shadow-[0_24px_70px_rgba(62,53,64,0.25)] sm:max-w-2xl sm:rounded-[28px]">
            <div className="flex items-center justify-between border-b border-pink/10 px-4 py-4 sm:px-5">
              <div>
                <p className="text-[10px] font-black tracking-[0.14em] text-pink">{formatDate(selectedDate, false)}</p>
                <h2 id="add-plan-title" className="mt-0.5 text-[17px] font-black text-ink">{editingItem ? "自由予定を編集" : "マイプランに追加"}</h2>
              </div>
              <button type="button" onClick={closeAdd} className="grid h-10 w-10 place-items-center rounded-full bg-pink/5 text-pink" aria-label="閉じる"><X size={18} aria-hidden="true" /></button>
            </div>

            {!editingItem && (
              <div className="grid grid-cols-2 border-b border-pink/10 p-2">
                <button type="button" onClick={() => setAddTab("official")} className={`min-h-11 rounded-xl text-[12px] font-black ${addTab === "official" ? "bg-pink text-white" : "text-ink/50"}`}>公式スケジュール</button>
                <button type="button" onClick={() => { setAddTab("custom"); setCustomForm(nextSuggestedForm(items)); }} className={`min-h-11 rounded-xl text-[12px] font-black ${addTab === "custom" ? "bg-mint text-white" : "text-ink/50"}`}>自由予定</button>
              </div>
            )}

            <div className="max-h-[calc(88dvh-142px)] min-w-0 overflow-x-hidden overflow-y-auto px-4 pb-7 pt-4 sm:px-5">
              {addTab === "official" && !editingItem ? (
                scheduleState.status === "loading" ? (
                  <div className="flex min-h-40 items-center justify-center gap-2 text-[12px] font-bold text-ink/45"><LoaderCircle size={18} className="animate-spin text-pink" aria-hidden="true" />読み込み中…</div>
                ) : officialCandidates.length > 0 ? (
                  <div className="grid min-w-0 gap-2">
                    {officialCandidates.map((entry) => {
                      const added = isScheduleInPlan(plans, entry.id, selectedDate);
                      const names = getEntryCharacterNames(entry);
                      return (
                        <button
                          key={entry.id}
                          type="button"
                          aria-pressed={added}
                          aria-label={`${entry.title}を${added ? "マイプランから取り消す" : "マイプランに追加する"}`}
                          onClick={() => toggleOfficialSchedule(entry.id)}
                          className={`grid w-full min-w-0 grid-cols-[54px_minmax(0,1fr)_32px] items-center gap-3 overflow-hidden rounded-2xl border p-3 text-left transition-colors ${
                            added
                              ? "border-mint/50 bg-[#f4fbf8]"
                              : "border-pink/10 bg-[#fffafd] hover:border-pink/25 hover:bg-[#fff6fa]"
                          }`}
                        >
                          <div className="w-[54px] shrink-0 text-center">
                            <p className="text-[14px] font-black tabular-nums text-ink">{entry.startTime}</p>
                            <p className="text-[9px] font-bold text-ink/35">{entry.endTime ? `〜${entry.endTime}` : ""}</p>
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="block break-words text-[12px] font-black leading-5 text-ink [overflow-wrap:anywhere]">{entry.title}</span>
                            {names.length > 0 && <p className="mt-0.5 truncate text-[10px] font-bold text-pink">{names.join("・")}</p>}
                            {entry.location && <p className="mt-0.5 flex min-w-0 items-center gap-1 text-[10px] font-bold text-ink/40"><MapPin size={11} className="shrink-0" aria-hidden="true" /><span className="truncate">{entry.location}</span></p>}
                          </div>
                          <span
                            className={`grid h-8 w-8 place-items-center rounded-full ${
                              added ? "bg-mint text-white" : "border border-pink/20 bg-white text-pink"
                            }`}
                            aria-hidden="true"
                          >
                            {added ? <Check size={16} strokeWidth={3} /> : <Plus size={16} strokeWidth={2.5} />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="rounded-2xl border border-dashed border-pink/20 px-4 py-10 text-center text-[12px] font-bold text-ink/45">この日の公開スケジュールはまだありません。</p>
                )
              ) : (
                <div>
                  {!editingItem && (
                    <div className="mb-4 grid grid-cols-3 gap-2">
                      <button type="button" onClick={() => applyTemplate("お昼休憩", 45)} className="flex min-h-16 flex-col items-center justify-center rounded-2xl bg-[#fff5d9] text-[10px] font-black text-[#9a6512]"><Utensils size={17} aria-hidden="true" />お昼休憩</button>
                      <button type="button" onClick={() => applyTemplate("移動", 15)} className="flex min-h-16 flex-col items-center justify-center rounded-2xl bg-[#eef9f4] text-[10px] font-black text-[#35745f]"><Footprints size={17} aria-hidden="true" />移動</button>
                      <button type="button" onClick={() => applyTemplate("自由時間", 30)} className="flex min-h-16 flex-col items-center justify-center rounded-2xl bg-[#f3effa] text-[10px] font-black text-lavender"><Clock3 size={17} aria-hidden="true" />自由時間</button>
                    </div>
                  )}
                  <div className="grid gap-4">
                    <label className="block"><span className="mb-1.5 block text-[11px] font-black text-ink/55">予定名</span><input value={customForm.title} onChange={(event) => setCustomForm((current) => ({ ...current, title: event.target.value }))} placeholder="例：お昼休憩" className="min-h-11 w-full rounded-xl border border-ink/10 bg-[#fffafd] px-3 text-[13px] font-bold text-ink outline-none focus:border-pink" /></label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="block"><span className="mb-1.5 block text-[11px] font-black text-ink/55">開始時刻</span><input type="time" step={300} value={customForm.startTime} onChange={(event) => setCustomForm((current) => ({ ...current, startTime: event.target.value }))} className="min-h-11 w-full rounded-xl border border-ink/10 bg-[#fffafd] px-3 text-[13px] font-bold text-ink outline-none focus:border-pink" /></label>
                      <label className="block"><span className="mb-1.5 block text-[11px] font-black text-ink/55">終了時刻</span><input type="time" step={300} value={customForm.endTime} onChange={(event) => setCustomForm((current) => ({ ...current, endTime: event.target.value }))} className="min-h-11 w-full rounded-xl border border-ink/10 bg-[#fffafd] px-3 text-[13px] font-bold text-ink outline-none focus:border-pink" /></label>
                    </div>
                    <label className="block"><span className="mb-1.5 block text-[11px] font-black text-ink/55">場所（任意）</span><input value={customForm.location} onChange={(event) => setCustomForm((current) => ({ ...current, location: event.target.value }))} placeholder="例：レストラン" className="min-h-11 w-full rounded-xl border border-ink/10 bg-[#fffafd] px-3 text-[13px] font-bold text-ink outline-none focus:border-pink" /></label>
                    <label className="block"><span className="mb-1.5 block text-[11px] font-black text-ink/55">メモ（任意）</span><textarea value={customForm.note} onChange={(event) => setCustomForm((current) => ({ ...current, note: event.target.value }))} rows={3} className="w-full rounded-xl border border-ink/10 bg-[#fffafd] px-3 py-2.5 text-[13px] font-bold text-ink outline-none focus:border-pink" /></label>
                  </div>
                  {formError && <p className="mt-3 rounded-xl bg-[#fff1f1] px-3 py-2 text-[11px] font-bold text-[#a64c4c]" role="alert">{formError}</p>}
                  <button type="button" onClick={saveCustom} className="mt-5 min-h-12 w-full rounded-xl bg-ink text-[12px] font-black text-white">{editingItem ? "変更を保存" : "マイプランに追加"}</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {exportOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/35 sm:items-center sm:p-5">
          <div role="dialog" aria-modal="true" aria-labelledby="export-title" className="w-full max-w-md rounded-t-[28px] bg-white p-5 shadow-[0_24px_70px_rgba(62,53,64,0.25)] sm:rounded-[28px]">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-[10px] font-black tracking-[0.14em] text-pink">SAVE &amp; SHARE</p><h2 id="export-title" className="mt-1 text-[18px] font-black text-ink">画像として保存・共有</h2></div>
              <button type="button" onClick={() => setExportOpen(false)} className="grid h-10 w-10 place-items-center rounded-full bg-pink/5 text-pink" aria-label="閉じる"><X size={18} aria-hidden="true" /></button>
            </div>
            <div className="mt-5 rounded-2xl bg-[#fff8fb] p-4 text-center">
              {exportStatus === "preparing" && <><LoaderCircle size={24} className="mx-auto animate-spin text-pink" aria-hidden="true" /><p className="mt-3 text-[12px] font-bold text-ink/50">画像を準備しています…</p></>}
              {exportStatus === "ready" && exportPreviewUrl && (
                <>
                  <div className="flex max-h-[48vh] items-start justify-center overflow-auto rounded-xl border border-pink/10 bg-white p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={exportPreviewUrl}
                      alt={`${formatDate(selectedDate, false)}のマイプラン画像プレビュー`}
                      data-testid="plan-image-preview"
                      className="h-auto max-w-full rounded-lg"
                    />
                  </div>
                  <p className="mt-3 inline-flex items-center justify-center gap-1.5 text-[12px] font-bold text-ink/55"><Check size={16} className="text-[#53a687]" aria-hidden="true" />保存される画像のプレビューです。</p>
                </>
              )}
              {exportStatus === "error" && (
                <div>
                  <p className="text-[12px] font-bold text-[#a64c4c]">画像を作成できませんでした。</p>
                  <button type="button" onClick={() => setExportAttempt((current) => current + 1)} className="mt-3 min-h-10 rounded-xl bg-white px-4 text-[11px] font-black text-pink shadow-sm">
                    もう一度試す
                  </button>
                </div>
              )}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" disabled={!exportFile} onClick={downloadImage} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-pink/20 text-[12px] font-black text-pink disabled:opacity-40"><Download size={16} aria-hidden="true" />保存</button>
              <button type="button" disabled={!exportFile} onClick={() => void shareImage()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-pink text-[12px] font-black text-white disabled:opacity-40"><Share2 size={16} aria-hidden="true" />共有</button>
            </div>
            <p className="mt-3 text-[10px] font-bold leading-5 text-ink/40">プランはこの端末内だけに保存されています。共有時は画像ファイルのみを送信します。</p>
          </div>
        </div>
      )}

      <div aria-hidden="true" className="pointer-events-none fixed left-[-10000px] top-0">
        <div ref={printableRef}>
          <PrintablePlan date={selectedDate} items={items} />
        </div>
      </div>
    </>
  );
}
