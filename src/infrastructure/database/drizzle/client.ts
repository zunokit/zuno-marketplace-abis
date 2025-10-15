import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import * as schema from "./schema";
import { env } from "@/shared/config/env";

// Create connection pool
const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

// Create Drizzle database instance with schema
export const db = drizzle(pool, { schema });

// Export types for use in repositories
export type Database = typeof db;