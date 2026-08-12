import { desc, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { accounts } from "@/db/schema";
import { cleanUsername, ensureSchema, parseState } from "../_lib";

export async function GET(request: Request) {
  await ensureSchema();
  const username = cleanUsername(new URL(request.url).searchParams.get("username"));
  const rows = await getDb().select().from(accounts).where(ne(accounts.username, username)).orderBy(desc(accounts.activeAt)).limit(20);
  return Response.json({ players: rows.map((row) => {
    const state = parseState(row.stateJson);
    return { username: row.username, score: row.score, chapter: row.chapter, activeAt: row.activeAt, firstRow: state?.board?.slice(8, 12) ?? [] };
  }) });
}
