"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

type GameEvent = { id: number; element: string; hp: number; maxHp: number; kindLabel?: string };
type GameState = {
  score?: number; stamina?: number; chapter?: number; form?: "angel" | "demon" | null; projection?: number;
  boosted?: boolean; socialContribution?: number; board?: GameEvent[]; [key: string]: unknown;
};
type Leader = { rank: number; username: string; score: number; chapter: number; activeAt: string };
type Player = { username: string; score: number; chapter: number; activeAt: string; firstRow: GameEvent[] };
type AccountResponse = { username: string; state: GameState | null; updatedAt: string; created?: boolean };

const elementMeta: Record<string, { label: string; icon: string }> = {
  wind: { label: "风", icon: "〰" }, thunder: { label: "雷", icon: "ϟ" },
  fire: { label: "火", icon: "♨" }, electric: { label: "电", icon: "✳" },
};

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const body = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(body.error || "请求失败");
  return body;
}

export function GameShell() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const serverVersion = useRef("");
  const [usernameInput, setUsernameInput] = useState("");
  const [username, setUsername] = useState("");
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [notice, setNotice] = useState("");
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [target, setTarget] = useState("");
  const [slot, setSlot] = useState(0);
  const [element, setElement] = useState("wind");
  const [sending, setSending] = useState(false);
  const [projectionOpen, setProjectionOpen] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const iframeReady = useRef(false);
  const pendingGameLoad = useRef<{ type: string; state: GameState | null } | null>(null);
  const previousProjection = useRef(0);

  const flash = useCallback((text: string) => {
    setNotice(text); window.setTimeout(() => setNotice(""), 2600);
  }, []);

  const sendToGame = useCallback((type: string, state?: GameState | null) => {
    iframeRef.current?.contentWindow?.postMessage({ type, state }, "*");
  }, []);

  const acceptGameState = useCallback((next: GameState | null, autoOpen = true) => {
    const opportunities = Number(next?.projection ?? 0);
    if (autoOpen && opportunities > previousProjection.current && next?.form) setProjectionOpen(true);
    if (opportunities <= 0) setProjectionOpen(false);
    previousProjection.current = opportunities;
    setGameState(next);
  }, []);

  const loadSocial = useCallback(async (name: string) => {
    const [rankData, playerData] = await Promise.all([
      api<{ leaderboard: Leader[] }>("/api/leaderboard"),
      api<{ players: Player[] }>(`/api/players?username=${encodeURIComponent(name)}`),
    ]);
    setLeaders(rankData.leaderboard); setPlayers(playerData.players);
    setTarget((current) => current && playerData.players.some((p) => p.username === current) ? current : playerData.players[0]?.username ?? "");
  }, []);

  const submitLogin = async (event: FormEvent) => {
    event.preventDefault(); setLoginBusy(true); setLoginError("");
    try {
      const data = await api<AccountResponse>("/api/account", { method: "POST", body: JSON.stringify({ username: usernameInput }) });
      setUsername(data.username); acceptGameState(data.state); serverVersion.current = data.updatedAt;
      sessionStorage.setItem("merlin-account", data.username);
      pendingGameLoad.current = { type: data.state ? "merlin:load" : "merlin:new", state: data.state };
      if (iframeReady.current) {
        sendToGame(pendingGameLoad.current.type, pendingGameLoad.current.state);
        pendingGameLoad.current = null;
      }
      await loadSocial(data.username);
      flash(data.created ? `已创建账号「${data.username}」` : `欢迎回来，已恢复「${data.username}」的进度`);
    } catch (error) { setLoginError(error instanceof Error ? error.message : "无法进入游戏"); }
    finally { setLoginBusy(false); }
  };

  useEffect(() => {
    const saved = sessionStorage.getItem("merlin-account"); if (saved) window.setTimeout(() => setUsernameInput(saved), 0);
    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow || !event.data?.type) return;
      if (event.data.type === "merlin:ready") {
        iframeReady.current = true;
        if (pendingGameLoad.current) {
          sendToGame(pendingGameLoad.current.type, pendingGameLoad.current.state);
          pendingGameLoad.current = null;
        } else if (username) sendToGame(gameState ? "merlin:load" : "merlin:new", gameState);
      }
      if (event.data.type === "merlin:state" && username) {
        const next = event.data.state as GameState; acceptGameState(next);
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(async () => {
          try {
            const result = await api<{ updatedAt: string }>("/api/state", { method: "POST", body: JSON.stringify({ username, state: next, actionFaction: event.data.actionFaction ?? null }) });
            serverVersion.current = result.updatedAt;
          } catch { flash("自动存档失败，将在下次操作重试"); }
        }, 260);
      }
      if (event.data.type === "merlin:notice") flash(String(event.data.message ?? "收到跨玩家技能"));
    };
    window.addEventListener("message", onMessage); return () => window.removeEventListener("message", onMessage);
  }, [username, gameState, sendToGame, flash, acceptGameState]);

  useEffect(() => {
    if (!username) return;
    const poll = window.setInterval(async () => {
      try {
        const data = await api<AccountResponse>(`/api/account?username=${encodeURIComponent(username)}`);
        if (data.updatedAt > serverVersion.current && data.state) {
          serverVersion.current = data.updatedAt; acceptGameState(data.state); sendToGame("merlin:load-remote", data.state);
          flash("收到其他玩家的投影，棋盘已同步");
        }
        await loadSocial(username);
      } catch { /* 网络恢复后自动继续轮询 */ }
    }, 6000);
    return () => window.clearInterval(poll);
  }, [username, sendToGame, loadSocial, flash, acceptGameState]);

  useEffect(() => {
    if (!projectionOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !sending) setProjectionOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [projectionOpen, sending]);

  const sendProjection = async () => {
    if (!gameState?.form || !target) return;
    setSending(true);
    try {
      const result = await api<{ message: string; senderState: GameState; immediateSuccess: boolean }>("/api/projection", {
        method: "POST", body: JSON.stringify({ username, targetUsername: target, faction: gameState.form, element, slot }),
      });
      acceptGameState(result.senderState, false); sendToGame("merlin:load", result.senderState); flash(result.message + (result.immediateSuccess ? "，任务已立即完成" : ""));
      setProjectionOpen(false);
      await loadSocial(username);
    } catch (error) { flash(error instanceof Error ? error.message : "投影失败"); }
    finally { setSending(false); }
  };

  const resetGame = async () => {
    if (!username || resetBusy) return;
    setResetBusy(true);
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }
    try {
      const result = await api<{ updatedAt: string }>("/api/reset", {
        method: "POST", body: JSON.stringify({ username }),
      });
      serverVersion.current = result.updatedAt;
      previousProjection.current = 0;
      setGameState(null); setProjectionOpen(false); setResetConfirm(false);
      sendToGame("merlin:new", null);
      await loadSocial(username);
      flash("游戏已重新开始，排行榜积分已清零");
    } catch (error) { flash(error instanceof Error ? error.message : "重置失败"); }
    finally { setResetBusy(false); }
  };

  const selectedPlayer = players.find((player) => player.username === target);
  const canProject = Boolean(gameState?.form && Number(gameState.projection ?? 0) > 0 && selectedPlayer);
  const currentChapter = Math.max(1, Number(gameState?.chapter ?? 1));
  const spentStamina = Math.max(0, 150 - Number(gameState?.stamina ?? 150));
  const totalScore = Math.max(0, Math.floor(Number(gameState?.score ?? 0)));
  const scoreEfficiency = spentStamina > 0 ? (totalScore / spentStamina).toFixed(1) : "—";

  return <main className="multiplayer-shell">
    <iframe ref={iframeRef} className="game-frame" src="/game.html" title="梅林的魔法书游戏" />

    {!username && <div className="login-gate">
      <form className="login-book" onSubmit={submitLogin}>
        <div className="login-rune">✦</div><p className="eyebrow">MERLIN ARCHIVE</p>
        <h1>开启魔法书</h1><p>输入账号开始游戏。已有账号将恢复上次进度，不存在的账号会自动创建。</p>
        <label htmlFor="account">账号名称</label>
        <input id="account" value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)} minLength={2} maxLength={20} placeholder="请输入2—20个字符" />
        {loginError && <div className="login-error">{loginError}</div>}
        <button disabled={loginBusy || usernameInput.trim().length < 2}>{loginBusy ? "正在读取魔法书…" : "进入游戏"}</button>
        <small>原型账号暂不设置密码，请勿使用真实敏感账号名。</small>
      </form>
    </div>}

    {username && <aside className="social-dock" aria-label="多人功能">
      <div className="dock-header"><span className="online-dot" />账号 <strong>{username}</strong><button className="reset-entry" onClick={() => setResetConfirm(true)}>重新开始</button></div>
      <div className="rank-heading"><div><strong>排行榜</strong><span>本次活动表现</span></div>{Number(gameState?.projection ?? 0) > 0 && <button className="projection-entry" onClick={() => setProjectionOpen(true)}>投影 ×{Number(gameState?.projection ?? 0)}</button>}</div>
      <div className="rank-dashboard" aria-label="个人排行数据">
        <div><span>当前章节</span><strong>第{currentChapter}章</strong></div>
        <div><span>消耗体力</span><strong>{spentStamina}</strong></div>
        <div><span>总积分</span><strong>{totalScore.toLocaleString("zh-CN")}</strong></div>
        <div><span>积分性价比</span><strong>{scoreEfficiency}<small>{spentStamina > 0 ? " 分/体力" : ""}</small></strong></div>
      </div>
      <div className="rank-list">
        {leaders.map((item) => <div className={`rank-row rank-${item.rank}`} key={item.username}>
          <b>{item.rank}</b><span>{item.username}</span><em>第{item.chapter}章</em><strong>{item.score.toLocaleString("zh-CN")}</strong>
        </div>)}
        {!leaders.length && <p className="empty-copy">暂无排行记录</p>}
      </div>
    </aside>}
    {projectionOpen && username && <div className={`projection-gate ${gameState?.form === "demon" ? "is-demon" : "is-angel"}`} role="dialog" aria-modal="true" aria-labelledby="projection-title">
      <section className="projection-card">
        <button className="projection-close" aria-label="暂时关闭跨玩家投影" onClick={() => setProjectionOpen(false)} disabled={sending}>×</button>
        <div className="projection-emblem" aria-hidden="true">{gameState?.form === "demon" ? "♠" : "✦"}</div>
        <p className="projection-kicker">投影机会已激活</p>
        <h2 id="projection-title">{gameState?.form === "angel" ? "天使协助" : "恶魔干扰"}</h2>
        <div className="projection-summary"><span>{gameState?.form === "angel" ? "选择一位玩家，为其第一排施加公开圣印" : "选择一位玩家，暗中强化其第一排事件"}</span><strong>剩余 {Number(gameState?.projection ?? 0)}</strong></div>
        <div className="projection-tool">
        <label htmlFor="projection-player">目标玩家</label>
        <select id="projection-player" value={target} onChange={(e) => { setTarget(e.target.value); setSlot(0); }}>
          {players.map((player) => <option key={player.username} value={player.username}>{player.username} · 第{player.chapter}章 · {player.score}分</option>)}
        </select>
        {gameState?.form === "angel" && <><div className="field-label">净化属性</div><div className="element-choices">
          {Object.entries(elementMeta).map(([key, value]) => <button className={element === key ? "active" : ""} onClick={() => setElement(key)} key={key}>{value.icon}{value.label}</button>)}
        </div></>}
        <div className="field-label">对方第一排</div>
        <div className="remote-row">
          {(selectedPlayer?.firstRow ?? []).map((event, index) => <button className={slot === index ? "active" : ""} onClick={() => setSlot(index)} key={event.id}>
            <span>{elementMeta[event.element]?.icon ?? "✦"}</span><b>{elementMeta[event.element]?.label ?? "?"}</b><small>生命{event.hp}</small>
          </button>)}
        </div>
        <p className="projection-rule">{gameState?.form === "angel" ? "目标公开；目标通过净化共鸣消除则任务成功。" : gameState?.form === "demon" ? "目标对敌方隐藏；强化事件被恶魔卡直接击杀则任务成功。" : "光暗进度达到±100后才能跨玩家投影。"}</p>
        <button className="project-button" disabled={!canProject || sending} onClick={sendProjection}>{sending ? "正在投影…" : "发动投影"}</button>
        {!selectedPlayer && <p className="projection-empty">当前没有其他活跃玩家，投影机会将保留。</p>}
        </div>
      </section>
    </div>}
    {resetConfirm && <div className="confirm-gate" role="dialog" aria-modal="true" aria-labelledby="reset-title">
      <div className="confirm-card">
        <div className="confirm-icon">↻</div><h2 id="reset-title">重新开始游戏？</h2>
        <p>当前棋盘、手牌、章节、积分和投影记录都会清空，账号将保留。排行榜积分会立即变为0。</p>
        <div className="confirm-actions"><button onClick={() => setResetConfirm(false)} disabled={resetBusy}>取消</button><button className="danger" onClick={resetGame} disabled={resetBusy}>{resetBusy ? "正在重置…" : "确认重新开始"}</button></div>
      </div>
    </div>}
    {notice && <div className="multiplayer-toast">{notice}</div>}
  </main>;
}
