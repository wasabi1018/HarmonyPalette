"use client";

import { useRef, useState } from "react";
import { ArrowLeftRight, ImageIcon, Images, LoaderCircle, UnfoldVertical, Upload } from "lucide-react";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import {
  ArticleLayout,
  ArticleLayoutColumn,
  ArticleLayoutImage,
  articleLayouts,
  normalizeArticleLayout,
  swapArticleLayout,
  unwrapArticleLayout,
  type ArticleLayoutImageOptions,
  type ArticleLayoutImageValue,
} from "@/lib/articles/layout";

function LayoutView({ node, editor, getPos }: NodeViewProps) {
  const layout = normalizeArticleLayout(node.attrs.layout);
  function changeLayout(unwrap: boolean) {
    const pos = getPos();
    if (typeof pos !== "number") return;
    editor.chain().focus().command(({ tr }) => {
      const current = tr.doc.nodeAt(pos);
      if (current?.type.name !== "articleLayout") return false;
      tr.replaceWith(pos, pos + current.nodeSize, unwrap ? unwrapArticleLayout(current) : swapArticleLayout(current));
      return true;
    }).run();
  }
  return (
    <NodeViewWrapper data-article-layout={layout} className="my-5 rounded-xl border border-pink/20 bg-white p-3">
      <div contentEditable={false} className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-pink/10 pb-2 text-[10px] font-bold text-ink/60">
        <span>{articleLayouts.find((item) => item.value === layout)?.label}</span>
        <div className="flex flex-wrap gap-1">
          <button type="button" aria-label="レイアウトの左右を入れ替え" onClick={() => changeLayout(false)} className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 hover:bg-pink/10">
            <ArrowLeftRight size={14} aria-hidden="true" />左右を入れ替え
          </button>
          <button type="button" aria-label="内容を残してレイアウトを解除" onClick={() => changeLayout(true)} className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 hover:bg-pink/10">
            <UnfoldVertical size={14} aria-hidden="true" />解除
          </button>
        </div>
      </div>
      <NodeViewContent className="article-layout-columns" />
    </NodeViewWrapper>
  );
}

function LayoutImageView({ node, extension, updateAttributes }: NodeViewProps) {
  const { src, alt, caption } = node.attrs as ArticleLayoutImageValue;
  const options = extension.options as ArticleLayoutImageOptions;
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  return (
    <NodeViewWrapper as="figure" data-article-image="" contentEditable={false} className="min-w-0">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="!m-0 w-full rounded-xl" />
      ) : (
        <div className="flex min-h-36 flex-col items-center justify-center rounded-xl border border-dashed border-pink/30 bg-pink/[0.03] p-4 text-ink/45">
          <ImageIcon size={24} aria-hidden="true" />
          <p className="!mb-0 !mt-2 text-[11px]">写真を選択してください</p>
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-1">
        <button type="button" disabled={uploading} onClick={() => { setError(""); options.onChooseImage(updateAttributes); }} className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-[10px] font-bold text-pink hover:bg-pink/10 disabled:opacity-40">
          <Images size={14} aria-hidden="true" />{src ? "写真を変更" : "ライブラリから選択"}
        </button>
        <button type="button" disabled={uploading} onClick={() => inputRef.current?.click()} className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-[10px] font-bold text-ink/55 hover:bg-pink/10 disabled:opacity-40">
          {uploading ? <LoaderCircle size={14} className="animate-spin" aria-hidden="true" /> : <Upload size={14} aria-hidden="true" />}アップロード
        </button>
        {src && <button type="button" disabled={uploading} onClick={() => updateAttributes({ src: "", alt: "", caption: "" })} className="min-h-10 rounded-lg px-2 text-[10px] font-bold text-ink/45 hover:bg-pink/10">写真を外す</button>}
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setUploading(true);
        setError("");
        try {
          if (!await options.onUploadImage(file, updateAttributes)) setError("画像をアップロードできませんでした。");
        } catch {
          setError("画像をアップロードできませんでした。");
        } finally {
          setUploading(false);
          if (inputRef.current) inputRef.current.value = "";
        }
      }} />
      {error && <p role="alert" className="text-[11px] text-red-600">{error}</p>}
      {src && <details className="mt-1 rounded-lg bg-pink/[0.03] px-2 py-1 text-[10px] text-ink/60">
        <summary className="min-h-9 cursor-pointer py-2 font-bold">画像の説明・キャプション</summary>
        <label className="mt-1 block font-bold">画像の説明（代替テキスト）
          <input value={alt} maxLength={500} onChange={(event) => updateAttributes({ alt: event.target.value })} className="mt-1 min-h-10 w-full rounded-lg border border-ink/15 bg-white px-2 text-[12px] font-normal" />
        </label>
        <label className="my-2 block font-bold">キャプション
          <input value={caption} maxLength={500} onChange={(event) => updateAttributes({ caption: event.target.value })} className="mt-1 min-h-10 w-full rounded-lg border border-ink/15 bg-white px-2 text-[12px] font-normal" />
        </label>
      </details>}
      {caption && <figcaption>{caption}</figcaption>}
    </NodeViewWrapper>
  );
}

export function createArticleLayoutExtensions(options: ArticleLayoutImageOptions) {
  return [
    ArticleLayout.extend({ addNodeView() { return ReactNodeViewRenderer(LayoutView); } }),
    ArticleLayoutColumn,
    ArticleLayoutImage.extend({ addNodeView() { return ReactNodeViewRenderer(LayoutImageView); } }).configure(options),
  ];
}
