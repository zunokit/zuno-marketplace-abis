import { eq, and, desc, asc, sql, ilike, count, inArray, or } from "drizzle-orm";
import type { NetworkRepository } from "@/core/domain/network/network.repository";
import {
  NetworkEntity,
  NetworkListParams,
  CreateNetworkParams,
  UpdateNetworkParams,
  NetworkNotFoundError,
  NetworkDuplicateError,
} from "@/core/domain/network/network.entity";
import { PaginatedResult } from "@/shared/types";
import { db } from "@/infrastructure/database/drizzle";
import { networks } from "@/infrastructure/database/drizzle/schema/networks.schema";
import { CacheAdapter } from "@/infrastructure/cache/cache.adapter";
import { logger } from "@/shared/lib/utils/logger";
import { appConfig } from "@/shared/config/app.config";

export class NetworkRepositoryImpl implements NetworkRepository {
  private cache: CacheAdapter;
  private cacheTTL = appConfig.cache.network || 86400; // 24 hours default

  constructor() {
    this.cache = CacheAdapter.getInstance();
  }

  // Helper method to map DB record to entity
  private mapToEntity(record: any): NetworkEntity {
    return {
      id: record.id,
      chainId: record.chainId,
      name: record.name,
      slug: record.slug,
      type: record.type,
      isTestnet: record.isTestnet,
      rpcUrls: record.rpcUrls,
      explorerUrls: record.explorerUrls || undefined,
      nativeCurrency: record.nativeCurrency,
      isActive: record.isActive,
      icon: record.icon || undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  async create(network: NetworkEntity): Promise<NetworkEntity> {
    try {
      // Check for duplicates
      const existingByChainId = await this.existsByChainId(network.chainId);
      if (existingByChainId) {
        throw new NetworkDuplicateError(network.chainId);
      }

      const existingBySlug = await this.existsBySlug(network.slug);
      if (existingBySlug) {
        throw new NetworkDuplicateError(network.chainId);
      }

      const [inserted] = await db
        .insert(networks)
        .values({
          id: network.id,
          chainId: network.chainId,
          name: network.name,
          slug: network.slug,
          type: network.type,
          isTestnet: network.isTestnet,
          rpcUrls: network.rpcUrls,
          explorerUrls: network.explorerUrls,
          nativeCurrency: network.nativeCurrency,
          isActive: network.isActive,
          icon: network.icon,
          createdAt: network.createdAt,
          updatedAt: network.updatedAt,
        })
        .returning();

      const entity = this.mapToEntity(inserted);

      // Cache the created network
      await Promise.all([
        this.cache.set(`network:${entity.id}`, entity, this.cacheTTL),
        this.cache.set(`network:chainId:${entity.chainId}`, entity, this.cacheTTL),
        this.cache.set(`network:slug:${entity.slug}`, entity, this.cacheTTL),
      ]);

      // Invalidate list caches
      await this.cache.del("networks:all");
      await this.cache.del("networks:active");

      logger.info("Network created", { networkId: entity.id } as any);
      return entity;
    } catch (error) {
      logger.error("Failed to create network", error, network as any);
      throw error;
    }
  }

  async findById(id: string): Promise<NetworkEntity | null> {
    try {
      // Check cache first
      const cached = await this.cache.get<NetworkEntity>(`network:${id}`);
      if (cached) {
        return cached;
      }

      const [record] = await db
        .select()
        .from(networks)
        .where(eq(networks.id, id))
        .limit(1);

      if (!record) {
        return null;
      }

      const entity = this.mapToEntity(record);

      // Cache the result
      await this.cache.set(`network:${id}`, entity, this.cacheTTL);

      return entity;
    } catch (error) {
      logger.error("Failed to find network by ID", error, { id } as any);
      return null;
    }
  }

  async findByChainId(chainId: number): Promise<NetworkEntity | null> {
    try {
      const cacheKey = `network:chainId:${chainId}`;
      const cached = await this.cache.get<NetworkEntity>(cacheKey);
      if (cached) {
        return cached;
      }

      const [record] = await db
        .select()
        .from(networks)
        .where(eq(networks.chainId, chainId))
        .limit(1);

      if (!record) {
        return null;
      }

      const entity = this.mapToEntity(record);

      // Cache the result
      await Promise.all([
        this.cache.set(cacheKey, entity, this.cacheTTL),
        this.cache.set(`network:${entity.id}`, entity, this.cacheTTL),
      ]);

      return entity;
    } catch (error) {
      logger.error("Failed to find network by chain ID", error, { chainId } as any);
      return null;
    }
  }

  async findBySlug(slug: string): Promise<NetworkEntity | null> {
    try {
      const cacheKey = `network:slug:${slug}`;
      const cached = await this.cache.get<NetworkEntity>(cacheKey);
      if (cached) {
        return cached;
      }

      const [record] = await db
        .select()
        .from(networks)
        .where(eq(networks.slug, slug.toLowerCase()))
        .limit(1);

      if (!record) {
        return null;
      }

      const entity = this.mapToEntity(record);

      // Cache the result
      await Promise.all([
        this.cache.set(cacheKey, entity, this.cacheTTL),
        this.cache.set(`network:${entity.id}`, entity, this.cacheTTL),
      ]);

      return entity;
    } catch (error) {
      logger.error("Failed to find network by slug", error, { slug } as any);
      return null;
    }
  }

  async update(
    id: string,
    params: UpdateNetworkParams
  ): Promise<NetworkEntity | null> {
    try {
      const updateData: any = {
        ...params,
        updatedAt: new Date(),
      };

      const [updated] = await db
        .update(networks)
        .set(updateData)
        .where(eq(networks.id, id))
        .returning();

      if (!updated) {
        return null;
      }

      const entity = this.mapToEntity(updated);

      // Invalidate caches
      await Promise.all([
        this.cache.del(`network:${id}`),
        this.cache.del(`network:chainId:${entity.chainId}`),
        this.cache.del(`network:slug:${entity.slug}`),
        this.cache.del("networks:all"),
        this.cache.del("networks:active"),
      ]);

      logger.info("Network updated", { networkId: id } as any);
      return entity;
    } catch (error) {
      logger.error("Failed to update network", error, { id, params } as any);
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const network = await this.findById(id);
      if (!network) {
        return false;
      }

      await db.delete(networks).where(eq(networks.id, id));

      // Invalidate caches
      await Promise.all([
        this.cache.del(`network:${id}`),
        this.cache.del(`network:chainId:${network.chainId}`),
        this.cache.del(`network:slug:${network.slug}`),
        this.cache.del("networks:all"),
        this.cache.del("networks:active"),
      ]);

      logger.info("Network deleted", { networkId: id } as any);
      return true;
    } catch (error) {
      logger.error("Failed to delete network", error, { id } as any);
      return false;
    }
  }

  async list(
    params: NetworkListParams = {}
  ): Promise<PaginatedResult<NetworkEntity>> {
    try {
      const page = params.page || 1;
      const limit = params.limit || 20;
      const offset = (page - 1) * limit;
      const sortBy = params.sortBy || "name";
      const sortOrder = params.sortOrder || "asc";

      // Build where conditions
      const whereConditions: any[] = [];

      if (params.filters) {
        if (params.filters.type) {
          whereConditions.push(eq(networks.type, params.filters.type));
        }
        if (params.filters.isTestnet !== undefined) {
          whereConditions.push(eq(networks.isTestnet, params.filters.isTestnet));
        }
        if (params.filters.isActive !== undefined) {
          whereConditions.push(eq(networks.isActive, params.filters.isActive));
        }
      }

      if (params.query) {
        whereConditions.push(
          or(
            ilike(networks.name, `%${params.query}%`),
            ilike(networks.slug, `%${params.query}%`),
            sql`CAST(${networks.chainId} AS TEXT) LIKE ${`%${params.query}%`}`
          )
        );
      }

      const whereClause =
        whereConditions.length > 0 ? and(...whereConditions) : undefined;

      // Get total count
      const [{ total }] = await db
        .select({ total: count() })
        .from(networks)
        .where(whereClause);

      // Get paginated data
      const sortColumn =
        sortBy === "chainId"
          ? networks.chainId
          : sortBy === "createdAt"
            ? networks.createdAt
            : networks.name;

      const records = await db
        .select()
        .from(networks)
        .where(whereClause)
        .orderBy(sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn))
        .limit(limit)
        .offset(offset);

      const data = records.map((record) => this.mapToEntity(record));

      return {
        data,
        pagination: {
          page,
          limit,
          total: Number(total),
          totalPages: Math.ceil(Number(total) / limit),
          hasNext: page < Math.ceil(Number(total) / limit),
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      logger.error("Failed to list networks", error, params as any);
      throw error;
    }
  }

  async findActive(
    params?: NetworkListParams
  ): Promise<PaginatedResult<NetworkEntity>> {
    return this.list({
      ...params,
      filters: {
        ...params?.filters,
        isActive: true,
      },
    });
  }

  async findByType(
    type: string,
    params?: NetworkListParams
  ): Promise<PaginatedResult<NetworkEntity>> {
    return this.list({
      ...params,
      filters: {
        ...params?.filters,
        type,
      },
    });
  }

  async findTestnets(
    params?: NetworkListParams
  ): Promise<PaginatedResult<NetworkEntity>> {
    return this.list({
      ...params,
      filters: {
        ...params?.filters,
        isTestnet: true,
      },
    });
  }

  async findMainnets(
    params?: NetworkListParams
  ): Promise<PaginatedResult<NetworkEntity>> {
    return this.list({
      ...params,
      filters: {
        ...params?.filters,
        isTestnet: false,
      },
    });
  }

  async search(
    query: string,
    params?: NetworkListParams
  ): Promise<PaginatedResult<NetworkEntity>> {
    return this.list({
      ...params,
      query,
    });
  }

  async exists(id: string): Promise<boolean> {
    try {
      const [result] = await db
        .select({ id: networks.id })
        .from(networks)
        .where(eq(networks.id, id))
        .limit(1);

      return !!result;
    } catch (error) {
      logger.error("Failed to check network existence", error, { id } as any);
      return false;
    }
  }

  async existsByChainId(chainId: number): Promise<boolean> {
    try {
      const [result] = await db
        .select({ id: networks.id })
        .from(networks)
        .where(eq(networks.chainId, chainId))
        .limit(1);

      return !!result;
    } catch (error) {
      logger.error("Failed to check network existence by chain ID", error, {
        chainId,
      } as any);
      return false;
    }
  }

  async existsBySlug(slug: string): Promise<boolean> {
    try {
      const [result] = await db
        .select({ id: networks.id })
        .from(networks)
        .where(eq(networks.slug, slug.toLowerCase()))
        .limit(1);

      return !!result;
    } catch (error) {
      logger.error("Failed to check network existence by slug", error, {
        slug,
      } as any);
      return false;
    }
  }

  async getAll(): Promise<NetworkEntity[]> {
    try {
      // Check cache first
      const cached = await this.cache.get<NetworkEntity[]>("networks:all");
      if (cached) {
        return cached;
      }

      const records = await db
        .select()
        .from(networks)
        .orderBy(asc(networks.name));

      const entities = records.map((record) => this.mapToEntity(record));

      // Cache the result
      await this.cache.set("networks:all", entities, this.cacheTTL);

      return entities;
    } catch (error) {
      logger.error("Failed to get all networks", error);
      return [];
    }
  }

  async getAllActive(): Promise<NetworkEntity[]> {
    try {
      // Check cache first
      const cached = await this.cache.get<NetworkEntity[]>("networks:active");
      if (cached) {
        return cached;
      }

      const records = await db
        .select()
        .from(networks)
        .where(eq(networks.isActive, true))
        .orderBy(asc(networks.name));

      const entities = records.map((record) => this.mapToEntity(record));

      // Cache the result
      await this.cache.set("networks:active", entities, this.cacheTTL);

      return entities;
    } catch (error) {
      logger.error("Failed to get all active networks", error);
      return [];
    }
  }

  async getStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    testnets: number;
    mainnets: number;
  }> {
    try {
      const [totalResult] = await db.select({ total: count() }).from(networks);
      const [activeResult] = await db
        .select({ active: count() })
        .from(networks)
        .where(eq(networks.isActive, true));
      const [testnetResult] = await db
        .select({ testnets: count() })
        .from(networks)
        .where(eq(networks.isTestnet, true));

      const total = Number(totalResult.total);
      const active = Number(activeResult.active);
      const testnets = Number(testnetResult.testnets);

      return {
        total,
        active,
        inactive: total - active,
        testnets,
        mainnets: total - testnets,
      };
    } catch (error) {
      logger.error("Failed to get network stats", error);
      return {
        total: 0,
        active: 0,
        inactive: 0,
        testnets: 0,
        mainnets: 0,
      };
    }
  }

  async createMany(networksList: NetworkEntity[]): Promise<NetworkEntity[]> {
    try {
      if (networksList.length === 0) {
        return [];
      }

      const values = networksList.map((network) => ({
        id: network.id,
        chainId: network.chainId,
        name: network.name,
        slug: network.slug,
        type: network.type,
        isTestnet: network.isTestnet,
        rpcUrls: network.rpcUrls,
        explorerUrls: network.explorerUrls,
        nativeCurrency: network.nativeCurrency,
        isActive: network.isActive,
        icon: network.icon,
        createdAt: network.createdAt,
        updatedAt: network.updatedAt,
      }));

      const inserted = await db.insert(networks).values(values).returning();

      const entities = inserted.map((record) => this.mapToEntity(record));

      // Invalidate list caches
      await Promise.all([
        this.cache.del("networks:all"),
        this.cache.del("networks:active"),
      ]);

      logger.info("Bulk networks created", { count: entities.length } as any);
      return entities;
    } catch (error) {
      logger.error("Failed to create networks in bulk", error);
      throw error;
    }
  }

  async updateMany(
    ids: string[],
    params: Partial<UpdateNetworkParams>
  ): Promise<number> {
    try {
      if (ids.length === 0) {
        return 0;
      }

      const updateData: any = {
        ...params,
        updatedAt: new Date(),
      };

      await db.update(networks).set(updateData).where(inArray(networks.id, ids));

      // Invalidate caches
      await Promise.all([
        ...ids.map((id) => this.cache.del(`network:${id}`)),
        this.cache.del("networks:all"),
        this.cache.del("networks:active"),
      ]);

      logger.info("Bulk networks updated", { count: ids.length } as any);
      return ids.length;
    } catch (error) {
      logger.error("Failed to update networks in bulk", error);
      return 0;
    }
  }

  async deleteMany(ids: string[]): Promise<number> {
    try {
      if (ids.length === 0) {
        return 0;
      }

      await db.delete(networks).where(inArray(networks.id, ids));

      // Invalidate caches
      await Promise.all([
        ...ids.map((id) => this.cache.del(`network:${id}`)),
        this.cache.del("networks:all"),
        this.cache.del("networks:active"),
      ]);

      logger.info("Bulk networks deleted", { count: ids.length } as any);
      return ids.length;
    } catch (error) {
      logger.error("Failed to delete networks in bulk", error);
      return 0;
    }
  }
}
