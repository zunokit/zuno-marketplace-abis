import { eq, desc, and } from "drizzle-orm";
import { db } from "@/infrastructure/database/drizzle/client";
import { auditLogs } from "@/infrastructure/database/drizzle/schema";
import { AuditContext } from "@/shared/types";
import { logger } from "@/shared/lib/utils/logger";

export interface AuditLogData {
  userId?: string;
  apiKeyId?: string;
  method: string;
  path: string;
  action: string;
  ipAddress?: string;
  userAgent?: string;
  resourceType?: string;
  resourceId?: string;
  statusCode: number;
  duration?: number;
  metadata?: {
    error?: string;
    requestBody?: Record<string, unknown>;
    responseSize?: number;
  };
}

export class AuditLogger {
  private static instance: AuditLogger;

  private constructor() {}

  public static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  /**
   * Log an API request to the audit logs table
   */
  async log(data: AuditLogData): Promise<void> {
    try {
      await db.insert(auditLogs).values({
        userId: data.userId || null,
        apiKeyId: data.apiKeyId || null,
        method: data.method,
        path: data.path,
        action: data.action,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
        resourceType: data.resourceType || null,
        resourceId: data.resourceId || null,
        statusCode: data.statusCode,
        duration: data.duration || null,
        metadata: data.metadata || null,
      });

      logger.debug("Audit log created", { action: data.action, path: data.path });
    } catch (error) {
      // Don't throw errors from audit logging - just log them
      logger.error("Failed to create audit log", error, data as any);
    }
  }

  /**
   * Log API request with context
   */
  async logRequest(
    context: AuditContext & {
      method: string;
      path: string;
      statusCode: number;
      duration?: number;
      error?: string;
      requestBody?: Record<string, unknown>;
      responseSize?: number;
    }
  ): Promise<void> {
    await this.log({
      userId: context.userId,
      apiKeyId: context.apiKeyId,
      method: context.method,
      path: context.path,
      action: context.action,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      resourceType: context.resourceType,
      resourceId: context.resourceId,
      statusCode: context.statusCode,
      duration: context.duration,
      metadata: {
        error: context.error,
        requestBody: context.requestBody,
        responseSize: context.responseSize,
      },
    });
  }

  /**
   * Log successful action
   */
  async logSuccess(
    action: string,
    resourceType: string,
    resourceId: string,
    context?: Partial<AuditContext>
  ): Promise<void> {
    await this.log({
      method: "POST",
      path: `/api/${resourceType}/${resourceId}`,
      action,
      resourceType,
      resourceId,
      statusCode: 200,
      userId: context?.userId,
      apiKeyId: context?.apiKeyId,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });
  }

  /**
   * Log failed action
   */
  async logFailure(
    action: string,
    resourceType: string,
    error: string,
    statusCode: number,
    context?: Partial<AuditContext>
  ): Promise<void> {
    await this.log({
      method: "POST",
      path: `/api/${resourceType}`,
      action,
      resourceType,
      statusCode,
      userId: context?.userId,
      apiKeyId: context?.apiKeyId,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      metadata: { error },
    });
  }

  /**
   * Get audit logs for a user
   */
  async getLogsForUser(
    userId: string,
    limit = 100,
    offset = 0
  ): Promise<typeof auditLogs.$inferSelect[]> {
    try {
      const logs = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.userId, userId))
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit)
        .offset(offset);

      return logs;
    } catch (error) {
      logger.error("Failed to fetch audit logs for user", error, { userId });
      return [];
    }
  }

  /**
   * Get audit logs for an API key
   */
  async getLogsForApiKey(
    apiKeyId: string,
    limit = 100,
    offset = 0
  ): Promise<typeof auditLogs.$inferSelect[]> {
    try {
      const logs = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.apiKeyId, apiKeyId))
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit)
        .offset(offset);

      return logs;
    } catch (error) {
      logger.error("Failed to fetch audit logs for API key", error, { apiKeyId });
      return [];
    }
  }

  /**
   * Get audit logs for a resource
   */
  async getLogsForResource(
    resourceType: string,
    resourceId: string,
    limit = 100,
    offset = 0
  ): Promise<typeof auditLogs.$inferSelect[]> {
    try {
      const logs = await db
        .select()
        .from(auditLogs)
        .where(and(eq(auditLogs.resourceType, resourceType), eq(auditLogs.resourceId, resourceId)))
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit)
        .offset(offset);

      return logs;
    } catch (error) {
      logger.error("Failed to fetch audit logs for resource", error, { resourceType, resourceId });
      return [];
    }
  }

  /**
   * Get audit statistics for a user
   */
  async getStatsForUser(userId: string): Promise<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    avgDuration: number;
  }> {
    try {
      const logs = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.userId, userId));

      const totalRequests = logs.length;
      const successfulRequests = logs.filter((log) => log.statusCode < 400).length;
      const failedRequests = totalRequests - successfulRequests;
      const avgDuration =
        logs.reduce((sum, log) => sum + (log.duration || 0), 0) / totalRequests || 0;

      return {
        totalRequests,
        successfulRequests,
        failedRequests,
        avgDuration: Math.round(avgDuration),
      };
    } catch (error) {
      logger.error("Failed to calculate audit stats for user", error, { userId });
      return {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        avgDuration: 0,
      };
    }
  }
}

export const auditLogger = AuditLogger.getInstance();
