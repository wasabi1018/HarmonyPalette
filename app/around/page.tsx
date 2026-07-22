import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/placeholder-page";
export const metadata: Metadata = { title: "周辺ホテル・観光情報", description: "ハーモニーランド周辺のホテル、温泉、観光、グルメ情報を整理して紹介します。", alternates: { canonical: "/around" } };
export default function AroundPage() { return <PlaceholderPage kind="around" />; }
