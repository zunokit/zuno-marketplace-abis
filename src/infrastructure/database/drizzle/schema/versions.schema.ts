import {
  pgTable,
  text,
  timestamp,
  varchar,
  boolean,
} from "drizzle-orm/pg-core";

export const apiVersions = pgTable("api_versions", {
  id: text("id").primaryKey(), // e.g., 'v1', '1.0'
  label: varchar("label", { length: 32 }).notNull(), // Human friendly label
  isCurrent: boolean("is_current").notNull().default(false),
  deprecated: boolean("deprecated").notNull().default(false),
  releasedAt: timestamp("released_at").notNull(),
  sunsetAt: timestamp("sunset_at"),
});

export type ApiVersion = typeof apiVersions.$inferSelect;
