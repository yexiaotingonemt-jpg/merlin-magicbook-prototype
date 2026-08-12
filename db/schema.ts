import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const accounts = sqliteTable("accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  stateJson: text("state_json").notNull().default(""),
  score: integer("score").notNull().default(0),
  chapter: integer("chapter").notNull().default(1),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  activeAt: text("active_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const projections = sqliteTable("projections", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  senderId: integer("sender_id").notNull(),
  targetId: integer("target_id").notNull(),
  faction: text("faction").notNull(),
  element: text("element"),
  targetEventId: integer("target_event_id").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  resolvedAt: text("resolved_at"),
});
