"use client";

import { CircleAlert, LoaderCircle, RotateCw } from "lucide-react";

export function DataStatePanel({
  state,
  message,
  onRetry,
}: {
  state: "loading" | "error" | "unavailable";
  message: string;
  onRetry?: () => void;
}) {
  const isLoading = state === "loading";

  return (
    <div
      className="flex min-h-32 flex-col items-center justify-center rounded-2xl border border-dashed border-pink/20 bg-white px-4 py-7 text-center"
      role={isLoading ? "status" : "alert"}
      aria-live="polite"
      aria-busy={isLoading}
    >
      {isLoading
        ? <LoaderCircle size={22} className="animate-spin text-pink motion-reduce:animate-none" aria-hidden="true" />
        : <CircleAlert size={22} className="text-pink" aria-hidden="true" />}
      <p className="mt-3 text-[12px] font-bold leading-5 text-ink/55">{message}</p>
      {!isLoading && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-pink px-4 text-[11px] font-black text-white"
        >
          <RotateCw size={14} aria-hidden="true" />
          再試行
        </button>
      )}
    </div>
  );
}
