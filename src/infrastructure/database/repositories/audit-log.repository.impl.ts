/**
 * Audit Log Repository Implementation
 * Drizzle ORM implementation for audit log storage
 */

import { db } from "@/infrastructure/database/drizzle/client";
import { auditLogs } from "@/infrastructure/database/drizzle/schema/audit-logs.schema";
import type {
  AuditLogRepository,
  AuditLogListParams,
  PaginatedAuditLogs,
  AuditLogFilters,
} from "@/core/domain/audit-log/audit-log.repository";
import type {
  AuditLogEntity,
  CreateAuditLogInput,
} from "@/core/domain/audit-log/audit-log.entity";
import { and, eq, gte, lte, desc, asc, count, sql, SQL } from "drizzle-orm";

export class AuditLogRepositoryImpl implements AuditLogRepository {
  async create(input: CreateAuditLogInput): Promise<AuditLogEntity> {
    const [auditLog] = await db
      .insert(auditLogs)
      .values({
        userId: input.userId || null,
        apiKeyId: input.apiKeyId || null,
        method: input.method,
        path: input.path,
        action: input.action,
        ipAddress: input.ipAddress || null,
        userAgent: input.userAgent || null,
        resourceType: input.resourceType || null,
        resourceId: input.resourceId || null,
        statusCode: input.statusCode,
        duration: input.duration || null,
        metadata: input.metadata || null,
      })
      .returning();

    return this.toEntity(auditLog);
  }

  async list(params: AuditLogListParams): Promise<PaginatedAuditLogs> {
    const {
      page,
      limit,
      filters,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = params;
    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const conditions = this.buildWhereConditions(filters);

    // Execute query with pagination
    const [data, totalResult] = await Promise.all([
      db
        .select()
        .from(auditLogs)
        .where(conditions)
        .orderBy(
          sortOrder === "desc"
            ? desc(auditLogs[sortBy])
            : asc(auditLogs[sortBy])
        )
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(auditLogs).where(conditions),
    ]);

    const total = totalResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data.map((log) => this.toEntity(log)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async findById(id: string): Promise<AuditLogEntity | null> {
    const [auditLog] = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.id, id))
      .limit(1);

    return auditLog ? this.toEntity(auditLog) : null;
  }

  async deleteOlderThan(date: Date): Promise<number> {
    const result = await db
      .delete(auditLogs)
      .where(lte(auditLogs.createdAt, date));

    return result.rowCount || 0;
  }

  async getStats(filters?: AuditLogFilters) {
    const conditions = this.buildWhereConditions(filters);

    const [statsResult] = await db
      .select({
        totalRequests: count(),
        totalErrors: sql<number>`COUNT(CASE WHEN ${auditLogs.statusCode} >= 400 THEN 1 END)`,
        avgDuration: sql<number>`AVG(${auditLogs.duration})`,
      })
      .from(auditLogs)
      .where(conditions);

    // Get requests by method
    const methodStats = await db
      .select({
        method: auditLogs.method,
        count: count(),
      })
      .from(auditLogs)
      .where(conditions)
      .groupBy(auditLogs.method);

    // Get requests by action
    const actionStats = await db
      .select({
        action: auditLogs.action,
        count: count(),
      })
      .from(auditLogs)
      .where(conditions)
      .groupBy(auditLogs.action);

    return {
      totalRequests: Number(statsResult?.totalRequests || 0),
      totalErrors: Number(statsResult?.totalErrors || 0),
      avgDuration: Number(statsResult?.avgDuration || 0),
      requestsByMethod: Object.fromEntries(
        methodStats.map((s) => [s.method, Number(s.count)])
      ),
      requestsByAction: Object.fromEntries(
        actionStats.map((s) => [s.action, Number(s.count)])
      ),
    };
  }

  /**
   * Build WHERE conditions from filters
   */
  private buildWhereConditions(filters?: AuditLogFilters): SQL | undefined {
    if (!filters) return undefined;

    const conditions: SQL[] = [];

    if (filters.userId) {
      conditions.push(eq(auditLogs.userId, filters.userId));
    }
    if (filters.apiKeyId) {
      conditions.push(eq(auditLogs.apiKeyId, filters.apiKeyId));
    }
    if (filters.method) {
      conditions.push(eq(auditLogs.method, filters.method));
    }
    if (filters.action) {
      conditions.push(eq(auditLogs.action, filters.action));
    }
    if (filters.resourceType) {
      conditions.push(eq(auditLogs.resourceType, filters.resourceType));
    }
    if (filters.resourceId) {
      conditions.push(eq(auditLogs.resourceId, filters.resourceId));
    }
    if (filters.statusCode) {
      conditions.push(eq(auditLogs.statusCode, filters.statusCode));
    }
    if (filters.startDate) {
      conditions.push(gte(auditLogs.createdAt, filters.startDate));
    }
    if (filters.endDate) {
      conditions.push(lte(auditLogs.createdAt, filters.endDate));
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }

  /**
   * Map database row to domain entity
   */
  private toEntity(row: typeof auditLogs.$inferSelect): AuditLogEntity {
    return {
      id: row.id,
      userId: row.userId,
      apiKeyId: row.apiKeyId,
      method: row.method,
      path: row.path,
      action: row.action,
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      resourceType: row.resourceType,
      resourceId: row.resourceId,
      statusCode: row.statusCode,
      duration: row.duration,
      metadata: row.metadata,
      createdAt: row.createdAt,
    };
  }
}
