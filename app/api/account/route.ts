import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { accounts } from "@/db/schema";
import { accountPayload, cleanUsername, findAccount, jsonError } from "../_lib";

export async function GET(request: Request) {
  const username = cleanUsername(new URL(request.url).searchParams.get("username"));
  if (!username) return jsonError("请输入账号名");
  const account = await findAccount(username);
  if (!account) return jsonError("账号不存在", 404);
  return Response.json(await accountPayload(account));
}

export async function POST(request: Request) {
  const { username: rawUsername } = await request.json() as { username?: string };
  const username = cleanUsername(rawUsername);
  if (username.length < 2) return jsonError("账号名需要2—20个字符");
  const db = getDb();
  let account = await findAccount(username);
  let created = false;
  if (!account) {
    [account] = await db.insert(accounts).values({ username }).returning();
    created = true;
  } else {
    await db.update(accounts).set({ activeAt: new Date().toISOString() }).where(eq(accounts.id, account.id));
  }
  return Response.json({ ...(await accountPayload(account)), created });
}
