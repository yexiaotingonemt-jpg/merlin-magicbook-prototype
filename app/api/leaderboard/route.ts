import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { accounts } from "@/db/schema";
import { ensureSchema, parseState } from "../_lib";

export async function GET() {
  await ensureSchema();
  const rows = await getDb().select({ username: accounts.username, score: accounts.score, chapter: accounts.chapter, activeAt: accounts.activeAt, stateJson: accounts.stateJson })
    .from(accounts).orderBy(desc(accounts.score), desc(accounts.chapter), desc(accounts.updatedAt)).limit(20);
  return Response.json({ leaderboard: rows.map((row, index) => {
    const state = parseState(row.stateJson);
    const spentStamina = Math.max(0, 150 - Math.floor(Number(state?.stamina ?? 150)));
    const scoreEfficiency = spentStamina > 0 ? row.score / spentStamina : null;
    return { rank: index + 1, username: row.username, chapter: row.chapter, spentStamina, score: row.score, scoreEfficiency, activeAt: row.activeAt };
  }) });
}
