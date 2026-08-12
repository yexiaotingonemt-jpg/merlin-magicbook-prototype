import type { Metadata } from "next";
import { GameShell } from "./game-shell";

export const metadata: Metadata = {
  title: "梅林的魔法书 3.0 · 多人版",
  description: "支持账号续玩、排行榜与真实跨玩家投影的互动玩法原型。",
};

export default function Home() {
  return <GameShell />;
}
