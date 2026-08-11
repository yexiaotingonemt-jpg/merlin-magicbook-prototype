import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const origin = `${protocol}://${host}`;

  return {
    title: "梅林的魔法书 · 可玩原型",
    description: "体验固定一光一暗的双手牌、事件掉落、元素共鸣与光暗变身玩法。",
    openGraph: {
      title: "梅林的魔法书",
      description: "固定一光一暗双手牌 · 可玩原型",
      images: [`${origin}/og.png`],
    },
    twitter: {
      card: "summary_large_image",
      title: "梅林的魔法书",
      description: "固定一光一暗双手牌 · 可玩原型",
      images: [`${origin}/og.png`],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
