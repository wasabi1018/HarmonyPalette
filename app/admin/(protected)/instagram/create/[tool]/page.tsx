import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { InstagramPageHeading } from "@/components/admin/instagram-workspace";
import { getInstagramTool } from "@/lib/instagram-admin-tools";
import { getInitialCharacterData, getInitialParkOperatingDayData, getInitialScheduleData } from "@/lib/supabase/initial-data";

const CrowdCalendar = dynamic(() => import("@/components/admin/instagram-crowd-calendar-studio").then((module) => module.InstagramCrowdCalendarStudio));
const CharacterRecommendation = dynamic(() => import("@/components/admin/character-recommendation-studio").then((module) => module.CharacterRecommendationStudio));
const Schedule = dynamic(() => import("@/components/admin/instagram-schedule-studio").then((module) => module.InstagramScheduleStudio));
type Props = { params: Promise<{ tool: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: getInstagramTool((await params).tool)?.title ?? "作成ツール" };
}

export default async function InstagramToolPage({ params }: Props) {
  const tool = getInstagramTool((await params).tool);
  if (!tool) notFound();
  const heading = <InstagramPageHeading title={tool.title} description={tool.description} category="create" />;
  if (tool.id === "crowd-calendar") return <>{heading}<CrowdCalendar /></>;
  const [initialScheduleData, initialCharacterData, initialParkOperatingDayData] = await Promise.all([getInitialScheduleData(), getInitialCharacterData(), getInitialParkOperatingDayData()]);
  const data = { initialScheduleData, initialCharacterData, initialParkOperatingDayData };
  return <>{heading}{tool.id === "character-recommendations" ? <CharacterRecommendation {...data} /> : <Schedule key={tool.id} {...data} fixedTemplate={tool.id === "schedule" ? "overview" : tool.id === "fan-studio-weekly" ? "fan-studio" : "fan-studio-daily"} />}</>;
}
