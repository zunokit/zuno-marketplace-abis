import {
  pgTable,
  uuid,
  text,
  varchar,
  jsonb,
  boolean,
  timestamp,
  integer,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { user } from "./auth.schema";

export const abis = pgTable(
  "abis",
  {
    id: varchar("id", { length: 50 }).primaryKey(),

    // Owner (via Better Auth user)
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    // Basic info
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    contractName: varchar("contract_name", { length: 255 }),

    // ABI content
    abi: jsonb("abi").notNull(),
    abiHash: varchar("abi_hash", { length: 64 }).unique().notNull(),

    // IPFS backup
    ipfsHash: varchar("ipfs_hash", { length: 100 }),
    ipfsUrl: varchar("ipfs_url", { length: 500 }),

    // Version
    version: varchar("version", { length: 50 }).default("1.0.0").notNull(),

    // Categorization
    tags: varchar("tags", { length: 50 }).array().default([]),
    standard: varchar("standard", { length: 50 }), // ERC20, ERC721, ERC1155, etc.

    // Metadata
    metadata: jsonb("metadata").$type<{
      // Optional: Network where ABI was discovered (informational only)
      originNetwork?: string; // 'ethereum', 'polygon', etc.
      // Networks where ABI has been tested/verified
      compatibleNetworks?: string[]; // ['ethereum', 'polygon', 'bsc']

      compiler?: string;
      compilerVersion?: string;
      license?: string;
      sourceUrl?: string;
      bytecode?: string;
    }>(),

    // Soft delete
    isDeleted: boolean("is_deleted").default(false).notNull(),
    deletedAt: timestamp("deleted_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    // Single column indexes for filtering
    userIdIdx: index("abis_user_id_idx").on(table.userId),
    abiHashIdx: index("abis_abi_hash_idx").on(table.abiHash),
    nameIdx: index("abis_name_idx").on(table.name),
    standardIdx: index("abis_standard_idx").on(table.standard),
    createdAtIdx: index("abis_created_at_idx").on(table.createdAt),

    // Index for soft delete filtering (very common query pattern)
    // Use case: WHERE isDeleted = false (99% of queries exclude deleted records)
    // Without this index, every query does full table scan to filter deleted records
    isDeletedIdx: index("abis_is_deleted_idx").on(table.isDeleted),

    // Composite index for user's active ABIs
    // Use case: Get user's non-deleted ABIs (common in list/search operations)
    // Query: SELECT * FROM abis WHERE userId = ? AND isDeleted = false
    userNotDeletedIdx: index("abis_user_not_deleted_idx").on(table.userId, table.isDeleted),

    // Index for contract name search
    // Use case: Search ABIs by contract name (case-insensitive search support)
    contractNameIdx: index("abis_contract_name_idx").on(table.contractName),

    // Composite index for standard filtering with soft delete
    // Use case: Get all ERC20 ABIs that aren't deleted
    // Query: SELECT * FROM abis WHERE standard = 'ERC20' AND isDeleted = false
    standardNotDeletedIdx: index("abis_standard_not_deleted_idx").on(
      table.standard,
      table.isDeleted
    ),
  })
);

export const abiVersions = pgTable(
  "abi_versions",
  {
    id: varchar("id", { length: 50 }).primaryKey(),
    abiId: varchar("abi_id", { length: 50 })
      .references(() => abis.id, { onDelete: "cascade" })
      .notNull(),

    version: varchar("version", { length: 50 }).notNull(),
    versionNumber: integer("version_number").notNull(),

    abi: jsonb("abi").notNull(),
    abiHash: varchar("abi_hash", { length: 64 }).notNull(),

    ipfsHash: varchar("ipfs_hash", { length: 100 }),
    ipfsUrl: varchar("ipfs_url", { length: 500 }),

    changeLog: text("change_log"),

    metadata: jsonb("metadata").$type<{
      breaking?: boolean;
      deprecated?: boolean;
    }>(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    abiIdIdx: index("abi_versions_abi_id_idx").on(table.abiId),
    versionIdx: index("abi_versions_version_idx").on(
      table.abiId,
      table.versionNumber
    ),
    uniqueVersion: unique("abi_versions_unique_version").on(
      table.abiId,
      table.versionNumber
    ),
  })
);

export type Abi = typeof abis.$inferSelect;
export type NewAbi = typeof abis.$inferInsert;
export type AbiVersion = typeof abiVersions.$inferSelect;
export type NewAbiVersion = typeof abiVersions.$inferInsert;