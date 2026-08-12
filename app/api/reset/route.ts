import { eq, or } from "drizzle-orm";
import { getDb } from "@/db";
import { accounts, projections } from "@/db/schema";
import { cleanUsername, findAccount, jsonError } from "../_lib";

export async function POST(request: Request) {
  const { username: rawUsername } = await request.json() as { username?: string };
  const username = cleanUsername(rawUsername);
  if (!username) return jsonError("账号名不能为空");
  const account = await findAccount(username);
  if (!account) return jsonError("账号不存在", 404);

  const now = new Date().toISOString();
  const db = getDb();
  await db.batch([
    db.update(accounts).set({
      stateJson: "",
      score: 0,
      chapter: 1,
      updatedAt: now,
      activeAt: now,
    }).where(eq(accounts.id, account.id)),
    db.delete(projections).where(or(
      eq(projections.senderId, account.id),
      eq(projections.targetId, account.id),
    )),
  ]);

  return Response.json({ ok: true, updatedAt: now, score: 0, chapter: 1 });
}
