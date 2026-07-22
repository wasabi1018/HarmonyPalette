import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/placeholder-page";
export const metadata: Metadata = { title: "最新記事", description: "ハーモニーランドのおでかけ準備や楽しみ方を紹介する記事ページです。", alternates: { canonical: "/articles" } };
export default function ArticlesPage() { return <PlaceholderPage kind="articles" />; }
