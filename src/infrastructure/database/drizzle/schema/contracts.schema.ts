import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  jsonb,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { networks } from "./networks.schema";
import { abis } from "./abis.schema";

export const contracts = pgTable(
  "contracts",
  {
    id: varchar("id", { length: 50 }).primaryKey(),

    address: varchar("address", { length: 42 }).notNull(),
    networkId: varchar("network_id", { length: 50 })
      .references(() => networks.id)
      .notNull(),

    // Contract MUST have ABI (cannot exist without ABI)
    abiId: varchar("abi_id", { length: 50 })
      .references(() => abis.id)
      .notNull(),

    name: varchar("name", { length: 255 }),
    type: varchar("type", { length: 50 }), // token, nft, defi, dao, etc.

    isVerified: boolean("is_verified").default(false).notNull(),
    verifiedAt: timestamp("verified_at"),
    verificationSource: varchar("verification_source", { length: 50 }), // etherscan, sourcify, manual

    metadata: jsonb("metadata").$type<{
      symbol?: string;
      totalSupply?: string;
      decimals?: number;
      isProxy?: boolean;
      implementation?: string;
    }>(),

    deployedAt: timestamp("deployed_at"),
    deployer: varchar("deployer", { length: 42 }),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    // Composite indexes for lookups
    addressNetworkIdx: index("contracts_address_network_idx").on(
      table.address,
      table.networkId
    ),
    abiIdIdx: index("contracts_abi_id_idx").on(table.abiId),
    addressNetworkUnique: unique("contracts_address_network_unique").on(
      table.address,
      table.networkId
    ),

    // Index for network filtering
    // Use case: Get all contracts on a specific network (e.g., Ethereum mainnet)
    // Query: SELECT * FROM contracts WHERE networkId = '1'
    networkIdIdx: index("contracts_network_id_idx").on(table.networkId),

    // Index for verification status filtering
    // Use case: Get only verified contracts (common filter in UI)
    // Query: SELECT * FROM contracts WHERE isVerified = true
    isVerifiedIdx: index("contracts_is_verified_idx").on(table.isVerified),

    // Composite index for verified contracts by network
    // Use case: Get verified contracts on a specific network (very common query)
    // Query: SELECT * FROM contracts WHERE networkId = ? AND isVerified = true
    networkVerifiedIdx: index("contracts_network_verified_idx").on(
      table.networkId,
      table.isVerified
    ),

    // Index for contract type filtering
    // Use case: Get all token contracts, NFT contracts, etc.
    // Query: SELECT * FROM contracts WHERE type = 'token'
    typeIdx: index("contracts_type_idx").on(table.type),

    // Index for contract name search
    // Use case: Search contracts by name (case-insensitive search support)
    // Query: SELECT * FROM contracts WHERE name ILIKE '%token%'
    nameIdx: index("contracts_name_idx").on(table.name),

    // Composite index for network + type filtering
    // Use case: Get all token contracts on Ethereum
    // Query: SELECT * FROM contracts WHERE networkId = ? AND type = 'token'
    networkTypeIdx: index("contracts_network_type_idx").on(table.networkId, table.type),
  })
);

export type Contract = typeof contracts.$inferSelect;
export type NewContract = typeof contracts.$inferInsert;
