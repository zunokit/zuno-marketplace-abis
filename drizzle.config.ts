import { type Config } from "drizzle-kit";
import { env } from "@/shared/config/env";

export default {
  schema: "./src/infrastructure/database/drizzle/schema/index.ts",
  out: "./src/infrastructure/database/drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
} satisfies Config;