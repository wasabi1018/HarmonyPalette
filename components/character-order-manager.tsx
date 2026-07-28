"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownAZ, CakeSlice, Pencil, Plus, Save, Search, Trash2, UserRound, X } from "lucide-react";
import type { Character } from "@/data/types";
import { formatCharacterBirthday, getCharacterBirthday } from "@/lib/character-birthday";
import { compareCharacters, refreshCharacters, useCharacters } from "@/lib/character-store";

const inputClass = "min-h-11 w-full rounded-xl border border-ink/10 bg-[#fffafd] px-3 text-[13px] font-bold text-ink outline-none transition-colors placeholder:text-ink/30 focus:border-pink focus:ring-4 focus:ring-pink/10";
const labelClass = "mb-1.5 block text-[11px] font-black text-ink/55";

type CharacterForm = {
  id?: string;
  name: string;
  nameKana: string;
  slug: string;
  image: string;
  officialUrl: string;
  isFanStudioRegular: boolean;
  themeColor: string;
  displayOrder: number;
  birthdayMonth: number | null;
  birthdayDay: number | null;
};

const emptyForm: CharacterForm = {
  name: "",
  nameKana: "",
  slug: "",
  image: "/character-placeholder.svg",
  officialUrl: "https://www.harmonyland.jp/",
  isFanStudioRegular: false,
  themeColor: "#ef8099",
  displayOrder: 999,
  birthdayMonth: null,
  birthdayDay: null,
};

const birthdayMonths = Array.from({ length: 12 }, (_, index) => index + 1);

function birthdayDaysInMonth(month: number) {
  return new Date(Date.UTC(2000, month, 0)).getUTCDate();
}

