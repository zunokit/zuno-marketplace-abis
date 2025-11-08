import { ApiWrapper } from "@/shared/lib/api/api-handler";
import { db } from "@/infrastructure/database/drizzle/client";
import { networks } from "@/infrastructure/database/drizzle/schema/networks.schema";
import { CacheAdapter } from "@/infrastructure/cache/cache.adapter";
import { auth } from "@/infrastructure/auth/better-auth.config";
import { sql } from "drizzle-orm";
import { env } from "@/shared/config/env";

/**
 * Service Health Status
 */
type ServiceStatus = "healthy" | "unhealthy" | "degraded";

/**
 * Service Health Check Result
 */
interface ServiceHealthCheck {
  status: ServiceStatus;
  latency: number;
  message?: string;
  details?: Record<string, unknown>;
}

/**
 * Overall Health Check Response
 */
interface HealthCheckResponse {
  status: ServiceStatus;
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: {
    database: ServiceHealthCheck;
    cache: ServiceHealthCheck;
    auth: ServiceHealthCheck;
    ipfs: ServiceHealthCheck;
  };
  system: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    nodeVersion: string;
  };
  responseTime: number;
}

/**
 * Application start time for uptime calculation
 */
const startTime = Date.now();

/**
 * Check Database Health
 */
async function checkDatabaseHealth(): Promise<ServiceHealthCheck> {
  const start = Date.now();

  try {
    // Test connection with simple query
    await db.execute(sql`SELECT 1`);

    // Additional check: query networks table
    const result = await db.select({ id: networks.id }).from(networks).limit(1);

    const latency = Date.now() - start;

    return {
      status: "healthy",
      latency,
      details: {
        connected: true,
        tableAccessible: result.length >= 0,
      },
    };
  } catch (error) {
    const latency = Date.now() - start;

    return {
      status: "unhealthy",
      latency,
      message: error instanceof Error ? error.message : "Database connection failed",
    };
  }
}

/**
 * Check Cache (Redis) Health
 */
async function checkCacheHealth(): Promise<ServiceHealthCheck> {
  const start = Date.now();

  try {
    const cache = CacheAdapter.getInstance();
    const isHealthy = await cache.health();

    const latency = Date.now() - start;

    if (!isHealthy) {
      return {
        status: "degraded",
        latency,
        message: "Cache ping failed",
      };
    }

    return {
      status: "healthy",
      latency,
      details: {
        connected: true,
      },
    };
  } catch (error) {
    const latency = Date.now() - start;

    return {
      status: "unhealthy",
      latency,
      message: error instanceof Error ? error.message : "Cache connection failed",
    };
  }
}

/**
 * Check Auth Service Health
 */
async function checkAuthHealth(): Promise<ServiceHealthCheck> {
  const start = Date.now();

  try {
    // Test auth service by attempting to get session (should not throw even if null)
    await auth.api.getSession({ headers: {} as any });

    const latency = Date.now() - start;

    return {
      status: "healthy",
      latency,
      details: {
        configured: true,
      },
    };
  } catch (error) {
    const latency = Date.now() - start;

    return {
      status: "unhealthy",
      latency,
      message: error instanceof Error ? error.message : "Auth service error",
    };
  }
}

/**
 * Check IPFS/Pinata Health
 */
async function checkIpfsHealth(): Promise<ServiceHealthCheck> {
  const start = Date.now();

  try {
    // Check if Pinata JWT is configured
    if (!env.PINATA_JWT) {
      return {
        status: "degraded",
        latency: Date.now() - start,
        message: "Pinata JWT not configured",
      };
    }

    // Test Pinata connection with authentication endpoint
    const response = await fetch("https://api.pinata.cloud/data/testAuthentication", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${env.PINATA_JWT}`,
      },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    const latency = Date.now() - start;

    if (!response.ok) {
      return {
        status: "unhealthy",
        latency,
        message: `Pinata API error: ${response.status}`,
      };
    }

    return {
      status: "healthy",
      latency,
      details: {
        authenticated: true,
      },
    };
  } catch (error) {
    const latency = Date.now() - start;

    // Timeout or network error
    if (error instanceof Error && error.name === "TimeoutError") {
      return {
        status: "degraded",
        latency,
        message: "Pinata API timeout (>5s)",
      };
    }

    return {
      status: "unhealthy",
      latency,
      message: error instanceof Error ? error.message : "IPFS connection failed",
    };
  }
}

/**
 * Calculate overall system status based on service statuses
 */
function calculateOverallStatus(
  database: ServiceHealthCheck,
  cache: ServiceHealthCheck,
  auth: ServiceHealthCheck,
  ipfs: ServiceHealthCheck
): ServiceStatus {
  // Critical services: database, cache, auth
  // Non-critical: ipfs (degraded is acceptable)

  // If any critical service is unhealthy, system is unhealthy
  if (
    database.status === "unhealthy" ||
    cache.status === "unhealthy" ||
    auth.status === "unhealthy"
  ) {
    return "unhealthy";
  }

  // If any service is degraded, system is degraded
  if (
    database.status === "degraded" ||
    cache.status === "degraded" ||
    auth.status === "degraded" ||
    ipfs.status === "degraded"
  ) {
    return "degraded";
  }

  // If IPFS is unhealthy but others are healthy, system is degraded
  if (ipfs.status === "unhealthy") {
    return "degraded";
  }

  return "healthy";
}

/**
 * Get system memory metrics
 */
function getSystemMetrics() {
  const memUsage = process.memoryUsage();

  return {
    memory: {
      used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      total: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
      percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
    },
    nodeVersion: process.version,
  };
}

// GET /api/health - Comprehensive health check endpoint with metrics
export const GET = ApiWrapper.create(
  async () => {
    const requestStart = Date.now();

    // Run all health checks in parallel for better performance
    const [databaseHealth, cacheHealth, authHealth, ipfsHealth] = await Promise.all([
      checkDatabaseHealth(),
      checkCacheHealth(),
      checkAuthHealth(),
      checkIpfsHealth(),
    ]);

    // Calculate overall status
    const overallStatus = calculateOverallStatus(
      databaseHealth,
      cacheHealth,
      authHealth,
      ipfsHealth
    );

    // Calculate uptime in seconds
    const uptime = Math.floor((Date.now() - startTime) / 1000);

    // Build response
    const response: HealthCheckResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime,
      version: "1.0.0",
      environment: process.env.NODE_ENV || "development",
      services: {
        database: databaseHealth,
        cache: cacheHealth,
        auth: authHealth,
        ipfs: ipfsHealth,
      },
      system: getSystemMetrics(),
      responseTime: Date.now() - requestStart,
    };

    return response;
  },
  {
    auth: {
      required: false, // Public endpoint
    },
  }
);
