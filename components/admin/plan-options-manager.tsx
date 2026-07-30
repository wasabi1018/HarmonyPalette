"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, MapPinned, Pencil, Plus, Save, Search, Ticket, X } from "lucide-react";
import type { PlanAttraction, PlanFacility, PlanOptions } from "@/lib/plan-options";

type OptionType = "attraction" | "facility";

type OptionForm = {
  id?: string;
  type: OptionType;
  name: string;
  facilityId: string;
  displayOrder: number;
  isActive: boolean;
};

const emptyForm = (type: OptionType): OptionForm => ({
  type,
  name: "",
  facilityId: "",
  displayOrder: 999,
  isActive: true,
});

const inputClass = "min-h-11 w-full rounded-xl border border-ink/10 bg-[#fffafd] px-3 text-[13px] font-bold text-ink outline-none transition focus:border-pink focus:ring-4 focus:ring-pink/10";
const labelClass = "mb-1.5 block text-[11px] font-black text-ink/55";

function optionLabel(type: OptionType) {
  return type === "attraction" ? "アトラクション" : "施設";
}

export function PlanOptionsManager() {
  const [options, setOptions] = useState<PlanOptions>({ attractions: [], facilities: [] });
  const [form, setForm] = useState<OptionForm>(emptyForm("attraction"));
  const [editorOpen, setEditorOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [query, setQuery] = useState("");

  const loadOptions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/plan-options", { cache: "no-store" });
      const result = await response.json() as PlanOptions & { error?: string };
      if (!response.ok) throw new Error(result.error || "候補を読み込めませんでした。");
      setOptions({ attractions: result.attractions, facilities: result.facilities });
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "候補を読み込めませんでした。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  const normalizedQuery = query.trim().toLocaleLowerCase("ja");
  const attractions = useMemo(
    () => options.attractions.filter((item) => item.name.toLocaleLowerCase("ja").includes(normalizedQuery)),
    [normalizedQuery, options.attractions],
  );
  const facilities = useMemo(
    () => options.facilities.filter((item) => item.name.toLocaleLowerCase("ja").includes(normalizedQuery)),
    [normalizedQuery, options.facilities],
  );
  const facilityNames = useMemo(
    () => new Map(options.facilities.map((facility) => [facility.id, facility.name])),
    [options.facilities],
  );

  const openCreate = (type: OptionType) => {
    setForm(emptyForm(type));
    setEditorOpen(true);
    setFeedback("");
  };

  const openAttractionEdit = (item: PlanAttraction) => {
    setForm({
      id: item.id,
      type: "attraction",
      name: item.name,
      facilityId: item.facilityId ?? "",
      displayOrder: item.displayOrder,
      isActive: item.isActive,
    });
    setEditorOpen(true);
    setFeedback("");
  };

  const openFacilityEdit = (item: PlanFacility) => {
    setForm({
      id: item.id,
      type: "facility",
      name: item.name,
      facilityId: "",
      displayOrder: item.displayOrder,
      isActive: item.isActive,
    });
    setEditorOpen(true);
    setFeedback("");
  };

  const saveOption = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setFeedback("");
    try {
      const response = await fetch("/api/admin/plan-options", {
        method: form.id ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "保存に失敗しました。");
      setFeedback(`「${form.name}」を${form.id ? "更新" : "登録"}しました。`);
      setEditorOpen(false);
      setForm(emptyForm(form.type));
      await loadOptions();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item: PlanAttraction | PlanFacility, type: OptionType) => {
    setSaving(true);
    setFeedback("");
    try {
      const response = await fetch("/api/admin/plan-options", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...item,
          type,
          facilityId: type === "attraction" ? (item as PlanAttraction).facilityId : null,
          isActive: !item.isActive,
        }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "表示状態を変更できませんでした。");
      setFeedback(`「${item.name}」を${item.isActive ? "非表示" : "表示"}にしました。`);
      await loadOptions();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "表示状態を変更できませんでした。");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-[24px] border border-pink/10 bg-white p-4 shadow-soft sm:p-5">
      <div className="flex flex-col gap-4 border-b border-pink/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <label className="relative block sm:w-72">
          <span className={labelClass}>候補を検索</span>
          <Search size={15} className="pointer-events-none absolute bottom-3.5 left-3 text-ink/35" aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="アトラクション・施設名" className={`${inputClass} pl-9`} />
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => openCreate("facility")} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-lavender/20 px-4 text-[12px] font-black text-lavender">
            <Plus size={15} aria-hidden="true" />施設を追加
          </button>
          <button type="button" onClick={() => openCreate("attraction")} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-pink px-4 text-[12px] font-black text-white">
            <Plus size={15} aria-hidden="true" />アトラクションを追加
          </button>
        </div>
      </div>

      {editorOpen && (
        <form onSubmit={saveOption} className="mt-5 rounded-2xl border border-pink/10 bg-[#fff9fb] p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[15px] font-black text-ink">
              {form.id ? "編集" : "新規登録"}：{optionLabel(form.type)}
            </h2>
            <button type="button" onClick={() => setEditorOpen(false)} aria-label="編集を閉じる" className="grid h-9 w-9 place-items-center rounded-full bg-white text-pink"><X size={16} aria-hidden="true" /></button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label>
              <span className={labelClass}>名称</span>
              <input required maxLength={120} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className={inputClass} />
            </label>
            {form.type === "attraction" && (
              <label>
                <span className={labelClass}>既定の施設（任意）</span>
                <select value={form.facilityId} onChange={(event) => setForm((current) => ({ ...current, facilityId: event.target.value }))} className={inputClass}>
                  <option value="">設定しない</option>
                  {options.facilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name}{facility.isActive ? "" : "（非表示）"}</option>)}
                </select>
              </label>
            )}
            <label>
              <span className={labelClass}>表示順</span>
              <input type="number" min={0} max={999999} step={1} value={form.displayOrder} onChange={(event) => setForm((current) => ({ ...current, displayOrder: Number(event.target.value) }))} className={inputClass} />
            </label>
          </div>
          <label className="mt-3 flex min-h-11 w-fit cursor-pointer items-center gap-2 rounded-xl border border-ink/10 bg-white px-3 text-[12px] font-bold text-ink/65">
            <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} className="h-4 w-4 accent-pink" />
            マイプランの候補に表示
          </label>
          <button type="submit" disabled={saving} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-ink px-5 text-[12px] font-black text-white disabled:opacity-45">
            <Save size={15} aria-hidden="true" />{saving ? "保存中…" : "保存する"}
          </button>
        </form>
      )}

      {feedback && <p role="status" className="mt-4 rounded-xl bg-pink/5 px-3 py-2 text-[12px] font-bold text-ink/60">{feedback}</p>}

      {loading ? (
        <p className="py-12 text-center text-[12px] font-bold text-ink/45">候補を読み込んでいます…</p>
      ) : (
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <OptionList
            type="attraction"
            title="アトラクション"
            icon={<Ticket size={18} aria-hidden="true" />}
            items={attractions}
            facilityNames={facilityNames}
            saving={saving}
            onEdit={(item) => openAttractionEdit(item as PlanAttraction)}
            onToggle={(item) => void toggleActive(item, "attraction")}
          />
          <OptionList
            type="facility"
            title="施設"
            icon={<MapPinned size={18} aria-hidden="true" />}
            items={facilities}
            facilityNames={facilityNames}
            saving={saving}
            onEdit={(item) => openFacilityEdit(item as PlanFacility)}
            onToggle={(item) => void toggleActive(item, "facility")}
          />
        </div>
      )}
      <p className="mt-5 text-[10px] font-bold leading-5 text-ink/35">非表示にしても、すでに利用者が保存した自由予定の名称や場所は変わりません。</p>
    </section>
  );
}

