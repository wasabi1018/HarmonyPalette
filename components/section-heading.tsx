import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function SectionHeading({
  eyebrow,
  title,
  description,
  href,
  linkLabel = "もっと見る",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-5 flex flex-col gap-2.5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="mb-1.5 text-[10px] font-black tracking-[0.18em] text-pink sm:text-[11px]">
          {eyebrow}
        </p>
        <h2 className="font-display text-[23px] font-semibold leading-tight tracking-[-0.02em] text-ink sm:text-[27px]">
          {title}
        </h2>
        {description && (
          <p className="mt-1.5 max-w-2xl text-[13px] leading-6 text-ink/55 sm:text-sm">
            {description}
          </p>
        )}
      </div>
      {href && (
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-1.5 text-[12px] font-black text-pink hover:underline sm:text-[13px]"
        >
          {linkLabel}
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
