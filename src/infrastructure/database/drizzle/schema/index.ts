// Export all schemas
export * from "./auth.schema";
export * from "./networks.schema";
export * from "./abis.schema";
export * from "./contracts.schema";
export * from "./audit-logs.schema";
export * from "./versions.schema";
export * from "./rate-limit.schema";

// Export relations for Drizzle queries
import { relations } from "drizzle-orm";
import { user, session, account, verification, apiKey } from "./auth.schema";
import { networks } from "./networks.schema";
import { abis, abiVersions } from "./abis.schema";
import { contracts } from "./contracts.schema";
import { auditLogs } from "./audit-logs.schema";

// User relations
export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  apiKeys: many(apiKey),
  abis: many(abis),
  auditLogs: many(auditLogs),
}));

// Session relations
export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

// Account relations
export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

// API Key relations
export const apiKeyRelations = relations(apiKey, ({ one, many }) => ({
  user: one(user, {
    fields: [apiKey.userId],
    references: [user.id],
  }),
  auditLogs: many(auditLogs),
}));

// ABI relations
export const abiRelations = relations(abis, ({ one, many }) => ({
  user: one(user, {
    fields: [abis.userId],
    references: [user.id],
  }),
  versions: many(abiVersions),
  contracts: many(contracts),
}));

// ABI Version relations
export const abiVersionRelations = relations(abiVersions, ({ one }) => ({
  abi: one(abis, {
    fields: [abiVersions.abiId],
    references: [abis.id],
  }),
}));

// Network relations
export const networkRelations = relations(networks, ({ many }) => ({
  contracts: many(contracts),
}));

// Contract relations
export const contractRelations = relations(contracts, ({ one }) => ({
  network: one(networks, {
    fields: [contracts.networkId],
    references: [networks.id],
  }),
  abi: one(abis, {
    fields: [contracts.abiId],
    references: [abis.id],
  }),
}));

// Audit Log relations
export const auditLogRelations = relations(auditLogs, ({ one }) => ({
  user: one(user, {
    fields: [auditLogs.userId],
    references: [user.id],
  }),
  apiKey: one(apiKey, {
    fields: [auditLogs.apiKeyId],
    references: [apiKey.id],
  }),
}));