export function CharacterOrderManager() {
  const { characters } = useCharacters({ fallbackToSamples: true });
  const [orders, setOrders] = useState<Record<string, number>>({});
  const dirtyOrderIds = useRef(new Set<string>());
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<CharacterForm>(emptyForm);
  const [editorOpen, setEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [feedback, setFeedback] = useState("");
  const birthdayDays = useMemo(
    () => form.birthdayMonth
      ? Array.from({ length: birthdayDaysInMonth(form.birthdayMonth) }, (_, index) => index + 1)
      : [],
    [form.birthdayMonth],
  );

  useEffect(() => {
    setOrders((current) => Object.fromEntries(
      characters.map((character) => [
        character.id,
        dirtyOrderIds.current.has(character.id)
          ? current[character.id] ?? character.displayOrder ?? 999
          : character.displayOrder ?? 999,
      ]),
    ));
  }, [characters]);

  const orderedCharacters = useMemo(() => [...characters]
    .filter((character) => `${character.name}${character.nameKana}${character.slug}`.toLocaleLowerCase("ja").includes(query.trim().toLocaleLowerCase("ja")))
    .sort((left, right) => compareCharacters(
      { ...left, displayOrder: orders[left.id] ?? left.displayOrder ?? 999 },
      { ...right, displayOrder: orders[right.id] ?? right.displayOrder ?? 999 },
    )), [characters, orders, query]);

  const authorizationHeaders = () => ({ "content-type": "application/json" });

  const openCreate = () => {
    setForm(emptyForm);
    setEditorOpen(true);
    setFeedback("");
  };

  const openEdit = (character: Character) => {
    setForm({
      id: character.id,
      name: character.name,
      nameKana: character.nameKana,
      slug: character.slug,
      image: character.image,
      officialUrl: character.officialUrl,
      isFanStudioRegular: character.isFanStudioRegular,
      themeColor: character.themeColor,
      displayOrder: character.displayOrder ?? 999,
      birthdayMonth: character.birthdayMonth,
      birthdayDay: character.birthdayDay,
    });
    setEditorOpen(true);
    setFeedback("");
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setForm(emptyForm);
  };

  const saveCharacter = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback("");
    setSaving(true);
    try {
      const editing = Boolean(form.id);
      const response = await fetch("/api/admin/characters", {
        method: editing ? "PATCH" : "POST",
        headers: authorizationHeaders(),
        body: JSON.stringify(form),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || `${editing ? "編集" : "登録"}に失敗しました。`);
      if (form.id) {
        dirtyOrderIds.current.delete(form.id);
        setOrders((current) => ({ ...current, [form.id!]: form.displayOrder }));
      }
      refreshCharacters();
      setFeedback(`「${form.name}」を${editing ? "更新" : "登録"}しました。`);
      closeEditor();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  };

  const deleteCharacter = async (character: Character) => {
    const confirmed = window.confirm(
      `「${character.name}」をキャラクター台帳から削除しますか？\n\n過去のスケジュールに保存された出演名は残ります。また、公式データを再取込すると再登録される場合があります。`,
    );
    if (!confirmed) return;

    setDeletingId(character.id);
    setFeedback("");
    try {
      const response = await fetch(`/api/admin/characters/${encodeURIComponent(character.id)}`, {
        method: "DELETE",
        headers: authorizationHeaders(),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "削除に失敗しました。");
      if (form.id === character.id) closeEditor();
      refreshCharacters();
      setFeedback(`「${character.name}」を台帳から削除しました。`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "削除に失敗しました。");
    } finally {
      setDeletingId("");
    }
  };

  const saveOrders = async () => {
    setFeedback("");
    setSaving(true);
    try {
      const response = await fetch("/api/admin/characters/order", {
        method: "PATCH",
        headers: authorizationHeaders(),
        body: JSON.stringify({
          orders: characters.map((character) => ({
            id: character.id,
            name: character.name,
            displayOrder: orders[character.id] ?? 999,
          })),
        }),
      });
      const result = await response.json() as { error?: string; updated?: number };
      if (!response.ok) throw new Error(result.error || "表示順の保存に失敗しました。");
      dirtyOrderIds.current.clear();
      refreshCharacters();
      setFeedback(`${result.updated ?? characters.length}件の表示順を保存しました。`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "表示順の保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mb-5 rounded-[24px] border border-lavender/15 bg-white p-4 shadow-soft sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-black tracking-[0.16em] text-lavender">
            <UserRound size={15} aria-hidden="true" /> CHARACTER CATALOG
          </p>
          <h2 className="mt-1 text-xl font-black text-ink">キャラクター管理</h2>
          <p className="mt-1 text-[12px] font-bold leading-5 text-ink/50">
            キャラクターの基本情報・誕生日・表示順を管理します。同じ表示順の場合は名前の昇順です。
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-pink px-4 text-[12px] font-black text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Plus size={15} aria-hidden="true" /> 新規登録
          </button>
        </div>
      </div>

      {editorOpen && (
        <form onSubmit={saveCharacter} className="mt-5 rounded-2xl border border-pink/15 bg-[#fffafd] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black tracking-[0.14em] text-pink">{form.id ? "EDIT CHARACTER" : "ADD CHARACTER"}</p>
              <h3 className="mt-1 text-[17px] font-black text-ink">{form.id ? `「${form.name}」を編集` : "キャラクターを登録"}</h3>
            </div>
            <button type="button" onClick={closeEditor} aria-label="編集フォームを閉じる" className="grid h-10 w-10 place-items-center rounded-xl bg-white text-ink/45 hover:text-pink"><X size={17} aria-hidden="true" /></button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label><span className={labelClass}>キャラクター名 <span className="text-pink">必須</span></span><input required maxLength={80} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className={inputClass} /></label>
            <label><span className={labelClass}>よみがな</span><input maxLength={80} value={form.nameKana} onChange={(event) => setForm((current) => ({ ...current, nameKana: event.target.value }))} placeholder="例：まいめろでぃ" className={inputClass} /></label>
            <label><span className={labelClass}>slug</span><input maxLength={80} value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} placeholder="未入力なら自動生成" className={inputClass} /></label>
            <label className="sm:col-span-2"><span className={labelClass}>画像URL・サイト内パス</span><input value={form.image} onChange={(event) => setForm((current) => ({ ...current, image: event.target.value }))} placeholder="/character-placeholder.svg" className={inputClass} /></label>
            <label><span className={labelClass}>表示順</span><input type="number" min={0} max={999999} step={1} value={form.displayOrder} onChange={(event) => setForm((current) => ({ ...current, displayOrder: Number(event.target.value) }))} className={inputClass} /></label>
            <label className="sm:col-span-2"><span className={labelClass}>公式プロフィールURL</span><input value={form.officialUrl} onChange={(event) => setForm((current) => ({ ...current, officialUrl: event.target.value }))} placeholder="https://..." className={inputClass} /></label>
            <label><span className={labelClass}>テーマカラー</span><span className="flex min-h-11 items-center gap-3 rounded-xl border border-ink/10 bg-white px-3"><input type="color" value={form.themeColor} onChange={(event) => setForm((current) => ({ ...current, themeColor: event.target.value }))} className="h-8 w-12 cursor-pointer border-0 bg-transparent" aria-label="テーマカラー" /><span className="text-[12px] font-black text-ink/60">{form.themeColor}</span></span></label>
            <fieldset className="rounded-2xl border border-pink/10 bg-white p-3 sm:col-span-2 lg:col-span-3">
              <legend className="px-1 text-[11px] font-black text-ink/55">誕生日</legend>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
                <label>
                  <span className={labelClass}>月</span>
                  <select
                    value={form.birthdayMonth ?? ""}
                    onChange={(event) => {
                      const birthdayMonth = event.target.value ? Number(event.target.value) : null;
                      setForm((current) => ({
                        ...current,
                        birthdayMonth,
                        birthdayDay: birthdayMonth
                          && current.birthdayDay
                          && current.birthdayDay <= birthdayDaysInMonth(birthdayMonth)
                          ? current.birthdayDay
                          : null,
                      }));
                    }}
                    className={inputClass}
                  >
                    <option value="">未設定</option>
                    {birthdayMonths.map((month) => <option key={month} value={month}>{month}月</option>)}
                  </select>
                </label>
                <label>
                  <span className={labelClass}>日</span>
                  <select
                    value={form.birthdayDay ?? ""}
                    onChange={(event) => setForm((current) => ({
                      ...current,
                      birthdayDay: event.target.value ? Number(event.target.value) : null,
                    }))}
                    disabled={form.birthdayMonth === null}
                    required={form.birthdayMonth !== null}
                    className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-45`}
                  >
                    <option value="">日を選択</option>
                    {birthdayDays.map((day) => <option key={day} value={day}>{day}日</option>)}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => setForm((current) => ({
                    ...current,
                    birthdayMonth: null,
                    birthdayDay: null,
                  }))}
                  disabled={form.birthdayMonth === null && form.birthdayDay === null}
                  className="min-h-11 rounded-xl border border-ink/10 px-4 text-[11px] font-black text-ink/50 transition hover:border-pink/30 hover:text-pink disabled:cursor-not-allowed disabled:opacity-40"
                >
                  未設定に戻す
                </button>
              </div>
              <p className="mt-2 text-[10px] font-bold leading-5 text-ink/40">誕生年は登録しません。2月29日も選択できます。</p>
            </fieldset>
          </div>

          <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-ink/10 bg-white px-3 text-[12px] font-bold text-ink/65 sm:w-fit">
            <input type="checkbox" checked={form.isFanStudioRegular} onChange={(event) => setForm((current) => ({ ...current, isFanStudioRegular: event.target.checked }))} className="h-4 w-4 accent-pink" />
            ファンスタジオで毎日会える案内対象
          </label>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <button type="submit" disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-pink px-5 text-[12px] font-black text-white disabled:opacity-45"><Save size={15} aria-hidden="true" />{saving ? "保存中…" : form.id ? "変更を保存" : "登録する"}</button>
            <button type="button" onClick={closeEditor} className="min-h-11 rounded-xl border border-ink/10 px-4 text-[12px] font-black text-ink/55">キャンセル</button>
          </div>
        </form>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <label className="relative block sm:w-72">
          <span className={labelClass}>キャラクターを検索</span>
          <Search size={15} className="pointer-events-none absolute bottom-3.5 left-3 text-ink/35" aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="名前・かな・slug" className={`${inputClass} pl-9`} />
        </label>
        <p className="text-[12px] font-black text-ink/45"><span className="text-lavender">{orderedCharacters.length}</span> / {characters.length}件</p>
      </div>

      <div className="mt-3 grid max-h-[500px] gap-2 overflow-y-auto pr-1 lg:grid-cols-2">
        {orderedCharacters.map((character) => {
          const birthday = getCharacterBirthday(character);
          return (
            <article key={character.id} className="flex min-w-0 items-center gap-3 rounded-xl border border-ink/10 bg-[#fffdfd] px-3 py-2.5">
              <span className="h-9 w-9 shrink-0 rounded-xl border-2 border-white shadow-soft" style={{ backgroundColor: character.themeColor }} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-black text-ink">{character.name}</p>
                <p className="mt-0.5 truncate text-[10px] font-bold text-ink/35">{character.nameKana || "よみがな未登録"}・{character.slug}</p>
                <p className={`mt-1 flex items-center gap-1 text-[10px] font-black ${birthday ? "text-pink" : "text-ink/30"}`}>
                  <CakeSlice size={11} aria-hidden="true" />
                  {birthday ? formatCharacterBirthday(birthday) : "誕生日未登録"}
                </p>
              </div>
              <label className="shrink-0">
                <span className="sr-only">{character.name}の表示順</span>
                <input
                  type="number"
                  min={0}
                  max={999999}
                  step={1}
                  value={orders[character.id] ?? 999}
                  onChange={(event) => {
                    dirtyOrderIds.current.add(character.id);
                    setOrders((current) => ({ ...current, [character.id]: Number(event.target.value) }));
                  }}
                  className={`${inputClass} w-20 text-right`}
                  aria-label={`${character.name}の表示順`}
                />
              </label>
              <button type="button" onClick={() => openEdit(character)} aria-label={`${character.name}を編集`} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-lavender/15 bg-lavender/5 text-lavender hover:bg-lavender/10"><Pencil size={15} aria-hidden="true" /></button>
              <button type="button" onClick={() => deleteCharacter(character)} disabled={deletingId === character.id} aria-label={`${character.name}を削除`} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-red-100 bg-red-50 text-red-500 hover:bg-red-100 disabled:opacity-40"><Trash2 size={15} aria-hidden="true" /></button>
            </article>
          );
        })}
        {orderedCharacters.length === 0 && <p className="rounded-xl border border-dashed border-pink/20 p-6 text-center text-[12px] font-bold text-ink/45 lg:col-span-2">該当するキャラクターはありません。</p>}
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <button type="button" onClick={saveOrders} disabled={saving || characters.length === 0} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-lavender px-5 text-[12px] font-black text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-45"><ArrowDownAZ size={15} aria-hidden="true" />{saving ? "保存中…" : "表示順をまとめて保存"}</button>
        {feedback && <p role="status" className="text-[12px] font-bold text-ink/60">{feedback}</p>}
      </div>
      <p className="mt-3 text-[10px] font-bold leading-5 text-ink/35">キャラクター名を編集しても、すでに保存された予定内の出演名は自動変更しません。必要に応じて予定候補も編集してください。</p>
    </section>
  );
}
