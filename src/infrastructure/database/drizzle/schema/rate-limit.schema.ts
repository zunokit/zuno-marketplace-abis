import { pgTable, text, integer, bigint } from "drizzle-orm/pg-core";

// Better Auth rate limit storage table
export const rateLimit = pgTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull(),
  count: integer("count").notNull().default(0),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

export type RateLimit = typeof rateLimit.$inferSelect;
