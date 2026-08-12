import { and, desc, eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "@/db";
import { accounts, projections } from "@/db/schema";

export type GameEvent = {
  id: number;
  element: string;
  hp: number;
  maxHp: number;
  kindLabel?: string;
  remoteProjection?: { id: number; faction: "angel" | "demon"; sender: string; visible: boolean };
};

export type GameState = {
  score?: number;
  chapter?: number;
  projection?: number;
  boosted?: boolean;
  socialContribution?: number;
  board?: GameEvent[];
  [key: string]: unknown;
};

export function cleanUsername(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, 20);
}

export function parseState(value: string): GameState | null {
  if (!value) return null;
  try { return JSON.parse(value) as GameState; } catch { return null; }
}

let schemaReady: Promise<void> | null = null;
export function ensureSchema() {
  if (!schemaReady) schemaReady = env.DB.batch([
    env.DB.prepare("CREATE TABLE IF NOT EXISTS accounts (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, username TEXT NOT NULL UNIQUE, state_json TEXT NOT NULL DEFAULT '', score INTEGER NOT NULL DEFAULT 0, chapter INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, active_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS projections (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, sender_id INTEGER NOT NULL, target_id INTEGER NOT NULL, faction TEXT NOT NULL, element TEXT, target_event_id INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, resolved_at TEXT)"),
  ]).then(() => undefined);
  return schemaReady;
}

export async function findAccount(username: string) {
  await ensureSchema();
  const db = getDb();
  const [account] = await db.select().from(accounts).where(eq(accounts.username, username)).limit(1);
  return account;
}

export async function accountPayload(account: typeof accounts.$inferSelect) {
  const db = getDb();
  const recent = await db.select({
    id: projections.id,
    faction: projections.faction,
    status: projections.status,
    targetId: projections.targetId,
  }).from(projections).where(eq(projections.senderId, account.id)).orderBy(desc(projections.id)).limit(6);
  const targets = await db.select({ id: accounts.id, username: accounts.username }).from(accounts);
  const names = new Map(targets.map((row) => [row.id, row.username]));
  return {
    username: account.username,
    state: parseState(account.stateJson),
    updatedAt: account.updatedAt,
    projections: recent.map((item) => ({ ...item, targetUsername: names.get(item.targetId) ?? "未知玩家" })),
  };
}

export async function resolveMissingProjections(accountId: number, state: GameState, actionFaction: string | null) {
  const db = getDb();
  const active = await db.select().from(projections).where(and(eq(projections.targetId, accountId), eq(projections.status, "active")));
  const preview = Array.isArray(state.preview) ? state.preview as GameEvent[] : [];
  const eventIds = new Set([...(state.board ?? []), ...preview].map((event) => event.id));
  for (const task of active) {
    if (eventIds.has(task.targetEventId)) continue;
    const success = task.faction === "angel" ? actionFaction === "angel" : actionFaction === "demon";
    await db.update(projections).set({ status: success ? "success" : "failed", resolvedAt: new Date().toISOString() }).where(eq(projections.id, task.id));
    if (!success) continue;
    const [sender] = await db.select().from(accounts).where(eq(accounts.id, task.senderId)).limit(1);
    if (!sender) continue;
    const senderState = parseState(sender.stateJson);
    if (!senderState) continue;
    senderState.boosted = true;
    senderState.socialContribution = Number(senderState.socialContribution ?? 0) + 50;
    await db.update(accounts).set({
      stateJson: JSON.stringify(senderState),
      score: Math.floor(Number(senderState.score ?? 0)),
      chapter: Math.max(1, Math.floor(Number(senderState.chapter ?? 1))),
      updatedAt: new Date().toISOString(),
    }).where(eq(accounts.id, sender.id));
  }
}

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}
