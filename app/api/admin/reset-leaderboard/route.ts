import { getDb } from "@/db";
import { accounts, projections } from "@/db/schema";
import { cleanUsername, ensureSchema, jsonError } from "../../_lib";

export async function POST(request: Request) {
  const { username: rawUsername } = await request.json() as { username?: string };
  const username = cleanUsername(rawUsername);
  if (username !== "ting") return jsonError("仅管理员可以重置排行榜", 403);

  await ensureSchema();
  const now = new Date().toISOString();
  const db = getDb();
  await db.batch([
    db.update(accounts).set({ stateJson: "", score: 0, chapter: 1, updatedAt: now, activeAt: now }),
    db.delete(projections),
  ]);

  return Response.json({ ok: true, updatedAt: now });
}
