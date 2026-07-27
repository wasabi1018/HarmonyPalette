"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Color } from "@tiptap/extension-color";
import { Image as TiptapImage } from "@tiptap/extension-image";
import { Link as TiptapLink } from "@tiptap/extension-link";
import { Placeholder } from "@tiptap/extension-placeholder";
import { TextStyle } from "@tiptap/extension-text-style";
import { Underline } from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Check,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  LoaderCircle,
  Palette,
  Quote,
  Redo2,
  Save,
  Search,
  Trash2,
  Underline as UnderlineIcon,
  Undo2,
  Upload,
  X,
} from "lucide-react";
import type {
  ArticleRecord,
  ArticleStatus,
  ArticleTag,
} from "@/lib/articles/types";
import { ArticlePreview } from "@/components/admin/article-preview";

type ArticleEditorProps = {
  initialArticle: ArticleRecord | null;
  availableTags: ArticleTag[];
  setupError?: string;
  demoMode?: boolean;
};

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

const blankDocument = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

function localDateTime(value: string | null) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function fallbackSlug() {
  const date = new Date();
  const parts = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
  ];
  return `article-${parts.join("")}`;
}

function normalizeSlug(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function ToolbarButton({
  label,
  active = false,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg transition ${
        active
          ? "bg-pink/10 text-pink"
          : "text-ink/55 hover:bg-ink/[0.04] hover:text-ink"
      } disabled:cursor-not-allowed disabled:opacity-30`}
    >
      {children}
    </button>
  );
}

export function ArticleEditor({
  initialArticle,
  availableTags,
  setupError = "",
  demoMode = false,
}: ArticleEditorProps) {
  const router = useRouter();
  const [articleId, setArticleId] = useState(initialArticle?.id || "");
  const [title, setTitle] = useState(initialArticle?.title || "");
  const [slug, setSlug] = useState(initialArticle?.slug || fallbackSlug());
  const [slugTouched, setSlugTouched] = useState(Boolean(initialArticle?.slug));
  const [excerpt, setExcerpt] = useState(initialArticle?.excerpt || "");
  const [coverImageUrl, setCoverImageUrl] = useState(initialArticle?.coverImageUrl || "");
  const [status, setStatus] = useState<ArticleStatus>(initialArticle?.status || "draft");
  const [publishedAt, setPublishedAt] = useState(localDateTime(initialArticle?.publishedAt || null));
  const [selectedTagIds, setSelectedTagIds] = useState(
    initialArticle?.tags.map((tag) => tag.id) || [],
  );
  const [tagQuery, setTagQuery] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [uploading, setUploading] = useState<"cover" | "body" | "">("");
  const coverInputRef = useRef<HTMLInputElement>(null);
  const bodyInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        link: false,
        underline: false,
        heading: { levels: [2, 3, 4] },
      }),
      Underline,
      TextStyle,
      Color,
      TiptapLink.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
        protocols: ["http", "https", "mailto"],
      }),
      TiptapImage.configure({
        allowBase64: demoMode,
        HTMLAttributes: { class: "article-body-image" },
      }),
      Placeholder.configure({
        placeholder: "ここから記事を書き始めます…",
      }),
    ],
    content: initialArticle?.contentJson || blankDocument,
    editorProps: {
      attributes: {
        class: "article-editor-content",
        "aria-label": "記事本文",
      },
    },
    onUpdate: () => {
      setSaveState("dirty");
      setMessage("");
    },
  });

  const selectedTags = useMemo(
    () => availableTags.filter((tag) => selectedTagIds.includes(tag.id)),
    [availableTags, selectedTagIds],
  );
  const filteredTags = useMemo(() => {
    const query = tagQuery.trim().toLocaleLowerCase("ja");
    return availableTags.filter((tag) => (
      !selectedTagIds.includes(tag.id)
      && (!query || `${tag.name} ${tag.slug}`.toLocaleLowerCase("ja").includes(query))
    ));
  }, [availableTags, selectedTagIds, tagQuery]);
  const contentHtml = editor?.getHTML() || initialArticle?.contentHtml || "<p></p>";
  const characterCount = editor?.getText().replace(/\s/g, "").length || 0;

  useEffect(() => {
    if (!previewOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [previewOpen]);

  const markDirty = () => {
    setSaveState("dirty");
    setMessage("");
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slugTouched) {
      const generated = normalizeSlug(value);
      setSlug(generated || fallbackSlug());
    }
    markDirty();
  };

  const uploadImage = async (file: File, placement: "cover" | "body") => {
    if (!file.type.startsWith("image/")) {
      setMessage("画像ファイルを選択してください。");
      setSaveState("error");
      return;
    }
    setUploading(placement);
    setMessage("");

    try {
      let url = "";
      if (demoMode) {
        url = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = () => reject(new Error("画像を読み込めませんでした。"));
          reader.readAsDataURL(file);
        });
      } else {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch("/api/admin/article-images", {
          method: "POST",
          body: formData,
        });
        const data = await response.json() as { url?: string; error?: string };
        if (!response.ok || !data.url) throw new Error(data.error || "画像のアップロードに失敗しました。");
        url = data.url;
      }

      if (placement === "cover") {
        setCoverImageUrl(url);
      } else {
        editor?.chain().focus().setImage({ src: url, alt: file.name }).run();
      }
      markDirty();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "画像のアップロードに失敗しました。");
      setSaveState("error");
    } finally {
      setUploading("");
      if (coverInputRef.current) coverInputRef.current.value = "";
      if (bodyInputRef.current) bodyInputRef.current.value = "";
    }
  };

  const save = async (nextStatus: ArticleStatus) => {
    if (!title.trim()) {
      setMessage("タイトルを入力してください。");
      setSaveState("error");
      return;
    }
    if (!normalizeSlug(slug)) {
      setMessage("スラッグを半角英数字で入力してください。");
      setSaveState("error");
      return;
    }
    if (!editor || editor.isEmpty) {
      setMessage("本文を入力してください。");
      setSaveState("error");
      return;
    }

    setSaveState("saving");
    setMessage("");
    const payload = {
      title: title.trim(),
      slug: normalizeSlug(slug),
      excerpt: excerpt.trim(),
      contentJson: editor.getJSON(),
      contentHtml: editor.getHTML(),
      coverImageUrl,
      status: nextStatus,
      publishedAt,
      tagIds: selectedTagIds,
    };

    try {
      if (demoMode) {
        await new Promise((resolve) => window.setTimeout(resolve, 350));
        setStatus(nextStatus);
        setSaveState("saved");
        setMessage(nextStatus === "published" ? "記事を公開しました。" : "下書きを保存しました。");
        return;
      }

      const response = await fetch(
        articleId ? `/api/admin/articles/${articleId}` : "/api/admin/articles",
        {
          method: articleId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json() as {
        article?: ArticleRecord;
        error?: string;
      };
      if (!response.ok || !data.article) {
        throw new Error(data.error || "記事の保存に失敗しました。");
      }

      const created = !articleId;
      setArticleId(data.article.id);
      setStatus(data.article.status);
      setPublishedAt(localDateTime(data.article.publishedAt));
      setSaveState("saved");
      setMessage(nextStatus === "published" ? "記事を公開しました。" : "下書きを保存しました。");
      if (created) {
        router.replace(`/admin/articles/${data.article.id}`);
      }
      router.refresh();
    } catch (error) {
      setSaveState("error");
      setMessage(error instanceof Error ? error.message : "記事の保存に失敗しました。");
    }
  };

  const applyLink = () => {
    const normalized = linkUrl.trim();
    if (!editor) return;
    if (!normalized) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: normalized }).run();
    }
    setLinkOpen(false);
    setLinkUrl("");
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-20 flex min-h-[64px] flex-wrap items-center justify-between gap-3 border-b border-pink/10 bg-white/95 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-7">
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-ink/40">
            記事 <span className="mx-2 text-ink/20">/</span>
            <span className="font-black text-ink">{articleId ? "編集" : "新規作成"}</span>
          </p>
          <div className="mt-1 flex items-center gap-2 text-[9px] font-bold text-ink/35 md:hidden">
            {saveState === "saving" && <LoaderCircle size={13} className="animate-spin text-pink" />}
            {saveState === "saved" && <CheckCircle2 size={13} className="text-[#4bb586]" />}
            {saveState === "dirty" && <span className="h-2 w-2 rounded-full bg-[#f2bb4d]" />}
            {saveState === "saving"
              ? "保存中…"
              : saveState === "saved"
                ? "保存しました"
                : saveState === "dirty"
                  ? "未保存の変更があります"
                  : "編集内容を入力してください"}
          </div>
        </div>

        <div className="hidden items-center gap-2 text-[10px] font-bold text-ink/40 md:flex">
          {saveState === "saving" && <LoaderCircle size={14} className="animate-spin text-pink" />}
          {saveState === "saved" && <CheckCircle2 size={14} className="text-[#4bb586]" />}
          {saveState === "dirty" && <span className="h-2 w-2 rounded-full bg-[#f2bb4d]" />}
          {saveState === "saving"
            ? "保存中…"
            : saveState === "saved"
              ? "保存しました"
              : saveState === "dirty"
                ? "未保存の変更があります"
                : "編集内容を入力してください"}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-ink/10 bg-white px-4 text-[11px] font-black text-ink transition hover:border-pink/25 hover:text-pink"
          >
            プレビュー
            <ExternalLink size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => save(status === "published" ? "published" : "draft")}
            disabled={saveState === "saving" || Boolean(setupError)}
            className="hidden min-h-10 items-center gap-2 rounded-xl border border-pink/20 bg-pink/5 px-4 text-[11px] font-black text-pink transition hover:bg-pink/10 disabled:opacity-40 sm:inline-flex"
          >
            <Save size={14} aria-hidden="true" />
            {status === "published" ? "更新を保存" : "下書き保存"}
          </button>
          <button
            type="button"
            onClick={() => save("published")}
            disabled={saveState === "saving" || Boolean(setupError)}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-pink px-4 text-[11px] font-black text-white shadow-[0_8px_18px_rgba(235,110,152,0.22)] transition hover:bg-[#df5c89] disabled:opacity-40"
          >
            {saveState === "saving" ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />}
            {status === "published" ? "更新する" : "公開する"}
          </button>
        </div>
      </header>

      {setupError && (
        <div className="border-b border-[#efd59a] bg-[#fff9ea] px-5 py-3 text-[11px] font-bold text-[#76582f]">
          {setupError}
        </div>
      )}

      <div className="grid min-h-[calc(100vh-64px)] xl:grid-cols-[minmax(0,1fr)_310px]">
        <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-7 xl:border-r xl:border-pink/10">
          <div className="mx-auto max-w-[850px]">
            <label className="block">
              <span className="flex items-center gap-2 text-[11px] font-black text-ink/60">
                タイトル
                <span className="rounded-full bg-pink/10 px-2 py-0.5 text-[8px] text-pink">必須</span>
              </span>
              <input
                value={title}
                onChange={(event) => handleTitleChange(event.target.value)}
                placeholder="記事タイトルを入力"
                className="mt-2 min-h-14 w-full rounded-xl border border-ink/10 bg-white px-4 text-[18px] font-black text-ink outline-none transition placeholder:text-ink/25 focus:border-pink focus:ring-4 focus:ring-pink/10 sm:text-[20px]"
              />
            </label>

            <section className="mt-6">
              <div className="flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-[11px] font-black text-ink/60">
                  アイキャッチ画像
                  <span className="rounded-full bg-ink/[0.05] px-2 py-0.5 text-[8px] text-ink/40">任意</span>
                </p>
                {coverImageUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setCoverImageUrl("");
                      markDirty();
                    }}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-[10px] font-black text-ink/40 hover:text-red-500"
                  >
                    <Trash2 size={13} aria-hidden="true" />
                    削除
                  </button>
                )}
              </div>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadImage(file, "cover");
                }}
              />
              {coverImageUrl ? (
                <div className="relative mt-2 overflow-hidden rounded-2xl border border-pink/10 bg-[#fffafd]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverImageUrl} alt="" className="aspect-[4/1] w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    disabled={uploading === "cover"}
                    className="absolute right-3 top-3 inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/70 bg-white/95 px-4 text-[10px] font-black text-ink shadow-soft"
                  >
                    {uploading === "cover"
                      ? <LoaderCircle size={14} className="animate-spin" />
                      : <Upload size={14} />}
                    画像を変更
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={uploading === "cover"}
                  className="mt-2 flex aspect-[4/1] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-pink/25 bg-[#fffafd] text-center transition hover:border-pink/50 hover:bg-pink/[0.03]"
                >
                  {uploading === "cover"
                    ? <LoaderCircle size={24} className="animate-spin text-pink" />
                    : <ImageIcon size={26} className="text-pink/60" />}
                  <strong className="mt-2 text-[11px] font-black text-ink/55">アイキャッチ画像を選択</strong>
                  <span className="mt-1 text-[9px] font-bold text-ink/30">JPEG・PNG・WebP・GIF / 10MBまで</span>
                </button>
              )}
            </section>

            <section className="mt-6">
              <p className="flex items-center gap-2 text-[11px] font-black text-ink/60">
                本文
                <span className="rounded-full bg-pink/10 px-2 py-0.5 text-[8px] text-pink">必須</span>
              </p>
              <div className="mt-2 overflow-visible rounded-2xl border border-ink/10 bg-white shadow-[0_1px_0_rgba(62,53,64,0.02)] focus-within:border-pink/40 focus-within:ring-4 focus-within:ring-pink/[0.06]">
                <div className="relative flex min-h-12 items-center gap-0.5 overflow-x-auto border-b border-ink/10 px-2 py-1.5">
                  <select
                    aria-label="段落スタイル"
                    value={
                      editor?.isActive("heading", { level: 2 }) ? "h2"
                        : editor?.isActive("heading", { level: 3 }) ? "h3"
                          : editor?.isActive("heading", { level: 4 }) ? "h4"
                            : "paragraph"
                    }
                    onChange={(event) => {
                      if (!editor) return;
                      const value = event.target.value;
                      if (value === "paragraph") editor.chain().focus().setParagraph().run();
                      else editor.chain().focus().toggleHeading({ level: Number(value.slice(1)) as 2 | 3 | 4 }).run();
                    }}
                    className="h-9 shrink-0 rounded-lg border border-ink/10 bg-white px-3 text-[10px] font-black text-ink/65 outline-none"
                  >
                    <option value="paragraph">段落</option>
                    <option value="h2">見出し2</option>
                    <option value="h3">見出し3</option>
                    <option value="h4">見出し4</option>
                  </select>
                  <span className="mx-1 h-5 w-px shrink-0 bg-ink/10" />
                  <ToolbarButton label="太字" active={editor?.isActive("bold")} disabled={!editor} onClick={() => editor?.chain().focus().toggleBold().run()}>
                    <Bold size={16} />
                  </ToolbarButton>
                  <ToolbarButton label="斜体" active={editor?.isActive("italic")} disabled={!editor} onClick={() => editor?.chain().focus().toggleItalic().run()}>
                    <Italic size={16} />
                  </ToolbarButton>
                  <ToolbarButton label="下線" active={editor?.isActive("underline")} disabled={!editor} onClick={() => editor?.chain().focus().toggleUnderline().run()}>
                    <UnderlineIcon size={16} />
                  </ToolbarButton>
                  <div className="relative">
                    <ToolbarButton
                      label="文字色"
                      disabled={!editor}
                      onClick={() => setColorOpen((value) => !value)}
                    >
                      <Palette size={16} />
                    </ToolbarButton>
                    {colorOpen && (
                      <div className="absolute left-0 top-11 z-30 w-[190px] rounded-xl border border-pink/15 bg-white p-3 shadow-card">
                        <p className="text-[9px] font-black text-ink/45">文字色</p>
                        <div className="mt-2 grid grid-cols-6 gap-2">
                          {[
                            ["ピンク", "#eb6e98"],
                            ["赤", "#d95c5c"],
                            ["オレンジ", "#d99145"],
                            ["緑", "#4b9b7e"],
                            ["青", "#4f83b6"],
                            ["紫", "#8b6bb1"],
                          ].map(([label, value]) => (
                            <button
                              type="button"
                              key={value}
                              aria-label={`${label}の文字色`}
                              onClick={() => {
                                editor?.chain().focus().setColor(value).run();
                                setColorOpen(false);
                              }}
                              className="h-6 w-6 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(62,53,64,0.12)]"
                              style={{ backgroundColor: value }}
                            />
                          ))}
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-2 border-t border-ink/[0.07] pt-3">
                          <label className="inline-flex min-h-8 cursor-pointer items-center gap-2 rounded-lg border border-ink/10 px-2 text-[9px] font-black text-ink/45">
                            その他
                            <input
                              type="color"
                              aria-label="その他の文字色"
                              defaultValue="#eb6e98"
                              className="h-5 w-5 cursor-pointer border-0 bg-transparent p-0"
                              onChange={(event) => {
                                editor?.chain().focus().setColor(event.target.value).run();
                                setColorOpen(false);
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              editor?.chain().focus().unsetColor().run();
                              setColorOpen(false);
                            }}
                            className="min-h-8 px-2 text-[9px] font-black text-ink/40"
                          >
                            リセット
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <ToolbarButton
                      label="リンク"
                      active={editor?.isActive("link")}
                      disabled={!editor}
                      onClick={() => {
                        setLinkUrl(editor?.getAttributes("link").href || "https://");
                        setLinkOpen((value) => !value);
                      }}
                    >
                      <Link2 size={16} />
                    </ToolbarButton>
                    {linkOpen && (
                      <div className="absolute left-0 top-11 z-30 w-[min(330px,80vw)] rounded-xl border border-pink/15 bg-white p-3 shadow-card">
                        <label className="block text-[9px] font-black text-ink/45">
                          リンクURL
                          <input
                            value={linkUrl}
                            onChange={(event) => setLinkUrl(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                applyLink();
                              }
                            }}
                            autoFocus
                            className="mt-1 min-h-10 w-full rounded-lg border border-ink/10 px-3 text-[11px] font-bold text-ink outline-none focus:border-pink"
                          />
                        </label>
                        <div className="mt-2 flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              editor?.chain().focus().extendMarkRange("link").unsetLink().run();
                              setLinkOpen(false);
                            }}
                            className="min-h-9 rounded-lg px-3 text-[10px] font-black text-red-500"
                          >
                            リンクを削除
                          </button>
                          <button type="button" onClick={applyLink} className="min-h-9 rounded-lg bg-pink px-3 text-[10px] font-black text-white">
                            適用
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <input
                    ref={bodyInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void uploadImage(file, "body");
                    }}
                  />
                  <ToolbarButton label="画像を挿入" disabled={!editor || uploading === "body"} onClick={() => bodyInputRef.current?.click()}>
                    {uploading === "body" ? <LoaderCircle size={16} className="animate-spin" /> : <ImageIcon size={16} />}
                  </ToolbarButton>
                  <span className="mx-1 h-5 w-px shrink-0 bg-ink/10" />
                  <ToolbarButton label="箇条書き" active={editor?.isActive("bulletList")} disabled={!editor} onClick={() => editor?.chain().focus().toggleBulletList().run()}>
                    <List size={16} />
                  </ToolbarButton>
                  <ToolbarButton label="番号付きリスト" active={editor?.isActive("orderedList")} disabled={!editor} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
                    <ListOrdered size={16} />
                  </ToolbarButton>
                  <ToolbarButton label="引用" active={editor?.isActive("blockquote")} disabled={!editor} onClick={() => editor?.chain().focus().toggleBlockquote().run()}>
                    <Quote size={16} />
                  </ToolbarButton>
                  <span className="mx-1 h-5 w-px shrink-0 bg-ink/10" />
                  <ToolbarButton label="元に戻す" disabled={!editor?.can().chain().focus().undo().run()} onClick={() => editor?.chain().focus().undo().run()}>
                    <Undo2 size={16} />
                  </ToolbarButton>
                  <ToolbarButton label="やり直す" disabled={!editor?.can().chain().focus().redo().run()} onClick={() => editor?.chain().focus().redo().run()}>
                    <Redo2 size={16} />
                  </ToolbarButton>
                </div>
                <EditorContent editor={editor} />
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[9px] font-bold text-ink/30">
                <span>文字数: {characterCount.toLocaleString("ja-JP")}</span>
                <span>{saveState === "dirty" ? "保存すると変更が反映されます" : "本文は安全なHTMLに整形して保存されます"}</span>
              </div>
            </section>
          </div>
        </main>

        <aside className="bg-[#fffcfd] px-4 py-6 sm:px-6 xl:px-5">
          <div className="mx-auto max-w-[850px] xl:sticky xl:top-[88px] xl:max-w-none">
            <h2 className="text-[14px] font-black text-ink">公開設定</h2>

            <label className="mt-5 block">
              <span className="text-[10px] font-black text-ink/50">ステータス</span>
              <span className="relative mt-2 block">
                <select
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value as ArticleStatus);
                    markDirty();
                  }}
                  className="min-h-11 w-full appearance-none rounded-xl border border-ink/10 bg-white px-4 pr-10 text-[11px] font-black text-ink outline-none focus:border-pink"
                >
                  <option value="draft">● 下書き</option>
                  <option value="published">● 公開</option>
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink/35" />
              </span>
            </label>

            <label className="mt-5 block">
              <span className="text-[10px] font-black text-ink/50">公開日時</span>
              <input
                type="datetime-local"
                value={publishedAt}
                onChange={(event) => {
                  setPublishedAt(event.target.value);
                  markDirty();
                }}
                className="mt-2 min-h-11 w-full rounded-xl border border-ink/10 bg-white px-3 text-[11px] font-bold text-ink outline-none focus:border-pink"
              />
            </label>

            <label className="mt-5 block">
              <span className="text-[10px] font-black text-ink/50">スラッグ（URL）</span>
              <input
                value={slug}
                onChange={(event) => {
                  setSlugTouched(true);
                  setSlug(normalizeSlug(event.target.value));
                  markDirty();
                }}
                className="mt-2 min-h-11 w-full rounded-xl border border-ink/10 bg-white px-3 text-[11px] font-bold text-ink outline-none focus:border-pink"
              />
              <span className="mt-2 block break-all text-[9px] font-bold leading-4 text-ink/30">
                /articles/{slug || "article-slug"}
              </span>
            </label>

            <div className="mt-6 border-t border-pink/10 pt-5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[10px] font-black text-ink/50">アイキャッチ画像</h3>
                {coverImageUrl && (
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    className="text-[9px] font-black text-pink hover:underline"
                  >
                    変更
                  </button>
                )}
              </div>
              {coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverImageUrl}
                  alt=""
                  className="mt-2 aspect-[3.4/1] w-full rounded-xl border border-pink/10 object-cover"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="mt-2 grid aspect-[3.4/1] w-full place-items-center rounded-xl border border-dashed border-pink/20 bg-white text-pink/45"
                >
                  <ImageIcon size={19} />
                </button>
              )}
            </div>

            <div className="mt-6 border-t border-pink/10 pt-5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[10px] font-black text-ink/50">タグ</h3>
                <a href="/admin/tags" className="inline-flex items-center gap-1 text-[9px] font-black text-pink hover:underline">
                  タグを管理
                  <ExternalLink size={11} aria-hidden="true" />
                </a>
              </div>
              <label className="relative mt-2 block">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/30" />
                <input
                  value={tagQuery}
                  onChange={(event) => setTagQuery(event.target.value)}
                  placeholder="タグを検索…"
                  className="min-h-10 w-full rounded-xl border border-ink/10 bg-white pl-9 pr-3 text-[10px] font-bold text-ink outline-none focus:border-pink"
                />
              </label>
              {filteredTags.length > 0 && tagQuery && (
                <div className="mt-2 overflow-hidden rounded-xl border border-ink/10 bg-white">
                  {filteredTags.slice(0, 6).map((tag) => (
                    <button
                      type="button"
                      key={tag.id}
                      onClick={() => {
                        setSelectedTagIds((ids) => [...ids, tag.id]);
                        setTagQuery("");
                        markDirty();
                      }}
                      className="flex min-h-10 w-full items-center gap-2 border-b border-ink/[0.06] px-3 text-left text-[10px] font-bold text-ink/60 last:border-0 hover:bg-pink/[0.04]"
                    >
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tag.color }} />
                      {tag.name}
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedTags.map((tag) => (
                  <button
                    type="button"
                    key={tag.id}
                    onClick={() => {
                      setSelectedTagIds((ids) => ids.filter((id) => id !== tag.id));
                      markDirty();
                    }}
                    className="inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-[9px] font-black"
                    style={{ color: tag.color, backgroundColor: `${tag.color}14` }}
                  >
                    {tag.name}
                    <X size={11} aria-hidden="true" />
                  </button>
                ))}
                {selectedTags.length === 0 && (
                  <span className="text-[9px] font-bold text-ink/30">タグはまだ選択されていません。</span>
                )}
              </div>
            </div>

            <label className="mt-6 block border-t border-pink/10 pt-5">
              <span className="text-[10px] font-black text-ink/50">抜粋</span>
              <textarea
                value={excerpt}
                maxLength={240}
                rows={5}
                onChange={(event) => {
                  setExcerpt(event.target.value);
                  markDirty();
                }}
                placeholder="記事一覧に表示する短い紹介文"
                className="mt-2 w-full resize-y rounded-xl border border-ink/10 bg-white px-3 py-3 text-[11px] font-bold leading-5 text-ink outline-none placeholder:text-ink/25 focus:border-pink"
              />
              <span className="mt-1 block text-right text-[9px] font-bold text-ink/30">{excerpt.length} / 240</span>
            </label>

            <button
              type="button"
              onClick={() => save(status === "published" ? "published" : "draft")}
              disabled={saveState === "saving" || Boolean(setupError)}
              className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-pink/20 bg-white text-[11px] font-black text-pink transition hover:bg-pink/[0.04] disabled:opacity-40 sm:hidden"
            >
              <Save size={14} aria-hidden="true" />
              {status === "published" ? "更新を保存" : "下書き保存"}
            </button>

            {message && (
              <p
                role={saveState === "error" ? "alert" : "status"}
                className={`mt-3 rounded-xl px-3 py-2.5 text-[10px] font-bold leading-5 ${
                  saveState === "error"
                    ? "border border-red-100 bg-red-50 text-red-600"
                    : "border border-[#bfe4d2] bg-[#f0fbf5] text-[#35745f]"
                }`}
              >
                {message}
              </p>
            )}
          </div>
        </aside>
      </div>

      {previewOpen && (
        <div className="fixed inset-0 z-[70] overflow-y-auto bg-[#fffafd]">
          <ArticlePreview
            title={title}
            excerpt={excerpt}
            coverImageUrl={coverImageUrl}
            contentHtml={contentHtml}
            tags={selectedTags}
            publishedAt={publishedAt}
            onClose={() => setPreviewOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
