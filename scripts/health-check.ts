/**
 * Health Check Script
 * Checks database and cache connectivity for CI/CD workflows
 *
 * Usage: pnpm exec tsx scripts/health-check.ts
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";
import * as schema from "@/infrastructure/database/drizzle/schema";
import { Redis } from "@upstash/redis";

// Logger utility
const logger = {
  info: (message: string) =>
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`),
  error: (message: string) =>
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`),
  success: (message: string) =>
    console.log(`✅ ${new Date().toISOString()} - ${message}`),
  warn: (message: string) =>
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`),
};

interface HealthCheckResult {
  name: string;
  healthy: boolean;
  latency: number;
  error?: string;
}

// Check database connectivity
async function checkDatabase(): Promise<HealthCheckResult> {
  const startTime = Date.now();

  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      return {
        name: "database",
        healthy: false,
        latency: 0,
        error: "DATABASE_URL environment variable is not set",
      };
    }

    const db = drizzle(databaseUrl, { schema });

    // Simple query to test connection
    await db.execute(sql`SELECT 1`);

    const latency = Date.now() - startTime;

    return {
      name: "database",
      healthy: true,
      latency,
    };
  } catch (error: any) {
    const latency = Date.now() - startTime;

    return {
      name: "database",
      healthy: false,
      latency,
      error: error.message,
    };
  }
}

// Check Redis/cache connectivity
async function checkRedis(): Promise<HealthCheckResult> {
  const startTime = Date.now();

  try {
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!redisUrl || !redisToken) {
      return {
        name: "redis",
        healthy: false,
        latency: 0,
        error: "Redis environment variables are not set",
      };
    }

    const redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });

    const result = await redis.ping();
    const latency = Date.now() - startTime;

    return {
      name: "redis",
      healthy: result === "PONG",
      latency,
      error: result !== "PONG" ? "Ping failed" : undefined,
    };
  } catch (error: any) {
    const latency = Date.now() - startTime;

    return {
      name: "redis",
      healthy: false,
      latency,
      error: error.message,
    };
  }
}

// Main health check function
async function runHealthChecks(): Promise<void> {
  logger.info("Starting health checks...");

  const results: HealthCheckResult[] = [];

  // Run checks in parallel
  const [dbResult, redisResult] = await Promise.all([
    checkDatabase(),
    checkRedis(),
  ]);

  results.push(dbResult, redisResult);

  // Print results
  console.log("\n" + "=".repeat(60));
  console.log("📊 HEALTH CHECK RESULTS");
  console.log("=".repeat(60) + "\n");

  let allHealthy = true;

  results.forEach((result) => {
    const status = result.healthy ? "✅ HEALTHY" : "❌ UNHEALTHY";
    console.log(`${status} - ${result.name}`);
    console.log(`   Latency: ${result.latency}ms`);

    if (result.error) {
      console.log(`   Error: ${result.error}`);
      allHealthy = false;
    }

    console.log("");
  });

  console.log("=".repeat(60));

  if (allHealthy) {
    logger.success("All health checks passed!");
  } else {
    logger.error("Some health checks failed!");
    throw new Error("Health checks failed");
  }
}

// Run health checks
runHealthChecks()
  .then(() => {
    console.log("\n✅ Health check completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Health check failed:", error.message);
    process.exit(1);
  });
