import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "管理画面",
    template: "%s | Harmony Palette 管理画面",
  },
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminRootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
