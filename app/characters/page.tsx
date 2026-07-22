import type { Metadata } from "next";
import { CharacterBrowser } from "@/components/character-browser";
import { OfficialNotice } from "@/components/official-notice";
import { PageIntro } from "@/components/page-intro";
import { characters as sampleCharacters } from "@/data/site-data";
import { getRegisteredCharacters } from "@/lib/supabase/character-repository";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "キャラクター一覧",
  description: "ハーモニーランドで会えるキャラクターを、名前や登場予定から探せます。",
  alternates: { canonical: "/characters" },
};

export default async function CharactersPage() {
  let characters = sampleCharacters;
  try {
    characters = await getRegisteredCharacters() ?? sampleCharacters;
  } catch {
    // 登録データを取得できない場合のみ、従来のサンプルを表示します。
  }

  return <div className="mx-auto max-w-[1240px] px-4 pt-8 sm:px-6 lg:px-8 lg:pt-12"><PageIntro eyebrow="MEET THE CHARACTERS" title="会いたいキャラクターから探す。" description="今日会えるか、次はいつ会えるかを見つけやすく整理しました。画像は権利に配慮したサンプルプレースホルダーです。" tone="lavender" /><CharacterBrowser initialCharacters={characters} /><div className="mt-8"><OfficialNotice /></div></div>;
}
