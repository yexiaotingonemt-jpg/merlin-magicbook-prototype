import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "梅林的魔法书 3.0 · 多人版",
  description: "账号续玩、排行榜与跨玩家投影互动原型。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