function OptionList({
  type,
  title,
  icon,
  items,
  facilityNames,
  saving,
  onEdit,
  onToggle,
}: {
  type: OptionType;
  title: string;
  icon: React.ReactNode;
  items: Array<PlanAttraction | PlanFacility>;
  facilityNames: Map<string, string>;
  saving: boolean;
  onEdit: (item: PlanAttraction | PlanFacility) => void;
  onToggle: (item: PlanAttraction | PlanFacility) => void;
}) {
  return (
    <div>
      <h2 className="flex items-center gap-2 text-[14px] font-black text-ink">{icon}{title}<span className="text-[11px] text-ink/35">{items.length}件</span></h2>
      <div className="mt-3 grid gap-2">
        {items.map((item) => {
          const attraction = type === "attraction" ? item as PlanAttraction : null;
          return (
            <article key={item.id} className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 ${item.isActive ? "border-ink/10 bg-[#fffdfd]" : "border-ink/5 bg-[#f7f5f6] opacity-65"}`}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-black text-ink">{item.name}</p>
                <p className="mt-0.5 truncate text-[10px] font-bold text-ink/40">
                  表示順 {item.displayOrder}
                  {attraction?.facilityId ? `・${facilityNames.get(attraction.facilityId) ?? "施設未登録"}` : ""}
                </p>
              </div>
              <button type="button" onClick={() => onToggle(item)} disabled={saving} className="grid h-9 w-9 place-items-center rounded-lg text-ink/40 hover:bg-pink/5 hover:text-pink" aria-label={`${item.name}を${item.isActive ? "非表示" : "表示"}にする`}>
                {item.isActive ? <Eye size={15} aria-hidden="true" /> : <EyeOff size={15} aria-hidden="true" />}
              </button>
              <button type="button" onClick={() => onEdit(item)} className="grid h-9 w-9 place-items-center rounded-lg border border-lavender/15 bg-lavender/5 text-lavender" aria-label={`${item.name}を編集`}>
                <Pencil size={14} aria-hidden="true" />
              </button>
            </article>
          );
        })}
        {items.length === 0 && <p className="rounded-xl border border-dashed border-pink/20 px-4 py-8 text-center text-[11px] font-bold text-ink/40">登録された候補はありません。</p>}
      </div>
    </div>
  );
}
