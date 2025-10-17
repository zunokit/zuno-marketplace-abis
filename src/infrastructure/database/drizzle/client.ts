import * as schema from "./schema";
import { env } from "@/shared/config/env";

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/neon-http';

export const db = drizzle(env.DATABASE_URL!, { schema });
export type Database = typeof db;
