import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/placeholder-page";
export const metadata: Metadata = { title: "初めての方へガイド", description: "チケット、アクセス、駐車場、子ども連れの回り方など、初めてのハーモニーランドに役立つ情報です。", alternates: { canonical: "/guide" } };
export default function GuidePage() { return <PlaceholderPage kind="guide" />; }
