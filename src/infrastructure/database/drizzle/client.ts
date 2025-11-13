/**
 * Database Client with Connection Pooling
 *
 * Uses Drizzle ORM with Neon serverless driver.
 * Neon handles connection pooling at the infrastructure level,
 * but we configure optimal settings for our use case.
 *
 * Connection Pooling Strategy:
 * - Neon uses HTTP-based connections (serverless-friendly)
 * - Automatic connection pooling managed by Neon
 * - Configurable via DATABASE_URL connection string parameters
 * - No manual pool management needed
 *
 * Optimal Configuration (via DATABASE_URL):
 * postgresql://user:pass@host/db?sslmode=require&connect_timeout=10&pool_timeout=10
 *
 * @module DatabaseClient
 */

import * as schema from "./schema";
import { env } from "@/shared/config/env";
import { appConfig } from "@/shared/config/app.config";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";
import { logger } from "@/shared/lib/utils/logger";

/**
 * Build database URL with connection pool parameters
 */
function buildDatabaseUrl(): string {
  const baseUrl = env.DATABASE_URL || "postgresql://dummy:dummy@localhost:5432/dummy";

  // If URL already has parameters, don't modify
  if (baseUrl.includes("?")) {
    return baseUrl;
  }

  // Add connection pool parameters
  const poolConfig = appConfig.database.pool;
  const params = new URLSearchParams({
    sslmode: "require",
    connect_timeout: String(Math.floor(poolConfig.connectionTimeout / 1000)), // Convert to seconds
    pool_timeout: String(Math.floor(poolConfig.idleTimeout / 1000)),
    // Neon-specific parameters
    statement_cache_size: String(poolConfig.statementCacheSize),
  });

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Initialize database connection with optimal pooling settings
 */
const databaseUrl = buildDatabaseUrl();

/**
 * Drizzle database instance
 * Uses Neon's HTTP driver for serverless compatibility
 */
export const db = drizzle(databaseUrl, {
  schema,
  logger: appConfig.database.pool.enableQueryLogging
    ? {
        logQuery: (query: string, params: unknown[]) => {
          logger.dbQuery(query, undefined);
        },
      }
    : false,
});

export type Database = typeof db;

/**
 * Database connection health check
 * Tests connectivity and measures latency
 */
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  latency: number;
  error?: string;
}> {
  const startTime = Date.now();

  try {
    // Simple query to test connection
    await db.execute(sql`SELECT 1`);

    const latency = Date.now() - startTime;

    return {
      healthy: true,
      latency,
    };
  } catch (error) {
    const latency = Date.now() - startTime;

    logger.error("Database health check failed", error);

    return {
      healthy: false,
      latency,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get database connection statistics
 * Note: Neon manages pooling internally, so these are estimates
 */
export function getDatabaseStats(): {
  driver: string;
  pooling: string;
  config: typeof appConfig.database.pool;
} {
  return {
    driver: "neon-http",
    pooling: "managed-by-neon",
    config: appConfig.database.pool,
  };
}
