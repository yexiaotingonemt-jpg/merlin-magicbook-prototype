import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { accounts, projections } from "@/db/schema";
import { cleanUsername, findAccount, jsonError, parseState } from "../_lib";

function createsMatch(board: Array<{ element: string }>, changedIndex: number) {
  const row = Math.floor(changedIndex / 4), col = changedIndex % 4, element = board[changedIndex]?.element;
  const sameRow = [0, 1, 2, 3].filter((offset) => board[row * 4 + offset]?.element === element).length;
  const sameColumn = [0, 1, 2].filter((offset) => board[offset * 4 + col]?.element === element).length;
  return sameRow >= 3 || sameColumn >= 3;
}

export async function POST(request: Request) {
  const payload = await request.json() as { username?: string; targetUsername?: string; faction?: "angel" | "demon"; element?: string; slot?: number };
  const username = cleanUsername(payload.username), targetUsername = cleanUsername(payload.targetUsername);
  if (!username || !targetUsername || username === targetUsername) return jsonError("请选择其他玩家");
  if (payload.faction !== "angel" && payload.faction !== "demon") return jsonError("当前没有可用形态");
  const slot = Math.max(0, Math.min(3, Math.floor(Number(payload.slot ?? 0))));
  const sender = await findAccount(username), target = await findAccount(targetUsername);
  if (!sender || !target) return jsonError("目标玩家不存在", 404);
  const senderState = parseState(sender.stateJson), targetState = parseState(target.stateJson);
  if (!senderState || !targetState?.board?.[8 + slot]) return jsonError("玩家棋盘尚未就绪");
  if (Number(senderState.projection ?? 0) <= 0) return jsonError("当前没有投影机会");
  const db = getDb(), event = targetState.board[8 + slot];
  senderState.projection = Number(senderState.projection ?? 0) - 1;
  const [task] = await db.insert(projections).values({ senderId: sender.id, targetId: target.id, faction: payload.faction, element: payload.element ?? null, targetEventId: event.id }).returning();
  if (payload.faction === "angel") {
    event.element = ["wind", "thunder", "fire", "electric"].includes(payload.element ?? "") ? payload.element! : "wind";
    event.remoteProjection = { id: task.id, faction: "angel", sender: username, visible: true };
  } else {
    const delta = Math.max(1, Math.floor(event.maxHp * .25));
    event.maxHp += delta; event.hp += delta;
    event.remoteProjection = { id: task.id, faction: "demon", sender: username, visible: false };
  }
  let immediateSuccess = false;
  if (payload.faction === "angel" && createsMatch(targetState.board, 8 + slot)) {
    immediateSuccess = true; senderState.boosted = true; senderState.socialContribution = Number(senderState.socialContribution ?? 0) + 50;
    await db.update(projections).set({ status: "success", resolvedAt: new Date().toISOString() }).where(eq(projections.id, task.id));
  }
  const now = new Date().toISOString();
  await db.batch([
    db.update(accounts).set({ stateJson: JSON.stringify(senderState), updatedAt: now, activeAt: now }).where(eq(accounts.id, sender.id)),
    db.update(accounts).set({ stateJson: JSON.stringify(targetState), updatedAt: now }).where(eq(accounts.id, target.id)),
  ]);
  return Response.json({ ok: true, immediateSuccess, senderState, message: payload.faction === "angel" ? "天使投影已公开送达" : "恶魔投影已隐藏送达" });
}
