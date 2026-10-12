import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { InstagramPageHeading } from "@/components/admin/instagram-workspace";
import { getInitialCharacterData, getInitialParkOperatingDayData, getInitialScheduleData } from "@/lib/supabase/initial-data";

const InstagramDmNewCampaign = dynamic(() => import("@/components/admin/instagram-dm-new-campaign").then((module) => module.InstagramDmNewCampaign));

export const metadata: Metadata = { title: "DMキャンペーンを作成" };
export default async function InstagramDmNewPage() {
  const [initialScheduleData, initialCharacterData, initialParkOperatingDayData] = await Promise.all([
    getInitialScheduleData(), getInitialCharacterData(), getInitialParkOperatingDayData(),
  ]);
  return <><InstagramPageHeading title="DMキャンペーンを作成" description="Reelとキャラクターを選び、画像・DM文をまとめて下書きに登録します。" category="dm" /><InstagramDmNewCampaign initialScheduleData={initialScheduleData} initialCharacterData={initialCharacterData} initialParkOperatingDayData={initialParkOperatingDayData} /></>;
}
