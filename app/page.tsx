"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [source, setSource] = useState("/prototype/index.html");

  useEffect(() => {
    setSource(`/prototype/index.html${window.location.search}`);
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
