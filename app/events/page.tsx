import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/placeholder-page";
export const metadata: Metadata = { title: "イベント一覧", description: "ハーモニーランドのイベント情報を整理して紹介します。", alternates: { canonical: "/events" } };
export default function EventsPage() { return <PlaceholderPage kind="events" />; }
