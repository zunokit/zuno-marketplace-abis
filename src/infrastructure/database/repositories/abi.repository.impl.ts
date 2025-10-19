import { eq, desc, asc, sql, like, and, inArray, gt, lt } from "drizzle-orm";
import { db } from "@/infrastructure/database/drizzle/client";
import { abis, abiVersions } from "@/infrastructure/database/drizzle/schema";
import type { AbiRepository } from "@/core/domain/abi/abi.repository";
import {
  AbiEntity,
  AbiVersionEntity,
  AbiListParams,
  UpdateAbiParams,
  AbiNotFoundError,
} from "@/core/domain/abi/abi.entity";
import { PaginatedResult } from "@/shared/types";
import { CacheAdapter } from "@/infrastructure/cache/cache.adapter";
import { logger } from "@/shared/lib/utils/logger";
import { appConfig } from "@/shared/config/app.config";

export class AbiRepositoryImpl implements AbiRepository {
  private cache: CacheAdapter;
  private cachePrefix = "abi:";
  private cacheTTL = appConfig.cache.abi;

  constructor() {
    this.cache = CacheAdapter.getInstance();
  }

  // Cache key generators
  private getCacheKey(id: string): string {
    return `${this.cachePrefix}${id}`;
  }

  private getHashCacheKey(hash: string): string {
    return `${this.cachePrefix}hash:${hash}`;
  }

  private getListCacheKey(params: AbiListParams): string {
    return `${this.cachePrefix}list:${JSON.stringify(params)}`;
  }

  // Basic CRUD operations
  async create(abi: AbiEntity): Promise<AbiEntity> {
    try {
      const [created] = await db
        .insert(abis)
        .values({
          id: abi.id,
          userId: abi.userId,
          name: abi.name,
          description: abi.description,
          contractName: abi.contractName,
          abi: abi.abi as any,
          abiHash: abi.abiHash,
          ipfsHash: abi.ipfsHash,
          ipfsUrl: abi.ipfsUrl,
          version: abi.version,
          tags: abi.tags,
          standard: abi.standard,
          metadata: abi.metadata as any,
          isDeleted: abi.isDeleted,
        })
        .returning();

      const entity = this.mapToEntity(created);

      // Cache the created ABI
      await this.cache.set(this.getCacheKey(entity.id), entity, this.cacheTTL);
      await this.cache.set(this.getHashCacheKey(entity.abiHash), entity, this.cacheTTL);

      logger.info("ABI created", { id: entity.id, userId: entity.userId });
      return entity;
    } catch (error) {
      logger.error("Failed to create ABI", error);
      throw error;
    }
  }

  async findById(id: string): Promise<AbiEntity | null> {
    // Try cache first
    const cached = await this.cache.get<AbiEntity>(this.getCacheKey(id));
    if (cached) {
      logger.cache("get", this.getCacheKey(id), true);
      return cached;
    }

    logger.cache("get", this.getCacheKey(id), false);

    try {
      const result = await db
        .select()
        .from(abis)
        .where(and(eq(abis.id, id), eq(abis.isDeleted, false)))
        .limit(1);

      if (result.length === 0) return null;

      const entity = this.mapToEntity(result[0]);

      // Cache the result
      await this.cache.set(this.getCacheKey(id), entity, this.cacheTTL);

      return entity;
    } catch (error) {
      logger.error("Failed to find ABI by ID", error, { id });
      return null;
    }
  }

  async findByHash(hash: string): Promise<AbiEntity | null> {
    // Try cache first
    const cached = await this.cache.get<AbiEntity>(this.getHashCacheKey(hash));
    if (cached) {
      logger.cache("get", this.getHashCacheKey(hash), true);
      return cached;
    }

    logger.cache("get", this.getHashCacheKey(hash), false);

    try {
      const result = await db
        .select()
        .from(abis)
        .where(and(eq(abis.abiHash, hash), eq(abis.isDeleted, false)))
        .limit(1);

      if (result.length === 0) return null;

      const entity = this.mapToEntity(result[0]);

      // Cache the result
      await this.cache.set(this.getHashCacheKey(hash), entity, this.cacheTTL);

      return entity;
    } catch (error) {
      logger.error("Failed to find ABI by hash", error, { hash });
      return null;
    }
  }

