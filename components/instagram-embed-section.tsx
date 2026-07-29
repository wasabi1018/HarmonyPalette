"use client";

import Script from "next/script";
import { ArrowRight, Instagram } from "lucide-react";
import { useCallback, useEffect } from "react";
import {
  instagramAccountUrl,
  type InstagramPostUrls,
} from "@/data/instagram-posts";

declare global {
  interface Window {
    instgrm?: {
      Embeds: {
        process: () => void;
      };
    };
  }
}

export function InstagramEmbedSection({
  postUrls,
}: {
  postUrls: InstagramPostUrls;
}) {
  const processEmbeds = useCallback(() => {
    window.instgrm?.Embeds.process();
  }, []);
  const postKey = postUrls.join("|");

  useEffect(() => {
    processEmbeds();
  }, [postKey, processEmbeds]);

  return (
    <section id="instagram" className="mt-12 border-t border-pink/10 pt-10" aria-labelledby="instagram-heading">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2
            id="instagram-heading"
            className="font-display text-[26px] font-semibold tracking-[-0.035em] text-ink sm:text-[30px]"
          >
            Instagram
          </h2>
          <a
            href={instagramAccountUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-black text-pink hover:underline"
          >
            <Instagram size={14} aria-hidden="true" />
            @harmony__palette
          </a>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1100px] gap-4 md:grid-cols-2">
        {postUrls.map((postUrl, index) => (
          <div
            key={postUrl}
            className={index === 1 ? "hidden justify-center md:flex" : "flex justify-center"}
          >
            <blockquote
              className="instagram-media m-0 w-full min-w-0 bg-white"
              data-instgrm-permalink={postUrl}
              data-instgrm-version="14"
              style={{
                border: "1px solid rgba(62, 53, 64, 0.12)",
                borderRadius: "4px",
                boxShadow: "none",
                margin: 0,
                maxWidth: "540px",
                minWidth: "326px",
                padding: 0,
                width: "100%",
              }}
            >
              <a
                href={postUrl}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-[220px] items-center justify-center rounded bg-white px-5 text-center text-sm font-black text-pink hover:underline"
              >
                Instagramで見る
              </a>
            </blockquote>
          </div>
        ))}
      </div>

      <a
        href={instagramAccountUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-full border border-pink/40 bg-white px-4 text-[12px] font-black text-pink transition-colors hover:border-pink hover:bg-pink/5 md:hidden"
      >
        投稿をもっと見る
        <ArrowRight size={15} aria-hidden="true" />
      </a>

      <Script
        id="instagram-embed-script"
        src="https://www.instagram.com/embed.js"
        strategy="lazyOnload"
        onLoad={processEmbeds}
      />
    </section>
  );
}
