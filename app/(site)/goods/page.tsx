import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/placeholder-page";
export const metadata: Metadata = { title: "新商品・グッズ情報", description: "ハーモニーランドの新商品・グッズ情報を整理して紹介します。", alternates: { canonical: "/goods" } };
export default function GoodsPage() { return <PlaceholderPage kind="goods" />; }
