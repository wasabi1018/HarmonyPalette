"use client";

import Image from "next/image";
import { useState } from "react";
import type { RakutenBannerPlacement } from "@/lib/rakuten-banner";

type Props = {
  banner: RakutenBannerPlacement | null;
  preview?: boolean;
  onImageSize?: (width: number, height: number) => void;
};

function BannerImage({ banner, preview, onImageSize }: Props & { banner: RakutenBannerPlacement }) {
  const [failed, setFailed] = useState(false);
  if (failed) return preview ? <p role="alert" className="px-4 py-6 text-sm leading-6 text-red-700">バナー画像を読み込めませんでした。画像URLを確認してください。</p> : null;
  return (
    <section aria-label="楽天の広告バナー" data-rakuten-banner={banner.placementId} className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-full" style={{ width: banner.width }}>
        <p className="mb-2 text-right text-[11px] leading-4 text-ink/55">広告／PR</p>
        <a href={banner.linkUrl} target="_blank" rel="nofollow sponsored noopener noreferrer"
          aria-label={`${banner.alt}（新しいタブで開きます）`}
          className="block max-w-full rounded-sm outline-none transition-opacity hover:opacity-90 active:opacity-75 focus-visible:ring-2 focus-visible:ring-[#c94372] focus-visible:ring-offset-2">
          <Image src={banner.imageUrl} alt={banner.alt} width={banner.width} height={banner.height} unoptimized loading="lazy"
            className="block h-auto w-full" onError={() => setFailed(true)}
            onLoad={(event) => { const image = event.currentTarget; if (image.naturalWidth && image.naturalHeight) onImageSize?.(image.naturalWidth, image.naturalHeight); }} />
        </a>
      </div>
    </section>
  );
}

export function RakutenBanner({ banner, preview = false, onImageSize }: Props) {
  if (!banner || (!preview && !banner.enabled) || !banner.linkUrl || !banner.imageUrl) return null;
  return <BannerImage key={banner.imageUrl} banner={banner} preview={preview} onImageSize={onImageSize} />;
}
