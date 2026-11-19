import { Node, type JSONContent } from "@tiptap/react";
import type { DOMOutputSpec, Node as ProseMirrorNode } from "@tiptap/pm/model";

export const articleLayouts = [
  { value: "image-left", label: "左に写真・右に文章" },
  { value: "image-right", label: "左に文章・右に写真" },
  { value: "two-images", label: "写真を2枚並べる" },
] as const;

export type ArticleLayoutKind = typeof articleLayouts[number]["value"];
export type ArticleLayoutImageValue = { src: string; alt: string; caption: string };
export type ApplyLayoutImage = (image: Pick<ArticleLayoutImageValue, "src" | "alt">) => void;
export type ArticleLayoutImageOptions = {
  onChooseImage: (apply: ApplyLayoutImage) => void;
  onUploadImage: (file: File, apply: ApplyLayoutImage) => Promise<boolean>;
};

export function normalizeArticleLayout(value: unknown): ArticleLayoutKind {
  return articleLayouts.find((layout) => layout.value === value)?.value ?? "image-left";
}

export function createArticleLayoutContent(layout: ArticleLayoutKind): JSONContent {
  const image = () => ({ type: "articleLayoutImage" });
  const text = () => ({ type: "paragraph" });
  return {
    type: "articleLayout",
    attrs: { layout },
    content: [
      { type: "articleLayoutColumn", content: [layout === "image-right" ? text() : image()] },
      { type: "articleLayoutColumn", content: [layout === "image-left" ? text() : image()] },
    ],
  };
}

export function swapArticleLayout(node: ProseMirrorNode) {
  const layout = normalizeArticleLayout(node.attrs.layout);
  return node.type.create({
    ...node.attrs,
    layout: layout === "image-left" ? "image-right" : layout === "image-right" ? "image-left" : layout,
  }, [node.child(1), node.child(0)]);
}

export function unwrapArticleLayout(node: ProseMirrorNode) {
  const blocks: ProseMirrorNode[] = [];
  node.forEach((column) => column.forEach((block) => blocks.push(block)));
  return blocks;
}

export const ArticleLayout = Node.create({
  name: "articleLayout",
  group: "block",
  content: "articleLayoutColumn articleLayoutColumn",
  defining: true,
  isolating: true,
  addAttributes() {
    return {
      layout: {
        default: "image-left",
        parseHTML: (element) => normalizeArticleLayout(element.getAttribute("data-article-layout")),
        rendered: false,
      },
    };
  },
  parseHTML() { return [{ tag: "div[data-article-layout]" }]; },
  renderHTML({ node }) { return ["div", { "data-article-layout": normalizeArticleLayout(node.attrs.layout) }, 0]; },
});

export const ArticleLayoutColumn = Node.create({
  name: "articleLayoutColumn",
  content: "block+",
  isolating: true,
  parseHTML() { return [{ tag: "div[data-article-layout-column]" }]; },
  renderHTML() { return ["div", { "data-article-layout-column": "" }, 0]; },
});

export const ArticleLayoutImage = Node.create<ArticleLayoutImageOptions>({
  name: "articleLayoutImage",
  group: "block",
  atom: true,
  draggable: true,
  addOptions() {
    return { onChooseImage: () => {}, onUploadImage: async () => false };
  },
  addAttributes() {
    return {
      src: { default: "", rendered: false, parseHTML: (element) => element.querySelector("img")?.getAttribute("src") ?? "" },
      alt: { default: "", rendered: false, parseHTML: (element) => element.querySelector("img")?.getAttribute("alt") ?? "" },
      caption: { default: "", rendered: false, parseHTML: (element) => element.querySelector("figcaption")?.textContent ?? "" },
    };
  },
  parseHTML() { return [{ tag: "figure[data-article-image]" }]; },
  renderHTML({ node }): DOMOutputSpec {
    const { src, alt, caption } = node.attrs as ArticleLayoutImageValue;
    const children: DOMOutputSpec[] = [];
    if (src) children.push(["img", { src, alt }]);
    if (caption) children.push(["figcaption", {}, caption]);
    return ["figure", { "data-article-image": "" }, ...children];
  },
});
