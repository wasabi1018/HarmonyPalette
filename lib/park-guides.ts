export type ParkGuideSection = {
  title: string;
  paragraphs?: readonly string[];
  items?: readonly string[];
};

export type ParkGuide = {
  id: string;
  title: string;
  summary: string;
  sections?: readonly ParkGuideSection[];
  contentHtml?: string;
  articleUrl?: string;
};

export type ParkGuideCatalog = {
  preparing: boolean;
  groups: { id: string; name: string; guides: ParkGuide[] }[];
};

// Operational details in guide articles must be checked separately from text edits.
export const PARK_GUIDE_NOTE = "混雑や所要時間は来園体験に基づく目安です。料金・整理券・運休などの利用条件は、来園当日の公式案内と現地の案内をご確認ください。";
