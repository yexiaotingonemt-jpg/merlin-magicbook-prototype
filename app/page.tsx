import type { Metadata } from "next";
import { GameShell } from "./game-shell";

export const metadata: Metadata = {
  title: "梅林的魔法书 · 法师塔",
  description: "包含探索、组卡、成长、PVE 与异步镜像 PVP 的可玩原型。",
};

export default function Home() {
  return <GameShell />;
}
