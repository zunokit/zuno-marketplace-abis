import { auth } from "./better-auth.config";
import { headers as nextHeaders } from "next/headers";
import { ApiKey } from "@/infrastructure/database/drizzle/schema/auth.schema";
import { db } from "@/infrastructure/database/drizzle/client";
import { apiKey as apiKeyTable } from "@/infrastructure/database/drizzle/schema/auth.schema";
import { eq, and } from "drizzle-orm";
import { logger } from "@/shared/lib/utils/logger";

export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  role: string;
  banned?: boolean;
  banReason?: string | null;
  banExpires?: Date | null;
}

export interface AuthApiKey {
  id: string;
  userId: string;
  name: string;
  permissions: Record<string, string[]>;
  scopes: string[];
  enabled: boolean;
  expiresAt?: Date | null;
  rateLimitEnabled?: boolean;
  rateLimitMax?: number | null;
  rateLimitTimeWindow?: number | null;
  remaining?: number | null;
  metadata?: {
    type?: "personal" | "organization" | "public";
    scopes?: string[];
    ipWhitelist?: string[];
    allowedOrigins?: string[];
    notes?: string;
  };
}

export interface AuthContext {
  user?: AuthUser;
  apiKey?: AuthApiKey;
  session?: {
    id: string;
    token: string;
    expiresAt: Date;
    impersonatedBy?: string;
  };
}

/**
 * Verify API key from request header
 */
export async function verifyApiKey(
  apiKeyValue: string
): Promise<AuthApiKey | null> {
  try {
    // Query database for API key (Better Auth stores hashed keys)
    const [keyRecord] = await db
      .select()
      .from(apiKeyTable)
      .where(eq(apiKeyTable.key, apiKeyValue))
      .limit(1);

    if (!keyRecord) {
      logger.debug("API key not found in database");
      return null;
    }

    // Check if key is enabled
    if (!keyRecord.enabled) {
      logger.warn("API key is disabled", { keyId: keyRecord.id });
      return null;
    }

    // Check expiration
    if (keyRecord.expiresAt && new Date(keyRecord.expiresAt) < new Date()) {
      logger.warn("API key has expired", {
        keyId: keyRecord.id,
        expiresAt: keyRecord.expiresAt,
      });
      return null;
    }

    // Parse permissions from Better Auth format
    let permissions: Record<string, string[]> = {};
    if (keyRecord.permissions) {
      try {
        permissions =
          typeof keyRecord.permissions === "string"
            ? JSON.parse(keyRecord.permissions)
            : keyRecord.permissions;
      } catch (error) {
        logger.error("Failed to parse API key permissions", error);
      }
    }

    // Extract scopes from metadata
    const metadata = keyRecord.metadata as AuthApiKey["metadata"];
    const scopes = metadata?.scopes || [];

    // Update last request timestamp
    await db
      .update(apiKeyTable)
      .set({ lastRequest: new Date() })
      .where(eq(apiKeyTable.id, keyRecord.id));

    return {
      id: keyRecord.id,
      userId: keyRecord.userId,
      name: keyRecord.name,
      permissions,
      scopes,
      enabled: keyRecord.enabled,
      expiresAt: keyRecord.expiresAt,
      rateLimitEnabled: keyRecord.rateLimitEnabled || false,
      rateLimitMax: keyRecord.rateLimitMax,
      rateLimitTimeWindow: keyRecord.rateLimitTimeWindow,
      remaining: keyRecord.remaining,
      metadata,
    };
  } catch (error) {
    logger.error("Failed to verify API key", error);
    return null;
  }
}

/**
 * Verify session from cookies using Better Auth
 */
