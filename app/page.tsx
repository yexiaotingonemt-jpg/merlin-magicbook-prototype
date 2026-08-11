"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [source, setSource] = useState("/prototype/index.html?hand=paired");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("hand")) params.set("hand", "paired");
    setSource(`/prototype/index.html?${params.toString()}`);
  }, []);

  return (
    <main className="game-shell">
      <iframe
        key={source}
        className="game-frame"
        src={source}
        title="梅林的魔法书可玩原型"
        allow="fullscreen"
      />
    </main>
  );
}
