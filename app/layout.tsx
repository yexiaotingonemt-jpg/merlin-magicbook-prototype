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
    description: "体验光暗卡牌、事件掉落、元素共鸣与危机事件的手机竖屏玩法原型。",
    openGraph: {
      title: "梅林的魔法书",
      description: "光暗共鸣 · 可玩原型",
      images: [`${origin}/og.png`],
    },
    twitter: {
      card: "summary_large_image",
      title: "梅林的魔法书",
      description: "光暗共鸣 · 可玩原型",
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