export async function verifySession(): Promise<{
  user: AuthUser;
  session: AuthContext["session"];
} | null> {
  try {
    const headersList = await nextHeaders();
    const cookieHeader = headersList.get("cookie") || "";

    // Use Better Auth's session validation
    const session = await auth.api.getSession({
      headers: {
        cookie: cookieHeader,
      },
    });

    if (!session || !session.user || !session.session) {
      return null;
    }

    // Check if user is banned
    if (session.user.banned) {
      const banExpires = session.user.banExpires
        ? new Date(session.user.banExpires)
        : null;
      if (!banExpires || banExpires > new Date()) {
        logger.warn("Banned user attempted access", {
          userId: session.user.id,
        });
        return null;
      }
    }

    return {
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role || "user",
        banned: session.user.banned || undefined,
        banReason: session.user.banReason || undefined,
        banExpires: session.user.banExpires
          ? new Date(session.user.banExpires)
          : undefined,
      },
      session: {
        id: session.session.id,
        token: session.session.token,
        expiresAt: new Date(session.session.expiresAt),
        impersonatedBy: session.session.impersonatedBy || undefined,
      },
    };
  } catch (error) {
    logger.error("Failed to verify session", error);
    return null;
  }
}

/**
 * Verify session using incoming request headers (supports Bearer plugin)
 */
export async function verifySessionFromHeaders(headers: Headers): Promise<{
  user: AuthUser;
  session: AuthContext["session"];
} | null> {
  try {
    const session = await auth.api.getSession({ headers });

    if (!session || !session.user || !session.session) {
      return null;
    }

    return {
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: (session.user as any).role || "user",
        banned: (session.user as any).banned || undefined,
        banReason: (session.user as any).banReason || undefined,
        banExpires: (session.user as any).banExpires
          ? new Date((session.user as any).banExpires)
          : undefined,
      },
      session: {
        id: session.session.id,
        token: session.session.token,
        expiresAt: new Date(session.session.expiresAt),
        impersonatedBy: (session.session as any).impersonatedBy || undefined,
      },
    };
  } catch (error) {
    logger.error("Failed to verify session from headers", error);
    return null;
  }
}

/**
 * Check if user/API key has required permissions
 * Supports both Better Auth format (resource: ['action']) and scope format (resource:action)
 */
export function hasPermission(
  context: AuthContext,
  requiredPermissions: string[]
): boolean {
  // Admin role has all permissions
  if (context.user?.role === "admin") {
    return true;
  }

  // Check API key permissions
  if (context.apiKey) {
    // Check each required permission
    const hasAllPermissions = requiredPermissions.some((perm) => {
      // Check scopes first (format: "write:abis", "read:contracts")
      if (context.apiKey!.scopes.includes(perm)) {
        return true;
      }

      // Check Better Auth permissions format (resource: ['action'])
      // Split by ':' - supports both "resource:action" and "action:resource"
      const parts = perm.split(":");
      if (parts.length === 2) {
        const [part1, part2] = parts;

        // Try "resource:action" format (e.g., "abis:write")
        const resourcePermissions1 = context.apiKey!.permissions[part1];
        if (resourcePermissions1?.includes(part2)) {
          return true;
        }

        // Try "action:resource" format (e.g., "write:abis")
        const resourcePermissions2 = context.apiKey!.permissions[part2];
        if (resourcePermissions2?.includes(part1)) {
          return true;
        }
      }

      return false;
    });

    return hasAllPermissions;
  }

  // For session-based auth, default users have read-only access
  // unless you implement a more sophisticated RBAC system
  if (context.user) {
    // Check if all required permissions are read-only
    const allReadOnly = requiredPermissions.every((perm) => {
      const lower = perm.toLowerCase();
      return (
        lower.includes("read") ||
        lower.includes("list") ||
        lower.includes("get")
      );
    });
    return allReadOnly;
  }

  return false;
}

/**
 * Check if user is admin
 */
export function isAdmin(context: AuthContext): boolean {
  return context.user?.role === "admin";
}

/**
 * Check if user owns a resource
 */
export function isOwner(context: AuthContext, resourceUserId: string): boolean {
  if (context.apiKey) {
    return context.apiKey.userId === resourceUserId;
  }
  if (context.user) {
    return context.user.id === resourceUserId;
  }
  return false;
}