  async update(id: string, params: UpdateAbiParams): Promise<AbiEntity | null> {
    try {
      const [updated] = await db
        .update(abis)
        .set({
          ...(params.name && { name: params.name }),
          ...(params.description !== undefined && { description: params.description }),
          ...(params.contractName !== undefined && { contractName: params.contractName }),
          ...(params.abi && { abi: params.abi as any }),
          ...(params.tags && { tags: params.tags }),
          ...(params.standard !== undefined && { standard: params.standard }),
          ...(params.metadata && { metadata: params.metadata as any }),
          updatedAt: new Date(),
        })
        .where(eq(abis.id, id))
        .returning();

      if (!updated) return null;

      const entity = this.mapToEntity(updated);

      // Invalidate cache
      await this.cache.del(this.getCacheKey(id));
      await this.cache.del(this.getHashCacheKey(entity.abiHash));

      logger.info("ABI updated", { id });
      return entity;
    } catch (error) {
      logger.error("Failed to update ABI", error, { id });
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await db.delete(abis).where(eq(abis.id, id));

      // Invalidate cache
      await this.cache.del(this.getCacheKey(id));

      logger.info("ABI deleted", { id });
      return true;
    } catch (error) {
      logger.error("Failed to delete ABI", error, { id });
      return false;
    }
  }

  async softDelete(id: string): Promise<boolean> {
    try {
      await db
        .update(abis)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
        })
        .where(eq(abis.id, id));

      // Invalidate cache
      await this.cache.del(this.getCacheKey(id));

