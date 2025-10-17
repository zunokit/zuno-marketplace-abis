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
    addressNetworkIdx: index("contracts_address_network_idx").on(
      table.address,
      table.networkId
    ),
    abiIdIdx: index("contracts_abi_id_idx").on(table.abiId),
    addressNetworkUnique: unique("contracts_address_network_unique").on(
      table.address,
      table.networkId
    ),
  })
);

export type Contract = typeof contracts.$inferSelect;
export type NewContract = typeof contracts.$inferInsert;