/**
 * Check if user can access resource (owner or admin)
 */
export function canAccessResource(
  context: AuthContext,
  resourceUserId: string
): boolean {
  return isAdmin(context) || isOwner(context, resourceUserId);
}

/**
 * Validate IP whitelist from API key metadata
 */
export function isIpAllowed(apiKey: AuthApiKey, requestIp: string): boolean {
  if (
    !apiKey.metadata?.ipWhitelist ||
    apiKey.metadata.ipWhitelist.length === 0
  ) {
    return true; // No whitelist means all IPs allowed
  }

  // Simple IP matching (in production, use a library like ipaddr.js for CIDR support)
  return apiKey.metadata.ipWhitelist.some((allowedIp) => {
    if (allowedIp.includes("/")) {
      // CIDR notation - simplified check
      const [network] = allowedIp.split("/");
      return requestIp.startsWith(
        network.substring(0, network.lastIndexOf("."))
      );
    }
    return requestIp === allowedIp;
  });
}

/**
 * Validate origin from API key metadata
 */
export function isOriginAllowed(apiKey: AuthApiKey, origin: string): boolean {
  if (
    !apiKey.metadata?.allowedOrigins ||
    apiKey.metadata.allowedOrigins.length === 0
  ) {
    return true; // No origin restriction
  }

  return apiKey.metadata.allowedOrigins.includes(origin);
}

/**
 * Check and update rate limit for API key
 */
export async function checkRateLimit(apiKey: AuthApiKey): Promise<{
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> {
  if (
    !apiKey.rateLimitEnabled ||
    !apiKey.rateLimitMax ||
    !apiKey.rateLimitTimeWindow
  ) {
    return {
      allowed: true,
      limit: Infinity,
      remaining: Infinity,
      reset: 0,
    };
  }

  try {
    const now = Date.now();
    const windowMs = apiKey.rateLimitTimeWindow;
    const maxRequests = apiKey.rateLimitMax;

    // Get current API key state
    const [currentKey] = await db
      .select()
      .from(apiKeyTable)
      .where(eq(apiKeyTable.id, apiKey.id))
      .limit(1);

    if (!currentKey) {
      return {
        allowed: false,
        limit: maxRequests,
        remaining: 0,
        reset: now + windowMs,
      };
    }

    const lastRefill = currentKey.lastRefillAt
      ? new Date(currentKey.lastRefillAt).getTime()
      : 0;
    const currentCount = currentKey.requestCount || 0;
    const timeSinceRefill = now - lastRefill;

    // Check if we need to refill
    if (timeSinceRefill >= windowMs) {
      // Refill the bucket
      await db
        .update(apiKeyTable)
        .set({
          requestCount: 1,
          lastRefillAt: new Date(now),
          remaining: maxRequests - 1,
        })
        .where(eq(apiKeyTable.id, apiKey.id));

      return {
        allowed: true,
        limit: maxRequests,
        remaining: maxRequests - 1,
        reset: now + windowMs,
      };
    }

    // Check if we're over the limit
    if (currentCount >= maxRequests) {
      const resetTime = lastRefill + windowMs;
      return {
        allowed: false,
        limit: maxRequests,
        remaining: 0,
        reset: resetTime,
      };
    }

    // Increment counter
    const newCount = currentCount + 1;
    await db
      .update(apiKeyTable)
      .set({
        requestCount: newCount,
        remaining: maxRequests - newCount,
      })
      .where(eq(apiKeyTable.id, apiKey.id));

    return {
      allowed: true,
      limit: maxRequests,
      remaining: maxRequests - newCount,
      reset: lastRefill + windowMs,
    };
  } catch (error) {
    logger.error("Failed to check rate limit", error);
    // On error, allow the request but log it
    return {
      allowed: true,
      limit: apiKey.rateLimitMax,
      remaining: 0,
      reset: Date.now(),
    };
  }
}
