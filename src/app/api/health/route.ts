import { ApiWrapper } from "@/shared/lib/api/api-handler";
import { db } from "@/infrastructure/database/drizzle/client";
import { networks } from "@/infrastructure/database/drizzle/schema/networks.schema";
import { CacheAdapter } from "@/infrastructure/cache/cache.adapter";
import { auth } from "@/infrastructure/auth/better-auth.config";

// GET /api/health - Health check endpoint
export const GET = ApiWrapper.create(
  async () => {
    const startTime = Date.now();

    const healthChecks = {
      status: "healthy" as "healthy" | "degraded" | "unhealthy",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      environment: process.env.NODE_ENV || "development",
      checks: {
        database: "unknown" as "healthy" | "unhealthy" | "unknown",
        cache: "unknown" as "healthy" | "unhealthy" | "unknown",
        auth: "unknown" as "healthy" | "unhealthy" | "unknown",
      },
      responseTime: "0ms",
    };

    // DB check (simple select)
    try {
      await db.select({ id: networks.id }).from(networks).limit(1);
      healthChecks.checks.database = "healthy";
    } catch {
      healthChecks.checks.database = "unhealthy";
      healthChecks.status = "degraded";
    }

    // Cache check (PING)
    try {
      const cache = CacheAdapter.getInstance();
      const ok = await cache.health();
      healthChecks.checks.cache = ok ? "healthy" : "unhealthy";
      if (!ok) healthChecks.status = "degraded";
    } catch {
      healthChecks.checks.cache = "unhealthy";
      healthChecks.status = "degraded";
    }

    // Auth check (get-session without cookies should not throw)
    try {
      await auth.api.getSession({ headers: {} as any });
      // Even if session null, endpoint works; mark healthy
      healthChecks.checks.auth = "healthy";
    } catch {
      healthChecks.checks.auth = "unhealthy";
      healthChecks.status = "degraded";
    }

    healthChecks.responseTime = `${Date.now() - startTime}ms`;

    // Return plain object; ApiWrapper will wrap it into success response
    return healthChecks;
  },
  {
    auth: {
      required: false, // Public endpoint
    },
  }
);
