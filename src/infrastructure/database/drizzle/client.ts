import * as schema from "./schema";
import { env } from "@/shared/config/env";

import { drizzle } from "drizzle-orm/neon-http";
const databaseUrl =
  env.DATABASE_URL || "postgresql://dummy:dummy@localhost:5432/dummy";
export const db = drizzle(databaseUrl, { schema });
export type Database = typeof db;
