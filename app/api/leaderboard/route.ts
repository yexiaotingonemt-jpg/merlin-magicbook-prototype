import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { accounts } from "@/db/schema";
import { ensureSchema } from "../_lib";

export async function GET() {
  await ensureSchema();
  const rows = await getDb().select({ username: accounts.username, score: accounts.score, chapter: accounts.chapter, activeAt: accounts.activeAt })
    .from(accounts).orderBy(desc(accounts.score), desc(accounts.chapter), desc(accounts.updatedAt)).limit(20);
  return Response.json({ leaderboard: rows.map((row, index) => ({ rank: index + 1, ...row })) });
}
