import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { user, apiKey } from "./auth.schema";

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Can be from session or API key
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    apiKeyId: text("api_key_id").references(() => apiKey.id, {
      onDelete: "set null",
    }),

    method: varchar("method", { length: 10 }).notNull(), // GET, POST, PUT, DELETE
    path: varchar("path", { length: 500 }).notNull(),
    action: varchar("action", { length: 100 }).notNull(), // CREATE_ABI, UPDATE_ABI, DELETE_ABI

    ipAddress: varchar("ip_address", { length: 45 }), // IPv4 or IPv6
    userAgent: varchar("user_agent", { length: 500 }),

    resourceType: varchar("resource_type", { length: 50 }), // abi, contract, network
    resourceId: uuid("resource_id"),

    statusCode: integer("status_code").notNull(),
    duration: integer("duration"), // milliseconds

    metadata: jsonb("metadata").$type<{
      error?: string;
      requestBody?: Record<string, unknown>;
      responseSize?: number;
    }>(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("audit_logs_user_id_idx").on(table.userId),
    apiKeyIdIdx: index("audit_logs_api_key_id_idx").on(table.apiKeyId),
    actionIdx: index("audit_logs_action_idx").on(table.action),
    createdAtIdx: index("audit_logs_created_at_idx").on(table.createdAt),
  })
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;