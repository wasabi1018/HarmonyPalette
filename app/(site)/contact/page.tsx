import type { Metadata } from "next";
import { ExternalLink, Instagram } from "lucide-react";
import { InformationPage } from "@/components/information-page";
import { INSTAGRAM_URL } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "お問い合わせ",
  description: "Harmony Paletteへのお問い合わせ方法をご案内します。",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <InformationPage
      eyebrow="CONTACT"
      title="お問い合わせ"
      description="掲載内容の訂正やサイトに関するご連絡を受け付けています。"
      updatedAt="2026年7月30日"
    >
      <p>
        Harmony Paletteへのお問い合わせは、公式Instagramアカウントのダイレクトメッセージからお送りください。
        内容を確認のうえ、必要に応じて返信します。
      </p>

      <p>
        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-pink px-5 text-[12px] font-black !text-white !no-underline shadow-soft"
        >
          <Instagram size={17} aria-hidden="true" />
          Instagramで問い合わせる
          <ExternalLink size={14} aria-hidden="true" />
        </a>
      </p>

      <h2>お問い合わせ時のお願い</h2>
      <ul>
        <li>訂正依頼の場合は、対象ページのURLと該当箇所をお知らせください。</li>
        <li>返信までに時間がかかる場合や、内容によって返信できない場合があります。</li>
        <li>営業・勧誘を目的とする連絡には返信しない場合があります。</li>
      </ul>

      <h2>施設に関するお問い合わせ</h2>
      <p>
        営業時間、チケット、当日の運営状況、忘れ物など、施設に関するお問い合わせには回答できません。
        ハーモニーランド公式サイトに掲載されている窓口へお問い合わせください。
      </p>
    </InformationPage>
  );
}
