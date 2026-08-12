import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { accounts } from "@/db/schema";
import { cleanUsername, findAccount, GameState, jsonError, resolveMissingProjections } from "../_lib";

export async function POST(request: Request) {
  const payload = await request.json() as { username?: string; state?: GameState; actionFaction?: string | null };
  const username = cleanUsername(payload.username);
  if (!username || !payload.state || !Array.isArray(payload.state.board)) return jsonError("存档数据不完整");
  const account = await findAccount(username);
  if (!account) return jsonError("账号不存在", 404);
  await resolveMissingProjections(account.id, payload.state, payload.actionFaction ?? null);
  const now = new Date().toISOString();
  await getDb().update(accounts).set({
    stateJson: JSON.stringify(payload.state),
    score: Math.max(0, Math.floor(Number(payload.state.score ?? 0))),
    chapter: Math.max(1, Math.floor(Number(payload.state.chapter ?? 1))),
    updatedAt: now,
    activeAt: now,
  }).where(eq(accounts.id, account.id));
  return Response.json({ ok: true, updatedAt: now });
}
