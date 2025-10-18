import {
  pgTable,
  uuid,
  integer,
  varchar,
  boolean,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const networks = pgTable(
  "networks",
  {
    id: varchar("id", { length: 50 }).primaryKey(),

    chainId: integer("chain_id").unique().notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 100 }).unique().notNull(),

    type: varchar("type", { length: 50 }).notNull(), // local, mainnet, testnet
    isTestnet: boolean("is_testnet").default(false).notNull(),

    rpcUrls: varchar("rpc_urls", { length: 500 }).array().notNull(),
    explorerUrls: varchar("explorer_urls", { length: 500 }).array(),

    nativeCurrency: jsonb("native_currency")
      .$type<{
        name: string;
        symbol: string;
        decimals: number;
      }>()
      .notNull(),

    isActive: boolean("is_active").default(true).notNull(),
    icon: varchar("icon", { length: 500 }), // link icon

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    chainIdIdx: index("networks_chain_id_idx").on(table.chainId),
    slugIdx: index("networks_slug_idx").on(table.slug),
  })
);

export type Network = typeof networks.$inferSelect;
export type NewNetwork = typeof networks.$inferInsert;