      logger.info("ABI soft deleted", { id });
      return true;
    } catch (error) {
      logger.error("Failed to soft delete ABI", error, { id });
      return false;
    }
  }

  // List and search operations
  async list(params: AbiListParams = {}): Promise<PaginatedResult<AbiEntity>> {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, appConfig.api.maxPageSize);
    const offset = (page - 1) * limit;

    // Try cache first
    const cacheKey = this.getListCacheKey(params);
    const cached = await this.cache.get<PaginatedResult<AbiEntity>>(cacheKey);
    if (cached) {
      logger.cache("get", cacheKey, true);
      return cached;
    }

    logger.cache("get", cacheKey, false);

    try {
      // Build where clause
      const conditions: any[] = [eq(abis.isDeleted, false)];

      if (params.filters) {
        if (params.filters.userId) {
          conditions.push(eq(abis.userId, params.filters.userId));
        }
        if (params.filters.contractName) {
          conditions.push(eq(abis.contractName, params.filters.contractName));
        }
        if (params.filters.standard) {
          conditions.push(eq(abis.standard, params.filters.standard));
        }
        if (params.filters.tags && params.filters.tags.length > 0) {
          // PostgreSQL arrayoverlap operator - check if ANY tag matches
          // Build OR conditions for each tag
          const tagOrConditions = params.filters.tags.map(tag =>
            sql`${tag} = ANY(${abis.tags})`
          );
          if (tagOrConditions.length > 0) {
            conditions.push(sql`(${sql.join(tagOrConditions, sql` OR `)})`);
          }
        }
        if (params.filters.createdAfter) {
          conditions.push(gt(abis.createdAt, params.filters.createdAfter));
        }
        if (params.filters.createdBefore) {
          conditions.push(lt(abis.createdAt, params.filters.createdBefore));
        }
      }

      if (params.query) {
        conditions.push(
          sql`${abis.name} ILIKE ${`%${params.query}%`} OR ${abis.description} ILIKE ${`%${params.query}%`}`
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Build order clause
      const sortBy = params.sortBy || "createdAt";
      const sortOrder = params.sortOrder || "desc";
      const orderFn = sortOrder === "asc" ? asc : desc;

      const orderClause =
        sortBy === "name"
          ? orderFn(abis.name)
          : sortBy === "updatedAt"
            ? orderFn(abis.updatedAt)
            : sortBy === "version"
              ? orderFn(abis.version)
              : orderFn(abis.createdAt);

      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(abis)
        .where(whereClause);

      const total = Number(countResult?.count || 0);

      // Get data
      const results = await db
        .select()
        .from(abis)
        .where(whereClause)
        .orderBy(orderClause)
        .limit(limit)
        .offset(offset);

      const data = results.map((r) => this.mapToEntity(r));
      const totalPages = Math.ceil(total / limit);

      const result: PaginatedResult<AbiEntity> = {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };

      // Cache the result
      await this.cache.set(cacheKey, result, appConfig.cache.search);

      return result;
    } catch (error) {
      logger.error("Failed to list ABIs", error, params as any);
      throw error;
    }
  }

  async findByUserId(
    userId: string,
    params: AbiListParams = {}
  ): Promise<PaginatedResult<AbiEntity>> {
    return this.list({
      ...params,
      filters: {
        ...params.filters,
        userId,
      },
    });
  }

  async search(
    query: string,
    params: AbiListParams = {}
  ): Promise<PaginatedResult<AbiEntity>> {
    return this.list({
      ...params,
      query,
    });
  }

  // Version management
  async createVersion(version: AbiVersionEntity): Promise<AbiVersionEntity> {
    try {
      const [created] = await db
        .insert(abiVersions)
        .values({
          id: version.id,
          abiId: version.abiId,
          version: version.version,
          versionNumber: version.versionNumber,
          abi: version.abi as any,
          abiHash: version.abiHash,
          ipfsHash: version.ipfsHash,
          ipfsUrl: version.ipfsUrl,
          changeLog: version.changeLog,
          metadata: version.metadata as any,
        })
        .returning();

      logger.info("ABI version created", { abiId: version.abiId, version: version.version });
      return this.mapVersionToEntity(created);
    } catch (error) {
      logger.error("Failed to create ABI version", error);
      throw error;
    }
  }

  async findVersions(abiId: string): Promise<AbiVersionEntity[]> {
    try {
      const results = await db
        .select()
        .from(abiVersions)
        .where(eq(abiVersions.abiId, abiId))
        .orderBy(desc(abiVersions.versionNumber));

      return results.map((r) => this.mapVersionToEntity(r));
    } catch (error) {
      logger.error("Failed to find ABI versions", error, { abiId });
      return [];
    }
  }

  async findVersionByNumber(
    abiId: string,
    versionNumber: number
  ): Promise<AbiVersionEntity | null> {
    try {
      const [result] = await db
        .select()
        .from(abiVersions)
        .where(
          and(eq(abiVersions.abiId, abiId), eq(abiVersions.versionNumber, versionNumber))
        )
        .limit(1);

      if (!result) return null;

      return this.mapVersionToEntity(result);
    } catch (error) {
      logger.error("Failed to find ABI version by number", error, { abiId, versionNumber });
      return null;
    }
  }

  async getLatestVersion(abiId: string): Promise<AbiVersionEntity | null> {
    try {
      const [result] = await db
        .select()
        .from(abiVersions)
        .where(eq(abiVersions.abiId, abiId))
        .orderBy(desc(abiVersions.versionNumber))
        .limit(1);

      if (!result) return null;

      return this.mapVersionToEntity(result);
    } catch (error) {
      logger.error("Failed to get latest ABI version", error, { abiId });
      return null;
    }
  }

  // Utility methods
  async exists(id: string): Promise<boolean> {
    const abi = await this.findById(id);
    return abi !== null;
  }

  async existsByHash(hash: string): Promise<boolean> {
    const abi = await this.findByHash(hash);
    return abi !== null;
  }

  async countByUserId(userId: string): Promise<number> {
    try {
      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(abis)
        .where(and(eq(abis.userId, userId), eq(abis.isDeleted, false)));

      return Number(result?.count || 0);
    } catch (error) {
      logger.error("Failed to count ABIs by user ID", error, { userId });
      return 0;
    }
  }

  async findDuplicates(hash: string): Promise<AbiEntity[]> {
    try {
      const results = await db
        .select()
        .from(abis)
        .where(and(eq(abis.abiHash, hash), eq(abis.isDeleted, false)));

      return results.map((r) => this.mapToEntity(r));
    } catch (error) {
      logger.error("Failed to find duplicate ABIs", error, { hash });
      return [];
    }
  }

  // Bulk operations
  async createMany(abiList: AbiEntity[]): Promise<AbiEntity[]> {
    try {
      const values = abiList.map((abi) => ({
        id: abi.id,
        userId: abi.userId,
        name: abi.name,
        description: abi.description,
        contractName: abi.contractName,
        abi: abi.abi as any,
        abiHash: abi.abiHash,
        ipfsHash: abi.ipfsHash,
        ipfsUrl: abi.ipfsUrl,
        version: abi.version,
        tags: abi.tags,
        standard: abi.standard,
        metadata: abi.metadata as any,
        isDeleted: abi.isDeleted,
      }));

      const created = await db.insert(abis).values(values).returning();

      logger.info("Multiple ABIs created", { count: created.length });
      return created.map((r) => this.mapToEntity(r));
    } catch (error) {
      logger.error("Failed to create multiple ABIs", error);
      throw error;
    }
  }

  async updateMany(ids: string[], params: Partial<UpdateAbiParams>): Promise<number> {
    try {
      const result = await db
        .update(abis)
        .set({
          ...(params.name && { name: params.name }),
          ...(params.tags && { tags: params.tags }),
          ...(params.standard && { standard: params.standard }),
          updatedAt: new Date(),
        })
        .where(inArray(abis.id, ids));

      // Invalidate cache for all updated ABIs
      await Promise.all(ids.map((id) => this.cache.del(this.getCacheKey(id))));

      logger.info("Multiple ABIs updated", { count: ids.length });
      return ids.length;
    } catch (error) {
      logger.error("Failed to update multiple ABIs", error);
      return 0;
    }
  }

  async deleteMany(ids: string[]): Promise<number> {
    try {
      await db.delete(abis).where(inArray(abis.id, ids));

      // Invalidate cache for all deleted ABIs
      await Promise.all(ids.map((id) => this.cache.del(this.getCacheKey(id))));

      logger.info("Multiple ABIs deleted", { count: ids.length });
      return ids.length;
    } catch (error) {
      logger.error("Failed to delete multiple ABIs", error);
      return 0;
    }
  }

  // Helper methods
  private mapToEntity(row: any): AbiEntity {
    return {
      id: row.id,
      userId: row.userId,
      name: row.name,
      description: row.description,
      contractName: row.contractName,
      abi: row.abi,
      abiHash: row.abiHash,
      ipfsHash: row.ipfsHash,
      ipfsUrl: row.ipfsUrl,
      version: row.version,
      tags: row.tags || [],
      standard: row.standard,
      metadata: row.metadata,
      isDeleted: row.isDeleted,
      deletedAt: row.deletedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapVersionToEntity(row: any): AbiVersionEntity {
    return {
      id: row.id,
      abiId: row.abiId,
      version: row.version,
      versionNumber: row.versionNumber,
      abi: row.abi,
      abiHash: row.abiHash,
      ipfsHash: row.ipfsHash,
      ipfsUrl: row.ipfsUrl,
      changeLog: row.changeLog,
      metadata: row.metadata,
      createdAt: row.createdAt,
    };
  }
}
