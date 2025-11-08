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
    // Single column indexes for filtering
    userIdIdx: index("audit_logs_user_id_idx").on(table.userId),
    apiKeyIdIdx: index("audit_logs_api_key_id_idx").on(table.apiKeyId),
    actionIdx: index("audit_logs_action_idx").on(table.action),
    createdAtIdx: index("audit_logs_created_at_idx").on(table.createdAt),

    // Composite index for API analytics and monitoring
    // Use case: GROUP BY method, path to see API usage patterns
    // Query: SELECT method, path, COUNT(*) FROM audit_logs GROUP BY method, path
    methodPathIdx: index("audit_logs_method_path_idx").on(table.method, table.path),

    // Composite index for date-range queries with user filtering
    // Use case: Get user's recent actions (common in admin UI)
    // Query: SELECT * FROM audit_logs WHERE userId = ? AND createdAt > ? ORDER BY createdAt DESC
    userCreatedAtIdx: index("audit_logs_user_created_at_idx").on(
      table.userId,
      table.createdAt
    ),

    // Index for resource tracking
    // Use case: Get all actions for a specific resource (e.g., audit trail for an ABI)
    // Query: SELECT * FROM audit_logs WHERE resourceType = 'abi' AND resourceId = ?
    resourceIdx: index("audit_logs_resource_idx").on(table.resourceType, table.resourceId),
  })
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;