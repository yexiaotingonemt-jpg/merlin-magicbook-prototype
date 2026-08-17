import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "梅林的魔法书 · 法师塔",
  description: "探索法师塔、编排元素与魔法书、在随机翻页中自动施法。",
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
