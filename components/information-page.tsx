import type { ReactNode } from "react";
import { PageIntro } from "@/components/page-intro";

export function InformationPage({
  eyebrow,
  title,
  description,
  updatedAt,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  updatedAt: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-[1040px] px-4 pt-8 sm:px-6 lg:px-8 lg:pt-12">
      <PageIntro
        eyebrow={eyebrow}
        title={title}
        description={description}
        tone="pink"
      />
      <article className="mt-7 rounded-[28px] border border-pink/10 bg-white px-5 py-7 shadow-soft sm:px-9 sm:py-10">
        <p className="text-right text-[10px] font-bold text-ink/35">最終更新日：{updatedAt}</p>
        <div className="article-prose mt-6">{children}</div>
      </article>
    </div>
  );
}
